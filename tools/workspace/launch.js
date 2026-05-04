const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULT_RUNTIME_ROOT = path.join(os.tmpdir(), 'bmad-workspace');

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

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeSegment(value) {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, '-').replaceAll(/-+/g, '-');
}

function createSessionId() {
  const stamp = new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `session-${stamp}-${suffix}`;
}

function assertSessionId(sessionId) {
  if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('session id may only contain letters, numbers, dots, underscores, and dashes');
  }
}

function resolveGitRepo(repoPath) {
  const absolutePath = path.resolve(repoPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`repo path does not exist: ${absolutePath}`);
  }

  const repoRoot = git(['rev-parse', '--show-toplevel'], absolutePath);
  const head = git(['rev-parse', 'HEAD'], repoRoot);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);

  return {
    sourcePath: repoRoot,
    head,
    branch,
  };
}

function launchSession({
  repoPaths,
  goalPath,
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  sessionId = createSessionId(),
  workspaceBasePath = process.cwd(),
  baseImprovement = false,
  grantPath,
}) {
  const resolvedGoalPath = path.resolve(goalPath || '');
  if (!goalPath || !fs.existsSync(resolvedGoalPath)) {
    throw new Error('launch requires --goal pointing to an existing file');
  }

  assertSessionId(sessionId);

  if (baseImprovement) {
    return launchBaseImprovementSession({
      goalPath: resolvedGoalPath,
      runtimeRoot,
      sessionId,
      workspaceBasePath,
      grantPath,
    });
  }

  if (!Array.isArray(repoPaths) || repoPaths.length === 0) {
    throw new Error('launch requires at least one --repo path');
  }

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const worktreesRoot = path.join(sessionRoot, 'worktrees');
  if (fs.existsSync(sessionRoot)) {
    throw new Error(`session already exists: ${sessionRoot}`);
  }

  fs.mkdirSync(worktreesRoot, { recursive: true });

  const createdWorktrees = [];
  try {
    const repos = repoPaths.map((repoPath, index) => {
      const repo = resolveGitRepo(repoPath);
      const repoName = safeSegment(path.basename(repo.sourcePath)) || `repo-${index + 1}`;
      const worktreePath = path.join(worktreesRoot, `${index + 1}-${repoName}`);
      git(['worktree', 'add', '--detach', worktreePath, repo.head], repo.sourcePath);
      createdWorktrees.push({ sourcePath: repo.sourcePath, worktreePath });

      return {
        id: `repo-${index + 1}`,
        sourcePath: repo.sourcePath,
        branch: repo.branch,
        head: repo.head,
        worktreePath,
      };
    });

    const instancePath = path.join(sessionRoot, 'instance.json');
    const repoPackPath = path.join(sessionRoot, 'repo-pack.json');
    const grantsPath = path.join(sessionRoot, 'grants.json');
    const createdAt = new Date().toISOString();

    const instance = {
      schemaVersion: '0.1',
      id: sessionId,
      sessionType: 'normal',
      createdAt,
      workspaceBasePath: path.resolve(workspaceBasePath),
      runtimeRoot: resolvedRuntimeRoot,
      sessionRoot,
      goalPath: resolvedGoalPath,
      repoPackRef: 'repo-pack.json',
      grantsRef: 'grants.json',
      lifecycle: ['launch'],
    };

    const repoPack = {
      schemaVersion: '0.1',
      repos,
    };

    const grants = {
      schemaVersion: '0.1',
      baseMutationGrant: false,
      allowedBasePaths: [],
      targetRepoWrites: repos.map((repo) => repo.worktreePath),
      forbiddenWrites: ['workspace-base'],
    };

    writeJson(instancePath, instance);
    writeJson(repoPackPath, repoPack);
    writeJson(grantsPath, grants);

    return {
      sessionId,
      sessionRoot,
      instancePath,
      repoPackPath,
      grantsPath,
    };
  } catch (error) {
    for (const worktree of createdWorktrees.toReversed()) {
      try {
        git(['worktree', 'remove', '--force', worktree.worktreePath], worktree.sourcePath);
      } catch {
        // Best-effort cleanup; preserve original launch failure.
      }
    }
    fs.rmSync(sessionRoot, { recursive: true, force: true });
    throw error;
  }
}

function launchBaseImprovementSession({ goalPath, runtimeRoot, sessionId, workspaceBasePath, grantPath }) {
  const grant = readBaseMutationGrant(grantPath);
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const worktreesRoot = path.join(sessionRoot, 'worktrees');
  if (fs.existsSync(sessionRoot)) {
    throw new Error(`session already exists: ${sessionRoot}`);
  }

  fs.mkdirSync(worktreesRoot, { recursive: true });

  const workspaceRepo = resolveGitRepo(workspaceBasePath);
  const branchName = `codex/workspace/${sessionId}`;
  const worktreePath = path.join(worktreesRoot, 'base-workspace');
  let worktreeCreated = false;

  try {
    git(['worktree', 'add', '-b', branchName, worktreePath, workspaceRepo.head], workspaceRepo.sourcePath);
    worktreeCreated = true;

    const instancePath = path.join(sessionRoot, 'instance.json');
    const repoPackPath = path.join(sessionRoot, 'repo-pack.json');
    const grantsPath = path.join(sessionRoot, 'grants.json');
    const promotionPolicyPath = path.join(sessionRoot, 'promotion-policy.json');
    const createdAt = new Date().toISOString();

    const instance = {
      schemaVersion: '0.1',
      id: sessionId,
      sessionType: 'base-improvement',
      createdAt,
      workspaceBasePath: worktreePath,
      sourceWorkspaceBasePath: workspaceRepo.sourcePath,
      runtimeRoot: resolvedRuntimeRoot,
      sessionRoot,
      goalPath,
      repoPackRef: 'repo-pack.json',
      grantsRef: 'grants.json',
      promotionPolicyRef: 'promotion-policy.json',
      baseWorktreeBranch: branchName,
      lifecycle: ['launch'],
    };

    const repoPack = {
      schemaVersion: '0.1',
      repos: [
        {
          id: 'workspace-base',
          sourcePath: workspaceRepo.sourcePath,
          branch: workspaceRepo.branch,
          head: workspaceRepo.head,
          worktreePath,
          baseWorktreeBranch: branchName,
        },
      ],
    };

    const grants = {
      schemaVersion: '0.1',
      baseMutationGrant: true,
      allowedBasePaths: grant.allowedBasePaths,
      targetRepoWrites: [],
      forbiddenWrites: ['ungranted-workspace-base-paths'],
      sourceGrantPath: grant.sourceGrantPath,
      bmadArtifactRef: grant.bmadArtifactRef,
    };

    const promotionPolicy = {
      schemaVersion: '0.1',
      explicitOnly: true,
      requiredEvidence: ['BMAD artifact', 'Base Mutation Grant', 'Worktree Review'],
      forbiddenActions: ['auto-promotion', 'unreviewed-base-merge'],
    };

    writeJson(instancePath, instance);
    writeJson(repoPackPath, repoPack);
    writeJson(grantsPath, grants);
    writeJson(promotionPolicyPath, promotionPolicy);

    return {
      sessionId,
      sessionRoot,
      instancePath,
      repoPackPath,
      grantsPath,
      promotionPolicyPath,
    };
  } catch (error) {
    if (worktreeCreated) {
      try {
        git(['worktree', 'remove', '--force', worktreePath], workspaceRepo.sourcePath);
      } catch {
        // Preserve original launch failure.
      }
    }
    fs.rmSync(sessionRoot, { recursive: true, force: true });
    throw error;
  }
}

function readBaseMutationGrant(grantPath) {
  if (!grantPath) {
    throw new Error('base-improvement-requires-base-mutation-grant');
  }

  const sourceGrantPath = path.resolve(grantPath);
  if (!fs.existsSync(sourceGrantPath)) {
    throw new Error(`base-mutation-grant-not-found: ${sourceGrantPath}`);
  }

  const grant = readJson(sourceGrantPath);
  if (grant.baseMutationGrant !== true) {
    throw new Error('base-improvement-requires-base-mutation-grant');
  }
  if (!grant.bmadArtifactRef || typeof grant.bmadArtifactRef !== 'string') {
    throw new Error('base-mutation-grant-requires-bmad-artifact');
  }

  return {
    sourceGrantPath,
    bmadArtifactRef: grant.bmadArtifactRef,
    allowedBasePaths: normalizeAllowedBasePaths(grant.allowedBasePaths),
  };
}

function normalizeAllowedBasePaths(allowedBasePaths) {
  if (!Array.isArray(allowedBasePaths) || allowedBasePaths.length === 0) {
    throw new Error('base-mutation-grant-requires-allowed-base-paths');
  }

  return allowedBasePaths.map((allowedPath) => {
    if (typeof allowedPath !== 'string' || allowedPath.trim() === '') {
      throw new Error('base-mutation-grant-path-outside-workspace');
    }

    const normalizedPath = path.normalize(allowedPath.trim());
    if (path.isAbsolute(normalizedPath) || normalizedPath === '..' || normalizedPath.startsWith(`..${path.sep}`)) {
      throw new Error('base-mutation-grant-path-outside-workspace');
    }

    return normalizedPath;
  });
}

module.exports = {
  DEFAULT_RUNTIME_ROOT,
  launchSession,
};
