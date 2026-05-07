const { execFileSync } = require('node:child_process');

const GRAPH_EVIDENCE_REF = 'intake/graph.json';
const GRAPHIFY_VALIDATION_COMMAND = 'npm run validate:graphify-manifests';
const GRAPH_EVIDENCE_GUIDANCE = Object.freeze({
  bmad: 'Graph evidence is advisory Workspace context for BMAD planning; source files remain authority.',
  codex: 'Use graph evidence to choose files, searches, and tool calls, then verify source files before edits.',
  tools: 'Graph evidence does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration.',
});

function createCapabilityContract(workspaceBasePath) {
  return {
    schemaVersion: '0.1',
    workspaceVersion: resolveWorkspaceVersion(workspaceBasePath),
    capabilities: [
      {
        id: 'evidence.graph.repo-intake',
        group: 'evidence.graph',
        provider: 'graphify',
        interface: 'repo-intake',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['workspace-session/intake'],
        forbiddenWrites: ['workspace-base'],
        outputs: ['repo-intake.json', 'graph.json', 'provenance.json'],
        artifactRefs: [GRAPH_EVIDENCE_REF],
        validationCommand: GRAPHIFY_VALIDATION_COMMAND,
        guidance: GRAPH_EVIDENCE_GUIDANCE,
        upstreamGapProofRequired: false,
      },
      {
        id: 'executor.codex.manual',
        group: 'executor.codex',
        provider: 'codex',
        interface: 'manual-executor-contract',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: true,
        writes: ['workspace-session/packets'],
        forbiddenWrites: ['workspace-base', 'target-repo', 'scheduler', 'daemon', 'live-adapter'],
        outputs: ['executor-contract.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'repo.git.worktree-review',
        group: 'repo.git',
        provider: 'git',
        interface: 'worktree-review',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['workspace-session/review'],
        forbiddenWrites: [
          'workspace-base',
          'target-repo',
          'target-repo/mutation',
          'target-repo/push',
          'target-repo/reset',
          'target-repo/clean',
          'scheduler',
          'daemon',
          'live-adapter',
        ],
        outputs: ['summary.json', 'review-manifest.json', 'status.json', 'diff.patch'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'host.mcp.context7.docs',
        group: 'host.mcp',
        provider: 'context7',
        interface: 'remote-docs-mcp',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: true,
        writes: [],
        forbiddenWrites: ['workspace-base', 'target-repo', 'scheduler', 'daemon', 'live-adapter', 'secret-store'],
        outputs: ['context7-docs-operator-evidence.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'host.mcp.git.local',
        group: 'host.mcp',
        provider: 'mcp-server-git',
        interface: 'local-git-mcp',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: true,
        writes: ['target-repo/git-index', 'target-repo/git-commit', 'target-repo/git-branch'],
        forbiddenWrites: [
          'workspace-base',
          'target-repo/push',
          'target-repo/fetch',
          'target-repo/reset',
          'target-repo/clean',
          'target-repo/restore',
          'target-repo/merge',
          'scheduler',
          'daemon',
          'live-adapter',
        ],
        outputs: ['git-mcp-operator-evidence.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'host.mcp.docker.toolkit',
        group: 'host.mcp',
        provider: 'docker-mcp-toolkit',
        interface: 'docker-mcp-gateway-profile',
        allowedInNormalSession: true,
        allowedInBaseImprovement: false,
        requiresGrant: true,
        writes: [],
        forbiddenWrites: ['workspace-base', 'target-repo', 'scheduler', 'daemon', 'live-adapter', 'secret-store'],
        outputs: ['docker-mcp-operator-evidence.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'host.mcp.postgresql.readonly',
        group: 'host.mcp',
        provider: 'modelcontextprotocol/server-postgres',
        interface: 'readonly-postgresql-mcp',
        allowedInNormalSession: true,
        allowedInBaseImprovement: false,
        requiresGrant: true,
        writes: [],
        forbiddenWrites: [
          'workspace-base',
          'target-repo',
          'external/postgresql/database',
          'scheduler',
          'daemon',
          'live-adapter',
          'secret-store',
        ],
        outputs: ['postgres-mcp-operator-evidence.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'host.mcp.google-calendar.remote',
        group: 'host.mcp',
        provider: 'google-calendar-mcp',
        interface: 'remote-calendar-mcp',
        allowedInNormalSession: true,
        allowedInBaseImprovement: false,
        requiresGrant: true,
        writes: ['external/google-calendar/events'],
        forbiddenWrites: [
          'workspace-base',
          'target-repo',
          'target-repo/appsscript',
          'scheduler',
          'daemon',
          'live-adapter',
          'apps-script-runtime',
          'calendar-api-enablement',
          'trigger-install',
          'deployment',
        ],
        outputs: ['calendar-mcp-operator-evidence.json'],
        upstreamGapProofRequired: false,
      },
    ],
  };
}

function resolveWorkspaceVersion(workspaceBasePath) {
  try {
    return git(['rev-parse', 'HEAD'], workspaceBasePath);
  } catch {
    return 'unknown';
  }
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function cleanGitEnv() {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX']) {
    delete env[key];
  }
  return env;
}

module.exports = {
  GRAPH_EVIDENCE_GUIDANCE,
  GRAPH_EVIDENCE_REF,
  GRAPHIFY_VALIDATION_COMMAND,
  createCapabilityContract,
};
