const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateNormalizedGraphObject } = require('../validate-graphify-manifests');

const GRAPH_EVIDENCE_REF = 'intake/graph.json';
const GRAPH_SCHEMA = 'normalized-graph-v1';

function cleanGitEnv() {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX']) {
    delete env[key];
  }
  return env;
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('intake requires a valid session id');
  }
}

function createScanner(generatedAt) {
  return {
    id: 'workspace.git-intake',
    version: '0.1',
    mode: 'code-only',
    generatedAt,
    liveAdapters: [],
  };
}

function runRepoIntake({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertSessionId(sessionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');
  const repoPackPath = path.join(sessionRoot, 'repo-pack.json');

  if (!fs.existsSync(instancePath) || !fs.existsSync(repoPackPath)) {
    throw new Error(`session artifacts not found for ${sessionId}`);
  }

  const instance = readJson(instancePath);
  const repoPack = readJson(repoPackPath);
  const generatedAt = new Date().toISOString();
  const scanner = createScanner(generatedAt);

  const intakeRoot = path.join(sessionRoot, 'intake');
  fs.mkdirSync(intakeRoot, { recursive: true });

  const repos = repoPack.repos.map((repo) => {
    const head = git(['rev-parse', 'HEAD'], repo.sourcePath);
    const worktreeHead = fs.existsSync(repo.worktreePath) ? git(['rev-parse', 'HEAD'], repo.worktreePath) : null;

    return {
      id: repo.id,
      sourcePath: repo.sourcePath,
      worktreePath: repo.worktreePath,
      branch: repo.branch,
      launchHead: repo.head,
      head,
      worktreeHead,
    };
  });

  const repoIntakePath = path.join(intakeRoot, 'repo-intake.json');
  const provenancePath = path.join(intakeRoot, 'provenance.json');
  const graphEvidencePath = path.join(intakeRoot, 'graph.json');
  const graphEvidence = buildGraphEvidence({ sessionId, generatedAt, repos });

  const repoIntake = {
    schemaVersion: '0.1',
    sessionId,
    generatedAt,
    scanner,
    repos,
    graphEvidenceRef: GRAPH_EVIDENCE_REF,
    graphEvidenceState: graphEvidence.summary.state,
  };

  const provenance = {
    schemaVersion: '0.1',
    sessionId,
    generatedAt,
    command: 'workspace intake',
    scanner,
    inputs: {
      instancePath,
      repoPackPath,
    },
    outputs: {
      repoIntakePath,
      provenancePath,
      graphEvidencePath,
    },
    graphEvidenceRef: GRAPH_EVIDENCE_REF,
    graphInputs: graphEvidence.repos.flatMap((repo) =>
      repo.artifacts.map((artifact) => ({
        sessionId,
        repoId: repo.id,
        generatedAt,
        repoRelativePath: artifact.repoRelativePath,
        sha256: artifact.sha256,
        graphSchema: artifact.graphSchema,
        validationState: artifact.validationState,
        warnings: artifact.warnings,
      })),
    ),
  };

  const updatedInstance = {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'intake'])],
    repoIntakeRef: path.relative(sessionRoot, repoIntakePath),
    intakeProvenanceRef: path.relative(sessionRoot, provenancePath),
    graphEvidenceRef: GRAPH_EVIDENCE_REF,
  };

  writeJson(repoIntakePath, repoIntake);
  writeJson(graphEvidencePath, graphEvidence);
  writeJson(provenancePath, provenance);
  writeJson(instancePath, updatedInstance);

  return {
    sessionId,
    sessionRoot,
    repoIntakePath,
    provenancePath,
    graphEvidencePath,
  };
}

function buildGraphEvidence({ sessionId, generatedAt, repos }) {
  const graphRepos = repos.map((repo) => inspectRepoGraphs({ repo, sessionId, generatedAt }));
  const artifacts = graphRepos.flatMap((repo) => repo.artifacts);
  const summary = {
    state: rollupGraphEvidenceState({ artifacts, repos: graphRepos }),
    repoCount: graphRepos.length,
    artifactCount: artifacts.length,
    validArtifactCount: artifacts.filter((artifact) => artifact.validationState === 'valid').length,
    warningArtifactCount: artifacts.filter((artifact) => artifact.validationState === 'warning').length,
    invalidArtifactCount: artifacts.filter((artifact) => artifact.validationState === 'invalid').length,
    nodeCount: artifacts.reduce((sum, artifact) => sum + artifact.nodeCount, 0),
    edgeCount: artifacts.reduce((sum, artifact) => sum + artifact.edgeCount, 0),
  };
  return {
    kind: 'bmad-workspace-graph-evidence',
    schemaVersion: 1,
    sessionId,
    generatedAt,
    repos: graphRepos,
    summary,
    warnings: graphRepos.flatMap((repo) => repo.warnings),
  };
}

function inspectRepoGraphs({ repo }) {
  const graphDir = path.join(repo.sourcePath, 'graph');
  const artifacts = listGraphArtifacts(graphDir).map((artifactPath) => inspectGraphArtifact({ repo, artifactPath }));
  const warnings = artifacts.length === 0 ? [`${repo.id}: no graph/*.graph.json artifacts found`] : [];
  return {
    id: repo.id,
    sourcePath: repo.sourcePath,
    graphRoot: graphDir,
    state: rollupGraphEvidenceState({ artifacts }),
    artifacts,
    warnings,
  };
}

function listGraphArtifacts(graphDir) {
  if (!fs.existsSync(graphDir) || !fs.statSync(graphDir).isDirectory()) {
    return [];
  }
  return fs
    .readdirSync(graphDir)
    .filter((entry) => entry.endsWith('.graph.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(graphDir, entry));
}

function inspectGraphArtifact({ repo, artifactPath }) {
  const repoRelativePath = toPosix(path.relative(repo.sourcePath, artifactPath));
  const stat = fs.statSync(artifactPath);
  const warnings = [];
  let graph = null;
  const validationErrors = [];

  try {
    graph = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    validateNormalizedGraphObject(graph, repoRelativePath, validationErrors);
  } catch (error) {
    validationErrors.push(`GRAPHIFY_GRAPH_INVALID_JSON graph JSON parse failed: ${error.message} [file=${repoRelativePath}]`);
  }

  warnings.push(...validationErrors);
  const sourcePathMissing = graph ? missingSourcePaths(repo.sourcePath, graph) : [];
  if (sourcePathMissing.length > 0) {
    warnings.push(...sourcePathMissing.map((sourcePath) => `missing graph source path: ${sourcePath}`));
  }

  const validationState = validationErrors.length > 0 ? 'invalid' : sourcePathMissing.length > 0 ? 'warning' : 'valid';
  return {
    repoRelativePath,
    sha256: sha256File(artifactPath),
    bytes: stat.size,
    validationState,
    graphSchema: GRAPH_SCHEMA,
    nodeCount: Array.isArray(graph?.nodes) ? graph.nodes.length : 0,
    edgeCount: Array.isArray(graph?.edges) ? graph.edges.length : 0,
    sliceIds: graph ? collectSliceIds(graph) : [],
    namespaces: graph ? collectNamespaces(graph) : [],
    sourcePathMissing,
    warnings,
  };
}

function missingSourcePaths(repoRoot, graph) {
  const sourcePaths = new Set();
  for (const node of graph.nodes || []) {
    if (node?.source?.path) sourcePaths.add(node.source.path);
  }
  for (const edge of graph.edges || []) {
    for (const evidence of edge.evidence || []) {
      if (evidence?.path) sourcePaths.add(evidence.path);
    }
  }
  return [...sourcePaths]
    .filter((sourcePath) => isRepoRelativePath(sourcePath) && !fs.existsSync(path.join(repoRoot, sourcePath)))
    .sort((left, right) => left.localeCompare(right));
}

function isRepoRelativePath(value) {
  return (
    typeof value === 'string' && value.trim() !== '' && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').includes('..')
  );
}

function collectSliceIds(graph) {
  const values = new Set();
  if (graph.metadata?.slice_id) values.add(graph.metadata.slice_id);
  for (const node of graph.nodes || []) {
    if (node.slice_id) values.add(node.slice_id);
  }
  for (const edge of graph.edges || []) {
    if (edge.slice_id) values.add(edge.slice_id);
  }
  return [...values].sort((left, right) => left.localeCompare(right));
}

function collectNamespaces(graph) {
  return [...new Set((graph.nodes || []).map((node) => node.namespace).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function rollupGraphEvidenceState({ artifacts, repos = [] }) {
  if (artifacts.some((artifact) => artifact.validationState === 'invalid')) return 'invalid';
  if (artifacts.some((artifact) => artifact.validationState === 'warning')) return 'warning';
  if (artifacts.some((artifact) => artifact.validationState === 'valid')) {
    return repos.some((repo) => repo.state === 'missing' || repo.warnings.length > 0) ? 'warning' : 'valid';
  }
  return 'missing';
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

module.exports = {
  buildGraphEvidence,
  runRepoIntake,
};
