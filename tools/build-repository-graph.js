/**
 * Builds normalized repository graph artifacts from graphify manifests.
 *
 * Usage:
 *   node tools/build-repository-graph.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { validateGraphifyContract } = require('./validate-graphify-manifests');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GRAPHIFY_DIR = path.join(PROJECT_ROOT, '.graphify');
const WORK_DIR = path.join(GRAPHIFY_DIR, 'work');
const GRAPH_DIR = path.join(PROJECT_ROOT, 'graph');
const PROPOSED_GLOSSARY = path.join(PROJECT_ROOT, 'UBIQUITOUS_LANGUAGE.proposed.md');
const CANONICAL_GLOSSARY = path.join(PROJECT_ROOT, 'UBIQUITOUS_LANGUAGE.md');

const RELATION_CONFIDENCE = Object.freeze({
  aliases: 'EXTRACTED',
  calls: 'INFERRED',
  conflicts_with: 'EXTRACTED',
  configured_by: 'EXTRACTED',
  defines: 'EXTRACTED',
  depends_on: 'INFERRED',
  documents: 'EXTRACTED',
  exports: 'EXTRACTED',
  generates: 'INFERRED',
  implements: 'INFERRED',
  imports: 'EXTRACTED',
  validates: 'EXTRACTED',
});

const CODE_SYMBOL_PATTERNS = Object.freeze([
  /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  /\bclass\s+([A-Za-z_$][\w$]*)\b/g,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  /^\s*def\s+([A-Za-z_]\w*)\s*\(/gm,
  /^\s*class\s+([A-Za-z_]\w*)\s*(?:\(|:)/gm,
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(PROJECT_ROOT, filePath));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 120);
}

function sourceFor(relativePath, line = null) {
  const text = readText(relativePath);
  const frontmatter = parseFrontmatter(text);
  const source = {
    path: relativePath,
  };
  if (line) source.line = line;
  if (frontmatter.source_url) source.url = frontmatter.source_url;
  if (frontmatter.retrieved_at) source.retrieved_at = frontmatter.retrieved_at;
  return source;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---', 4);
  if (end === -1) return {};
  const frontmatter = {};
  const raw = text.slice(4, end).split(/\r?\n/);
  for (const line of raw) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (match) frontmatter[match[1]] = match[2].trim();
  }
  return frontmatter;
}

class GraphBuilder {
  constructor(sliceId, namespace) {
    this.sliceId = sliceId;
    this.namespace = namespace;
    this.nodes = new Map();
    this.edgeKeys = new Set();
    this.edges = [];
    this.warnings = [];
  }

  addNode(id, fields) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        type: fields.type,
        label: fields.label,
        namespace: fields.namespace || this.namespace,
        source: fields.source,
        slice_id: fields.slice_id || this.sliceId,
      });
    }
    return id;
  }

  addEdge(from, to, relation, evidence) {
    const key = `${from}\0${to}\0${relation}`;
    if (this.edgeKeys.has(key)) return;
    this.edgeKeys.add(key);
    this.edges.push({
      from,
      to,
      relation,
      evidence: Array.isArray(evidence) ? evidence : [evidence],
      confidence: RELATION_CONFIDENCE[relation] || 'INFERRED',
      slice_id: this.sliceId,
    });
  }

  toJSON() {
    return {
      metadata: {
        generated_by: 'tools/build-repository-graph.js',
        slice_id: this.sliceId,
        namespace: this.namespace,
      },
      nodes: [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
      edges: this.edges.sort((a, b) => `${a.from}:${a.to}:${a.relation}`.localeCompare(`${b.from}:${b.to}:${b.relation}`)),
      warnings: this.warnings.sort((a, b) => a.localeCompare(b)),
    };
  }
}

function readManifest(name) {
  const manifestPath = path.join(GRAPHIFY_DIR, name);
  return fs
    .readFileSync(manifestPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function listManifestNames() {
  return fs
    .readdirSync(GRAPHIFY_DIR)
    .filter((entry) => entry.endsWith('.txt'))
    .sort((a, b) => a.localeCompare(b));
}

function materializeCorpus(sliceId, files) {
  const corpusRoot = path.join(WORK_DIR, sliceId, 'corpus');
  fs.rmSync(corpusRoot, { force: true, recursive: true });
  ensureDir(corpusRoot);
  for (const relativePath of files) {
    const target = path.join(corpusRoot, relativePath);
    ensureDir(path.dirname(target));
    fs.copyFileSync(path.join(PROJECT_ROOT, relativePath), target);
  }
}

function lineNumberFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addFileNode(builder, relativePath) {
  return builder.addNode(`${builder.namespace}:file:${slug(relativePath)}`, {
    type: 'file',
    label: relativePath,
    source: sourceFor(relativePath),
  });
}

function addMarkdownFile(builder, relativePath) {
  const text = readText(relativePath);
  const fileNode = addFileNode(builder, relativePath);
  const headingPattern = /^(#{1,4})\s+(.+)$/gm;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    const label = match[2].replaceAll(/[#`*_[\]]/g, '').trim();
    if (!label) continue;
    const line = lineNumberFor(text, match.index);
    const nodeId = builder.addNode(`${builder.namespace}:concept:${slug(relativePath)}:${slug(label)}`, {
      type: 'concept',
      label,
      source: sourceFor(relativePath, line),
    });
    builder.addEdge(fileNode, nodeId, 'documents', sourceFor(relativePath, line));
  }
}

function addStructuredFile(builder, relativePath) {
  const text = readText(relativePath);
  const fileNode = addFileNode(builder, relativePath);
  const data = path.extname(relativePath) === '.json' ? safeJsonParse(text) : null;

  if (relativePath === 'package.json' && data && data.scripts) {
    const scriptsNode = builder.addNode(`${builder.namespace}:concept:package-scripts`, {
      type: 'concept',
      label: 'Package scripts',
      source: sourceFor(relativePath),
    });
    builder.addEdge(fileNode, scriptsNode, 'defines', sourceFor(relativePath));
    for (const [scriptName, command] of Object.entries(data.scripts).sort(([a], [b]) => a.localeCompare(b))) {
      const scriptNode = builder.addNode(`${builder.namespace}:command:npm-${slug(scriptName)}`, {
        type: 'command',
        label: `npm run ${scriptName}`,
        source: sourceFor(relativePath),
      });
      builder.addEdge(scriptsNode, scriptNode, 'defines', sourceFor(relativePath));
      if (command.includes('validate')) builder.addEdge(scriptNode, scriptsNode, 'validates', sourceFor(relativePath));
    }
    return;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of Object.keys(data)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 40)) {
      const keyNode = builder.addNode(`${builder.namespace}:config:${slug(relativePath)}:${slug(key)}`, {
        type: 'config',
        label: key,
        source: sourceFor(relativePath),
      });
      builder.addEdge(fileNode, keyNode, 'defines', sourceFor(relativePath));
    }
  }
}

function addCodeFile(builder, relativePath) {
  const text = readText(relativePath);
  const fileNode = addFileNode(builder, relativePath);
  const symbols = [];

  for (const pattern of CODE_SYMBOL_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const symbolName = match[1];
      const line = lineNumberFor(text, match.index);
      const nodeId = builder.addNode(`${builder.namespace}:symbol:${slug(relativePath)}:${slug(symbolName)}`, {
        type: 'symbol',
        label: symbolName,
        source: sourceFor(relativePath, line),
      });
      symbols.push({ name: symbolName, nodeId, line });
      builder.addEdge(fileNode, nodeId, 'defines', sourceFor(relativePath, line));
    }
  }

  addImportEdges(builder, relativePath, text, fileNode);
  addExportEdges(builder, relativePath, text, fileNode, symbols);
  addBestEffortCallEdges(builder, relativePath, text, symbols);
  addValidatorRuleEdges(builder, relativePath, text, fileNode);
}

function addImportEdges(builder, relativePath, text, fileNode) {
  const importPatterns = [
    /\bimport\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*from\s+([A-Za-z0-9_.-]+)\s+import\s+/gm,
    /^\s*import\s+([A-Za-z0-9_.-]+)/gm,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const moduleName = match[1];
      const line = lineNumberFor(text, match.index);
      const moduleNode = builder.addNode(`${builder.namespace}:module:${slug(moduleName)}`, {
        type: 'module',
        label: moduleName,
        source: sourceFor(relativePath, line),
      });
      builder.addEdge(fileNode, moduleNode, 'imports', sourceFor(relativePath, line));
    }
  }
}

function addExportEdges(builder, relativePath, text, fileNode, symbols) {
  if (!/\b(?:module\.exports|exports\.|export\s+)/.test(text)) return;
  for (const symbol of symbols) {
    builder.addEdge(fileNode, symbol.nodeId, 'exports', sourceFor(relativePath, symbol.line));
  }
}

function addBestEffortCallEdges(builder, relativePath, text, symbols) {
  for (const caller of symbols) {
    for (const callee of symbols) {
      if (caller.nodeId === callee.nodeId) continue;
      const callPattern = new RegExp(`\\b${callee.name.replaceAll('$', String.raw`\$`)}\\s*\\(`);
      if (callPattern.test(text)) {
        builder.addEdge(caller.nodeId, callee.nodeId, 'calls', sourceFor(relativePath));
      }
    }
  }
}

function addValidatorRuleEdges(builder, relativePath, text, fileNode) {
  const rules = [...new Set(text.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b|\b[A-Z]+-\d{2}\b/g) || [])].sort((a, b) => a.localeCompare(b));
  for (const ruleName of rules.slice(0, 80)) {
    const ruleNode = builder.addNode(`${builder.namespace}:validator-rule:${slug(ruleName)}`, {
      type: 'validator_rule',
      label: ruleName,
      source: sourceFor(relativePath),
    });
    builder.addEdge(fileNode, ruleNode, 'validates', sourceFor(relativePath));
  }
}

function addFileToGraph(builder, relativePath) {
  const extension = path.extname(relativePath);
  if (['.md', '.mdx'].includes(extension)) {
    addMarkdownFile(builder, relativePath);
  } else if (['.cjs', '.js', '.mjs', '.py', '.sh', '.ts'].includes(extension)) {
    addCodeFile(builder, relativePath);
  } else {
    addStructuredFile(builder, relativePath);
  }
}

function buildSlice(sliceId, namespace, files) {
  materializeCorpus(sliceId, files);
  const builder = new GraphBuilder(sliceId, namespace);
  for (const relativePath of files) addFileToGraph(builder, relativePath);
  return builder.toJSON();
}

function mergeGraphs(graphs) {
  const nodes = new Map();
  const edges = new Map();
  const warnings = [];

  for (const graph of graphs) {
    for (const node of graph.nodes) nodes.set(node.id, node);
    for (const edge of graph.edges) edges.set(`${edge.from}\0${edge.to}\0${edge.relation}`, edge);
    warnings.push(...(graph.warnings || []));
  }

  return {
    metadata: {
      generated_by: 'tools/build-repository-graph.js',
      slice_id: 'repository-knowledge',
      namespace: 'repository',
      derived_from: graphs.map((graph) => graph.metadata.slice_id).sort(),
    },
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => `${a.from}:${a.to}:${a.relation}`.localeCompare(`${b.from}:${b.to}:${b.relation}`)),
    warnings: [...new Set(warnings)].sort((a, b) => a.localeCompare(b)),
  };
}

function writeGraph(name, graph) {
  ensureDir(GRAPH_DIR);
  fs.writeFileSync(path.join(GRAPH_DIR, name), `${JSON.stringify(graph, null, 2)}\n`);
}

function buildGraphs() {
  fs.rmSync(WORK_DIR, { force: true, recursive: true });
  ensureDir(WORK_DIR);

  const manifestNames = listManifestNames();
  const rootFiles = readManifest('bmad-root.txt');
  const docsFiles = manifestNames.filter((name) => name.startsWith('bmad-docs-')).flatMap((name) => readManifest(name));
  const skillsFiles = manifestNames.filter((name) => name.startsWith('bmad-skills-')).flatMap((name) => readManifest(name));
  const codeFiles = manifestNames.filter((name) => name.startsWith('bmad-tools-code-')).flatMap((name) => readManifest(name));
  const codexFiles = readManifest('codex-config.txt');

  const bmadDocs = buildSlice('bmad-docs', 'bmad', [...rootFiles, ...docsFiles, ...skillsFiles]);
  const bmadCode = buildSlice('bmad-code', 'code', codeFiles);
  const codexDocs = buildSlice('codex-docs', 'codex', codexFiles);
  const repository = mergeGraphs([bmadDocs, bmadCode, codexDocs]);

  writeGraph('bmad-docs.graph.json', bmadDocs);
  writeGraph('bmad-code.graph.json', bmadCode);
  writeGraph('codex-docs.graph.json', codexDocs);
  writeGraph('repository-knowledge.graph.json', repository);

  return { bmadDocs, bmadCode, codexDocs, repository };
}

function sourceRefForNode(node) {
  if (node.source.url) return `<${node.source.url}>`;
  const line = node.source.line ? `:${node.source.line}` : '';
  return `${node.source.path}${line}`;
}

function selectProposalTerms(repositoryGraph) {
  const priorityTerms = [
    ['bmad', 'Why the BMad Method?'],
    ['bmad', 'BMAD Workspace Architecture'],
    ['bmad', 'BMAD Workspace Capability Contract'],
    ['bmad', 'Skill Validator — Inference-Based'],
    ['bmad', 'Ubiquitous Language'],
    ['bmad', 'Package scripts'],
    ['bmad', 'npm run validate:graphify-manifests'],
    ['bmad', 'npm run validate:skills'],
    ['codex', 'Advanced Configuration'],
    ['codex', 'Configuration Reference'],
    ['codex', 'Profiles'],
    ['codex', 'Project Config Files'],
    ['codex', 'Hooks'],
    ['codex', 'Agent Roles'],
    ['codex', 'Approval Policies And Sandbox Modes'],
    ['codex', 'Named Permission Profiles'],
    ['codex', 'Shell Environment Policy'],
    ['codex', 'MCP Servers'],
    ['codex', 'Observability And Telemetry'],
    ['codex', 'Requirements TOML'],
  ];

  const selected = [];
  const seen = new Set();
  for (const [namespace, label] of priorityTerms) {
    const node = repositoryGraph.nodes.find((candidate) => candidate.namespace === namespace && candidate.label === label);
    if (node && !seen.has(node.id)) {
      selected.push(node);
      seen.add(node.id);
    }
  }

  return selected;
}

function writeProposedGlossary(repositoryGraph) {
  const existing = fs.readFileSync(CANONICAL_GLOSSARY, 'utf8').trimEnd();
  const terms = selectProposalTerms(repositoryGraph);
  const rows = terms
    .map((node) => `| **${node.label}** | ${node.namespace} | ${node.type} | \`${node.id}\` / ${sourceRefForNode(node)} |`)
    .join('\n');

  const addition = `

## Graph-derived proposal

Canonical \`UBIQUITOUS_LANGUAGE.md\` remains unchanged until human review
accepts this proposal. New terms below are candidates, not canonical language.

| Term | Namespace | Graph type | Source node/ref |
| --- | --- | --- | --- |
${rows}

## Graph proposal relationships

- Per-slice graphs are primary review artifacts; \`graph/repository-knowledge.graph.json\` is derived.
- Codex terms stay in the \`codex\` namespace unless explicit BMAD usage supports a cross-link.
- BMAD terms stay in the \`bmad\` namespace unless source evidence supports a merge.
- Code symbols become language terms only when they represent reviewer-facing behavior or validation concepts.

## Graph proposal review notes

- Every candidate row above cites a graph node id and source path or URL.
- Generated graph JSON should be regenerated from manifests and runbook, not hand-edited.
- Static call graph edges are best-effort; unresolved dynamic calls are intentionally omitted.
`;

  fs.writeFileSync(PROPOSED_GLOSSARY, `${existing}${addition}\n`);
}

function main() {
  const preflight = validateGraphifyContract({ projectRoot: PROJECT_ROOT });
  const manifestErrors = preflight.errors.filter((error) => error.includes('MANIFEST') || error.includes('CODEX_SOURCE'));
  if (manifestErrors.length > 0) {
    for (const error of manifestErrors) console.error(error);
    process.exitCode = 1;
    return;
  }

  const graphs = buildGraphs();
  writeProposedGlossary(graphs.repository);

  const result = validateGraphifyContract({ projectRoot: PROJECT_ROOT });
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Repository graph built: ${graphs.repository.nodes.length} nodes, ${graphs.repository.edges.length} edges, ${graphs.repository.metadata.derived_from.length} slices.`,
  );
}

if (require.main === module) {
  main();
}
