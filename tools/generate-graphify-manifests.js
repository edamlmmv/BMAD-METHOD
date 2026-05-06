/**
 * Generates deterministic graphify corpus manifests for the repository graph.
 *
 * Usage:
 *   node tools/generate-graphify-manifests.js
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GRAPHIFY_DIR = path.join(PROJECT_ROOT, '.graphify');
const CODEX_SOURCE_DIR = path.join(GRAPHIFY_DIR, 'sources', 'codex');
const GRAPHIFY_SOURCE_DIR = path.join(GRAPHIFY_DIR, 'sources', 'graphify');
const MAX_FILES_PER_MANIFEST = 200;

const CODEX_RETRIEVED_AT = '2026-05-05';
const GRAPHIFY_RETRIEVED_AT = '2026-05-06';

const DENY_DIRS = new Set([
  '.git',
  '.graphify',
  '.agents',
  '.astro',
  '.cache',
  '.codex',
  '.claude',
  'build',
  'coverage',
  'design-artifacts',
  'dist',
  'graph',
  'graphify-out',
  'node_modules',
  'website',
]);

const DOC_EXTENSIONS = new Set(['.md', '.mdx']);
const SKILL_EXTENSIONS = new Set(['.csv', '.md', '.mdx', '.toml', '.yaml', '.yml']);
const CODE_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.mjs', '.py', '.sh', '.toml', '.ts', '.yaml', '.yml']);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function relativeToRoot(filePath) {
  return toPosix(path.relative(PROJECT_ROOT, filePath));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`);
}

function walk(dirPath, options = {}) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    const relativePath = relativeToRoot(absolutePath);
    const parts = relativePath.split('/');
    if (parts.some((part) => DENY_DIRS.has(part))) continue;
    if (options.skipLocales && ['cs', 'fr', 'vi-vn', 'zh-cn'].includes(parts[1])) continue;

    if (entry.isDirectory()) {
      results.push(...walk(absolutePath, options));
      continue;
    }

    if (!entry.isFile()) continue;
    if (options.extensions && !options.extensions.has(path.extname(entry.name))) continue;
    if (options.excludeTests && parts.includes('tests')) continue;
    results.push(relativePath);
  }

  return results;
}

function uniqueSorted(paths) {
  return [...new Set(paths)].sort((a, b) => a.localeCompare(b));
}

function writeManifest(name, paths) {
  const manifestPath = path.join(GRAPHIFY_DIR, name);
  writeFile(manifestPath, `${uniqueSorted(paths).join('\n')}\n`);
}

function writeChunkedManifests(prefix, paths) {
  const sorted = uniqueSorted(paths);
  const manifestNames = [];
  for (let index = 0; index < sorted.length; index += MAX_FILES_PER_MANIFEST) {
    const chunkNumber = String(manifestNames.length + 1).padStart(2, '0');
    const name = `${prefix}-${chunkNumber}.txt`;
    writeManifest(name, sorted.slice(index, index + MAX_FILES_PER_MANIFEST));
    manifestNames.push(name);
  }
  return manifestNames;
}

function removeOldGeneratedManifests() {
  if (!fs.existsSync(GRAPHIFY_DIR)) return;
  for (const entry of fs.readdirSync(GRAPHIFY_DIR)) {
    if (/^bmad-(?:docs|skills|tools-code)-\d+\.txt$/.test(entry)) {
      fs.rmSync(path.join(GRAPHIFY_DIR, entry));
    }
  }
}

function writeCodexSources() {
  writeFile(
    path.join(CODEX_SOURCE_DIR, 'advanced-configuration-thread-excerpt.md'),
    `---
source_marker: pasted-thread-excerpt
source_url: user-thread://codex-advanced-configuration
retrieved_at: ${CODEX_RETRIEVED_AT}
namespace: codex
---

# Codex Advanced Configuration Thread Excerpt

This source captures the pasted Advanced Configuration excerpt supplied in the
planning thread. It covers profiles, CLI overrides, state locations, project
config, hooks, agent roles, project root markers, model providers, approvals,
sandbox modes, permissions, shell environment policy, MCP servers, telemetry,
notifications, history, citations, project instructions, and TUI settings.

Key source sections:

- Profiles
- One-off CLI overrides
- Config and state locations
- Project config files
- Hooks
- Agent roles
- Project root detection
- Custom model providers
- Approval policies and sandbox modes
- Shell environment policy
- MCP servers
- Observability and telemetry
- Notifications
- History persistence
- Clickable citations
- Project instructions discovery
- TUI options
`,
  );

  writeFile(
    path.join(CODEX_SOURCE_DIR, 'config-advanced.md'),
    `---
source_marker: official-openai-doc
source_url: https://developers.openai.com/codex/config-advanced
retrieved_at: ${CODEX_RETRIEVED_AT}
namespace: codex
---

# Advanced Configuration

Official OpenAI Codex documentation for advanced configuration. Source URL:
<https://developers.openai.com/codex/config-advanced>.

## Profiles

Profiles save named configuration values under \`[profiles.<name>]\` and are
selected with \`codex --profile <name>\`. Profiles can override model,
reasoning effort, approval policy, and model catalog values.

## One-Off CLI Overrides

Codex accepts dedicated flags such as \`--model\` and arbitrary TOML overrides
through \`-c\` or \`--config\`.

## Config And State Locations

Codex stores local state under \`CODEX_HOME\`, defaulting to \`~/.codex\`.
Common files include \`config.toml\`, auth state, history, logs, and caches.

## Project Config Files

Trusted projects can provide \`.codex/config.toml\` layers. Codex walks from
project root to current directory and closest config wins for duplicate keys.

## Hooks

Hooks are experimental lifecycle commands loaded from \`hooks.json\` or inline
\`[hooks]\` config when \`features.codex_hooks\` is enabled.

## Agent Roles

Subagent role configuration lives under \`[agents]\` in \`config.toml\`.

## Project Root Detection

Codex detects project roots through markers such as \`.git\`; the
\`project_root_markers\` key can customize this.

## Model Providers

Custom model providers define base URL, wire API, authentication, headers, and
retry/timeout behavior. Built-in provider IDs such as \`openai\` are reserved.

## Approval Policies And Sandbox Modes

\`approval_policy\` controls when Codex pauses for review. \`sandbox_mode\`
controls filesystem and network access. \`approvals_reviewer\` changes who
reviews prompts, not sandbox boundaries.

## Named Permission Profiles

\`default_permissions\` can point to built-in profiles such as \`:workspace\`
or custom \`[permissions.<name>]\` tables.

## Shell Environment Policy

\`shell_environment_policy\` limits which environment variables subprocesses
receive.

## MCP Servers

\`mcp_servers.<id>\` config defines command, URL, environment, allowed tools,
timeouts, OAuth settings, and enablement.

## Observability And Telemetry

\`[otel]\` can enable log, metrics, and trace export. \`analytics.enabled\`
controls anonymous product metrics.

## Notifications

\`notify\` runs an external program for supported events such as
\`agent-turn-complete\`.

## History, Citations, Project Instructions, And TUI

Codex config controls history persistence, clickable file citations, project
instruction discovery, and TUI notifications/theme/keymap settings.
`,
  );

  writeFile(
    path.join(CODEX_SOURCE_DIR, 'config-reference.md'),
    `---
source_marker: official-openai-doc
source_url: https://developers.openai.com/codex/config-reference
retrieved_at: ${CODEX_RETRIEVED_AT}
namespace: codex
---

# Configuration Reference

Official OpenAI Codex configuration key reference. Source URL:
<https://developers.openai.com/codex/config-reference>.

## Config TOML

User config lives in \`~/.codex/config.toml\`. Trusted projects can add
\`.codex/config.toml\` layers. Security-sensitive keys include
\`approval_policy\`, \`sandbox_mode\`, and \`sandbox_workspace_write.*\`.

## Core Keys

Important keys include \`model\`, \`review_model\`, \`model_provider\`,
\`openai_base_url\`, \`model_context_window\`, \`model_catalog_json\`,
\`approval_policy\`, \`approvals_reviewer\`, \`auto_review.policy\`,
\`allow_login_shell\`, \`sandbox_mode\`, \`notify\`,
\`feedback.enabled\`, \`analytics.enabled\`, \`model_instructions_file\`,
\`service_tier\`, \`features.*\`, \`hooks\`, \`mcp_servers.*\`,
\`agents.*\`, \`memories.*\`, \`model_providers.*\`, \`profiles.*\`,
\`history.*\`, \`file_opener\`, \`otel.*\`, \`tui.*\`,
\`web_search\`, \`default_permissions\`, \`permissions.*\`, and
\`projects.<path>.trust_level\`.

## Requirements TOML

\`requirements.toml\` constrains settings users cannot override. It can limit
approval policies, sandbox modes, web search modes, hooks, filesystem denials,
MCP server identities, and command rules.
`,
  );
}

function writeGraphifySources() {
  writeFile(
    path.join(GRAPHIFY_SOURCE_DIR, 'full-command-reference.md'),
    `---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify#full-command-reference
retrieved_at: ${GRAPHIFY_RETRIEVED_AT}
namespace: graphify
---

# Graphify Command Reference

Graphify exposes command surfaces for repository graph generation, static graph
navigation, AI client installation, and hook/watch lifecycle support. This
snapshot records BMAD-relevant command families as advisory operator context.

## Query And Navigation Commands

Graphify supports natural-language graph queries, DFS budgeted queries, path
finding between graph nodes, and node explanation commands. These commands can
help an operator navigate checked-in graph artifacts, but their live output is
not Workspace verifier input.

## Agent Integration Commands

Graphify documents assistant integrations for platforms including Codex. Client
install commands can configure an assistant to consult graph reports before
file reads on platforms that support that behavior. BMAD treats this as local
operator affordance, not Workspace authority.

## Hook And Watch Commands

Graphify includes hook install, uninstall, and status commands for repository
change awareness. BMAD records hook/watch capability as proposed advisory
context only; Workspace must not run hooks or regenerate graph artifacts during
capability verification.
`,
  );

  writeFile(
    path.join(GRAPHIFY_SOURCE_DIR, 'architecture.md'),
    `---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify/blob/v7/ARCHITECTURE.md
retrieved_at: ${GRAPHIFY_RETRIEVED_AT}
namespace: graphify
---

# Graphify Architecture

Graphify is documented as an assistant skill backed by a Python library. The
pipeline moves through detection, extraction, graph build, clustering, analysis,
report rendering, and export. Modules communicate through plain dictionaries
and NetworkX graph objects.

## Pipeline Modules

Key modules cover file collection, extraction, graph building, clustering,
analysis, reporting, export, ingest, cache handling, security validation, schema
validation, MCP serving, watching, and benchmarking. BMAD persists these as
tool capability context, not as permission to call Graphify.

## MCP Stdio Server

Graphify architecture names a serve module that starts an MCP stdio server from
a graph path. BMAD treats this as an experimental live-tool affordance. Live MCP
activation is not verifier input and not Workspace authority.

## Security And Validation

Graphify validates external URLs, fetched content, graph file paths, and node
labels before use. BMAD still keeps source files and declared Workspace
contracts as authority before planning or edits.
`,
  );

  writeFile(
    path.join(GRAPHIFY_SOURCE_DIR, 'docker-mcp-sqlite.md'),
    `---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify/blob/v7/docs/docker-mcp-sqlite.md
retrieved_at: ${GRAPHIFY_RETRIEVED_AT}
namespace: graphify
---

# Graphify Docker MCP SQLite Runbook

The Graphify docs include a reproducible Docker MCP Toolkit runbook for adding
SQLite MCP tools beside graph-related context. The runbook is optional and not
required to use Graphify.

## SQLite MCP Tools

The runbook describes SQLite tools for read queries, write queries, table
creation, table listing, table description, and insight append operations.
These tools are persistent local MCP affordances, not Workspace verifier
evidence.

## Client Wiring

The runbook lists client connection steps for multiple MCP clients, including
Codex. BMAD treats this as advisory operator setup. Runtime availability must be
recorded manually through Workspace result or closeout evidence if it matters.
`,
  );

  writeFile(
    path.join(GRAPHIFY_SOURCE_DIR, 'how-it-works.md'),
    `---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify/blob/v7/docs/how-it-works.md
retrieved_at: ${GRAPHIFY_RETRIEVED_AT}
namespace: graphify
---

# Graphify How It Works

Graphify processes code, media, documents, papers, and images into a graph.
BMAD records this as source evidence for advisory graph context and capability
authoring.

## Three Passes

Code structure extraction uses local tree-sitter parsing. Video and audio
transcription use local faster-whisper. Document, paper, image, and transcript
extraction can use parallel Claude subagents and costs tokens.

## Confidence Tagging

Graphify labels relationships as extracted, inferred, or ambiguous. BMAD must
keep ambiguous and inferred graph relationships advisory until source files or
manual review confirms them.

## SHA256 Cache

Graphify fingerprints extracted files by content hash and skips unchanged files
on reruns. Cache state helps explain freshness risk but is not Workspace
verifier input.

## Graph Format

Graphify outputs NetworkX node-link graph JSON with stable node ids, labels,
source files, edge relations, confidence data, and optional hyperedges.
`,
  );
}

function writeRunbook() {
  writeFile(
    path.join(GRAPHIFY_DIR, 'runbook.md'),
    `# Repository Graph Runbook

## Purpose

Build curated BMAD and Codex knowledge graphs without graphifying the whole
repository. Every generated glossary candidate must trace back to a graph node
and source reference.

## Commands

\`\`\`shell
node tools/generate-graphify-manifests.js
npm run validate:graphify-manifests
node tools/build-repository-graph.js
npm run validate:graphify-manifests
\`\`\`

## Ownership

- \`.graphify/*.txt\` files are deterministic corpus manifests.
- \`.graphify/sources/codex/*.md\` files are Codex source snapshots and citation metadata.
- \`.graphify/sources/graphify/*.md\` files are Graphify source snapshots and citation metadata.
- \`.graphify/work/\` is disposable materialized corpus data.
- \`graph/*.graph.json\` files are normalized review artifacts.
- \`graph/repository-knowledge.graph.json\` is derived from per-slice graphs.
- \`UBIQUITOUS_LANGUAGE.proposed.md\` is a review draft only.

## Scope Rules

- Keep each manifest at 200 files or fewer.
- Use repo-relative sorted paths.
- Exclude generated/noisy paths such as \`node_modules/\`, \`.git/\`,
  \`dist/\`, \`build/\`, \`coverage/\`, \`graphify-out/\`, \`graph/\`, and lockfiles.
- Exclude lockfiles from graph input, but keep them in the checkout for
  package manager commands such as \`npm ci\`.
- Use static code extraction only; unresolved dynamic calls are omitted.

## Review Rules

- Per-slice graphs are primary. The merged repository graph is derived.
- Do not hand-edit generated graph JSON.
- Codex terms remain namespaced as \`codex\` unless source evidence supports a
  BMAD cross-link.
- Canonical \`UBIQUITOUS_LANGUAGE.md\` remains unchanged until a human accepts
  \`UBIQUITOUS_LANGUAGE.proposed.md\`.
`,
  );
}

function main() {
  ensureDir(GRAPHIFY_DIR);
  removeOldGeneratedManifests();
  writeCodexSources();
  writeGraphifySources();
  writeRunbook();

  writeManifest('bmad-root.txt', [
    'AGENTS.md',
    'BMAD.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'README.md',
    'SECURITY.md',
    'UBIQUITOUS_LANGUAGE.md',
    'bmad.config.yaml',
    'package.json',
    'tools/javascript-conventions.md',
    'tools/skill-validator.md',
  ]);

  writeChunkedManifests('bmad-docs', walk(path.join(PROJECT_ROOT, 'docs'), { extensions: DOC_EXTENSIONS, skipLocales: true }));
  writeChunkedManifests('bmad-skills', [
    ...walk(path.join(PROJECT_ROOT, 'src', 'core-skills'), { extensions: SKILL_EXTENSIONS }),
    ...walk(path.join(PROJECT_ROOT, 'src', 'bmm-skills'), { extensions: SKILL_EXTENSIONS }),
  ]);
  writeChunkedManifests(
    'bmad-tools-code',
    uniqueSorted(['package.json', ...walk(path.join(PROJECT_ROOT, 'tools'), { extensions: CODE_EXTENSIONS })]),
  );

  writeManifest('codex-config.txt', [
    '.graphify/sources/codex/advanced-configuration-thread-excerpt.md',
    '.graphify/sources/codex/config-advanced.md',
    '.graphify/sources/codex/config-reference.md',
  ]);

  writeManifest('graphify-docs.txt', [
    '.graphify/sources/graphify/architecture.md',
    '.graphify/sources/graphify/docker-mcp-sqlite.md',
    '.graphify/sources/graphify/full-command-reference.md',
    '.graphify/sources/graphify/how-it-works.md',
  ]);

  console.log('Graphify manifests generated.');
}

if (require.main === module) {
  main();
}
