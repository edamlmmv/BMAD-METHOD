/**
 * Validates graphify corpus manifests, normalized graph JSON, and glossary draft.
 *
 * Usage:
 *   node tools/validate-graphify-manifests.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');
const { REQUIRED_SECTIONS, REQUIRED_TERMS } = require('./validate-ubiquitous-language');

const MAX_FILES_PER_MANIFEST = 200;
const GRAPHIFY_DIR = '.graphify';
const GRAPH_DIR = 'graph';
const PROPOSED_GLOSSARY = 'UBIQUITOUS_LANGUAGE.proposed.md';

const REQUIRED_SINGLE_MANIFESTS = Object.freeze(['bmad-root.txt', 'codex-config.txt']);
const REQUIRED_MANIFEST_PREFIXES = Object.freeze(['bmad-docs-', 'bmad-skills-', 'bmad-tools-code-']);
const REQUIRED_GRAPHS = Object.freeze([
  'bmad-docs.graph.json',
  'bmad-code.graph.json',
  'codex-docs.graph.json',
  'repository-knowledge.graph.json',
]);
const GENERATED_OR_NOISY_PATTERNS = Object.freeze([
  /^\.git\//,
  /^\.graphify\/work\//,
  /^\.graphify\/work$/,
  /^build\//,
  /^coverage\//,
  /^dist\//,
  /^graph\//,
  /^graphify-out\//,
  /^node_modules\//,
  /^package-lock\.json$/,
  /^website\/dist\//,
]);
const RELATIONS = new Set([
  'aliases',
  'calls',
  'conflicts_with',
  'configured_by',
  'defines',
  'depends_on',
  'documents',
  'exports',
  'generates',
  'implements',
  'imports',
  'validates',
]);

function parseArgs(argv) {
  const args = { projectRoot: path.resolve(__dirname, '..') };
  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--project-root') {
      args.projectRoot = path.resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function addError(errors, code, message, details = {}) {
  const metadata = [];
  if (details.file) metadata.push(`file=${details.file}`);
  if (details.field) metadata.push(`field=${details.field}`);
  const suffix = metadata.length > 0 ? ` [${metadata.join(' ')}]` : '';
  errors.push(`${code} ${message}${suffix}`);
}

function readLines(projectRoot, relativePath, errors) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    addError(errors, 'GRAPHIFY_FILE_MISSING', `missing required file: ${relativePath}`, { file: relativePath });
    return [];
  }

  return fs
    .readFileSync(absolutePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSorted(values) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value) <= 0);
}

function validateManifestFile(projectRoot, manifestName, errors) {
  const relativePath = path.join(GRAPHIFY_DIR, manifestName);
  const lines = readLines(projectRoot, relativePath, errors);
  const seen = new Set();

  if (lines.length > MAX_FILES_PER_MANIFEST) {
    addError(errors, 'GRAPHIFY_MANIFEST_TOO_LARGE', `manifest has more than ${MAX_FILES_PER_MANIFEST} files`, {
      file: relativePath,
      field: String(lines.length),
    });
  }

  if (!isSorted(lines)) {
    addError(errors, 'GRAPHIFY_MANIFEST_UNSORTED', 'manifest paths must be sorted deterministically', { file: relativePath });
  }

  for (const line of lines) {
    if (seen.has(line)) {
      addError(errors, 'GRAPHIFY_MANIFEST_DUPLICATE', `duplicate manifest path: ${line}`, { file: relativePath, field: line });
    }
    seen.add(line);

    if (path.isAbsolute(line) || line.includes('\\') || line.split('/').includes('..')) {
      addError(errors, 'GRAPHIFY_MANIFEST_UNSAFE_PATH', `manifest path must be repo-relative: ${line}`, {
        file: relativePath,
        field: line,
      });
      continue;
    }

    if (GENERATED_OR_NOISY_PATTERNS.some((pattern) => pattern.test(line))) {
      addError(errors, 'GRAPHIFY_MANIFEST_NOISY_PATH', `generated/noisy path is not allowed: ${line}`, {
        file: relativePath,
        field: line,
      });
    }

    if (!fs.existsSync(path.join(projectRoot, line))) {
      addError(errors, 'GRAPHIFY_MANIFEST_TARGET_MISSING', `manifest target does not exist: ${line}`, {
        file: relativePath,
        field: line,
      });
    }
  }

  return lines;
}

function validateManifestSet(projectRoot, errors) {
  const graphifyPath = path.join(projectRoot, GRAPHIFY_DIR);
  if (!fs.existsSync(graphifyPath)) {
    addError(errors, 'GRAPHIFY_DIR_MISSING', `missing required directory: ${GRAPHIFY_DIR}`, { file: GRAPHIFY_DIR });
    return new Map();
  }

  if (!fs.existsSync(path.join(projectRoot, GRAPHIFY_DIR, 'runbook.md'))) {
    addError(errors, 'GRAPHIFY_RUNBOOK_MISSING', 'missing graphify runbook', { file: path.join(GRAPHIFY_DIR, 'runbook.md') });
  }

  const manifestNames = fs
    .readdirSync(graphifyPath)
    .filter((entry) => entry.endsWith('.txt'))
    .sort((a, b) => a.localeCompare(b));
  const manifests = new Map();

  for (const required of REQUIRED_SINGLE_MANIFESTS) {
    if (!manifestNames.includes(required)) {
      addError(errors, 'GRAPHIFY_MANIFEST_MISSING', `missing required manifest: ${required}`, {
        file: path.join(GRAPHIFY_DIR, required),
      });
    }
  }

  for (const prefix of REQUIRED_MANIFEST_PREFIXES) {
    if (!manifestNames.some((name) => name.startsWith(prefix))) {
      addError(errors, 'GRAPHIFY_MANIFEST_MISSING', `missing required manifest prefix: ${prefix}`, {
        file: path.join(GRAPHIFY_DIR, `${prefix}NN.txt`),
      });
    }
  }

  for (const manifestName of manifestNames) {
    manifests.set(manifestName, validateManifestFile(projectRoot, manifestName, errors));
  }

  const codexLines = manifests.get('codex-config.txt') || [];
  const codexContent = codexLines.map((line) => fs.readFileSync(path.join(projectRoot, line), 'utf8')).join('\n');
  for (const required of [
    'source_marker: pasted-thread-excerpt',
    'https://developers.openai.com/codex/config-advanced',
    'https://developers.openai.com/codex/config-reference',
    'retrieved_at:',
  ]) {
    if (!codexContent.includes(required)) {
      addError(errors, 'GRAPHIFY_CODEX_SOURCE_MISSING', `Codex source metadata missing: ${required}`, {
        file: path.join(GRAPHIFY_DIR, 'codex-config.txt'),
        field: required,
      });
    }
  }

  const codeLines = [...manifests.entries()].filter(([name]) => name.startsWith('bmad-tools-code-')).flatMap(([, lines]) => lines);
  if (!codeLines.includes('package.json')) {
    addError(errors, 'GRAPHIFY_CODE_INPUT_MISSING', 'code manifest must include package.json for npm scripts', {
      file: GRAPHIFY_DIR,
      field: 'package.json',
    });
  }
  if (!codeLines.some((line) => ['.cjs', '.js', '.mjs', '.py', '.sh', '.ts'].includes(path.extname(line)))) {
    addError(errors, 'GRAPHIFY_CODE_INPUT_MISSING', 'code manifest must include static code extraction inputs', {
      file: GRAPHIFY_DIR,
    });
  }

  return manifests;
}

function validateEvidence(evidence, errors, graphPath, field) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    addError(errors, 'GRAPHIFY_GRAPH_BAD_EVIDENCE', 'edge evidence must be a non-empty array', { file: graphPath, field });
    return;
  }

  for (const item of evidence) {
    if (!item || typeof item !== 'object' || (!item.path && !item.url)) {
      addError(errors, 'GRAPHIFY_GRAPH_BAD_EVIDENCE', 'each evidence item needs path or url', { file: graphPath, field });
    }
  }
}

function validateSource(source, errors, graphPath, field) {
  if (!source || typeof source !== 'object' || (!source.path && !source.url)) {
    addError(errors, 'GRAPHIFY_GRAPH_BAD_SOURCE', 'node source must include path or url', { file: graphPath, field });
  }
}

function validateGraph(projectRoot, graphName, errors) {
  const graphPath = path.join(GRAPH_DIR, graphName);
  const absolutePath = path.join(projectRoot, graphPath);
  if (!fs.existsSync(absolutePath)) {
    addError(errors, 'GRAPHIFY_GRAPH_MISSING', `missing normalized graph: ${graphPath}`, { file: graphPath });
    return;
  }

  let graph;
  try {
    graph = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    addError(errors, 'GRAPHIFY_GRAPH_INVALID_JSON', `graph JSON parse failed: ${error.message}`, { file: graphPath });
    return;
  }

  validateNormalizedGraphObject(graph, graphPath, errors);
}

function validateNormalizedGraphObject(graph, graphPath, errors) {
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    addError(errors, 'GRAPHIFY_GRAPH_BAD_SCHEMA', 'graph must contain nodes[] and edges[]', { file: graphPath });
    return;
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    for (const field of ['id', 'type', 'label', 'namespace', 'source', 'slice_id']) {
      if (!node[field]) addError(errors, 'GRAPHIFY_GRAPH_NODE_FIELD_MISSING', `node missing field: ${field}`, { file: graphPath, field });
    }
    if (node.id) nodeIds.add(node.id);
    validateSource(node.source, errors, graphPath, node.id || 'unknown-node');
  }

  for (const edge of graph.edges) {
    for (const field of ['from', 'to', 'relation', 'evidence', 'confidence', 'slice_id']) {
      if (!edge[field]) addError(errors, 'GRAPHIFY_GRAPH_EDGE_FIELD_MISSING', `edge missing field: ${field}`, { file: graphPath, field });
    }
    if (edge.from && !nodeIds.has(edge.from)) {
      addError(errors, 'GRAPHIFY_GRAPH_EDGE_NODE_MISSING', `edge source node missing: ${edge.from}`, { file: graphPath, field: edge.from });
    }
    if (edge.to && !nodeIds.has(edge.to)) {
      addError(errors, 'GRAPHIFY_GRAPH_EDGE_NODE_MISSING', `edge target node missing: ${edge.to}`, { file: graphPath, field: edge.to });
    }
    if (edge.relation && !RELATIONS.has(edge.relation)) {
      addError(errors, 'GRAPHIFY_GRAPH_BAD_RELATION', `unsupported relation: ${edge.relation}`, { file: graphPath, field: edge.relation });
    }
    validateEvidence(edge.evidence, errors, graphPath, `${edge.from || '?'}->${edge.to || '?'}`);
  }
}

function validateGraphs(projectRoot, errors) {
  for (const graphName of REQUIRED_GRAPHS) validateGraph(projectRoot, graphName, errors);
}

function validateProposedGlossary(projectRoot, errors) {
  const glossaryPath = path.join(projectRoot, PROPOSED_GLOSSARY);
  if (!fs.existsSync(glossaryPath)) {
    addError(errors, 'GRAPHIFY_GLOSSARY_MISSING', `missing proposed glossary: ${PROPOSED_GLOSSARY}`, { file: PROPOSED_GLOSSARY });
    return;
  }

  const content = fs.readFileSync(glossaryPath, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(`## ${section}`)) {
      addError(errors, 'GRAPHIFY_GLOSSARY_SECTION_MISSING', `proposed glossary must preserve section: ${section}`, {
        file: PROPOSED_GLOSSARY,
        field: section,
      });
    }
  }

  for (const term of REQUIRED_TERMS) {
    if (!content.includes(`**${term}**`)) {
      addError(errors, 'GRAPHIFY_GLOSSARY_TERM_MISSING', `proposed glossary must preserve term: ${term}`, {
        file: PROPOSED_GLOSSARY,
        field: term,
      });
    }
  }

  if (!content.includes('Source node/ref')) {
    addError(errors, 'GRAPHIFY_GLOSSARY_SOURCE_TRACE_MISSING', 'new proposal terms need source node/ref column', {
      file: PROPOSED_GLOSSARY,
    });
  }
}

function validateGraphifyContract(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.resolve(__dirname, '..'));
  const errors = [];
  validateManifestSet(projectRoot, errors);
  validateGraphs(projectRoot, errors);
  validateProposedGlossary(projectRoot, errors);
  return { ok: errors.length === 0, errors: errors.sort() };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv);
    const result = validateGraphifyContract(args);
    if (result.ok) {
      console.log('Graphify manifests valid.');
    } else {
      for (const error of result.errors) console.error(error);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`GRAPHIFY_VALIDATOR_ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_GRAPHS,
  validateNormalizedGraphObject,
  validateGraphifyContract,
};
