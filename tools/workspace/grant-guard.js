const fs = require('node:fs');
const path = require('node:path');

const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { isPathInside } = require('./path-safety');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('session id may only contain letters, numbers, dots, underscores, and dashes');
  }
}

function resolveGrantPath(basePath, grantPath) {
  return path.isAbsolute(grantPath) ? path.resolve(grantPath) : path.resolve(basePath, grantPath);
}

function authorizeDurableWrite({ sessionId, writePath, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertSessionId(sessionId);
  if (!writePath) {
    throw new Error('authorize requires --write-path');
  }

  const sessionRoot = path.join(path.resolve(runtimeRoot), 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');
  const repoPackPath = path.join(sessionRoot, 'repo-pack.json');
  const grantsPath = path.join(sessionRoot, 'grants.json');
  if (!fs.existsSync(instancePath) || !fs.existsSync(repoPackPath) || !fs.existsSync(grantsPath)) {
    throw new Error(`session artifacts not found for ${sessionId}`);
  }

  const instance = readJson(instancePath);
  const repoPack = readJson(repoPackPath);
  const grants = readJson(grantsPath);
  const resolvedWritePath = path.resolve(writePath);
  const workspaceBasePath = path.resolve(instance.workspaceBasePath);
  const allowedTargetWrites = (grants.targetRepoWrites || repoPack.repos.map((repo) => repo.worktreePath)).map((targetPath) =>
    path.resolve(targetPath),
  );
  const allowedBasePaths = (grants.allowedBasePaths || []).map((grantPath) => resolveGrantPath(workspaceBasePath, grantPath));
  const baseMutationGrant = grants.baseMutationGrant === true;

  if (isPathInside(resolvedWritePath, workspaceBasePath) && !baseMutationGrant) {
    denyWrite({
      sessionId,
      sessionRoot,
      reason: 'base-write-denied',
      writePath: resolvedWritePath,
      grants,
      instance,
    });
  }

  if (isPathInside(resolvedWritePath, workspaceBasePath)) {
    if (allowedBasePaths.some((allowedPath) => isPathInside(resolvedWritePath, allowedPath))) {
      return allowWrite({ sessionId, writePath: resolvedWritePath, scope: 'workspace-base' });
    }

    denyWrite({
      sessionId,
      sessionRoot,
      reason: 'base-path-not-granted',
      writePath: resolvedWritePath,
      grants,
      instance,
    });
  }

  if (allowedTargetWrites.some((allowedPath) => isPathInside(resolvedWritePath, allowedPath))) {
    return allowWrite({ sessionId, writePath: resolvedWritePath, scope: 'target-repo' });
  }

  if (isPathInside(resolvedWritePath, sessionRoot)) {
    return allowWrite({ sessionId, writePath: resolvedWritePath, scope: 'session-runtime' });
  }

  denyWrite({
    sessionId,
    sessionRoot,
    reason: 'write-outside-session-boundary',
    writePath: resolvedWritePath,
    grants,
    instance,
  });
}

function allowWrite({ sessionId, writePath, scope }) {
  return {
    sessionId,
    allowed: true,
    scope,
    writePath,
  };
}

function denyWrite({ sessionId, sessionRoot, reason, writePath, grants, instance }) {
  const violationsRoot = path.join(sessionRoot, 'violations');
  fs.mkdirSync(violationsRoot, { recursive: true });
  const createdAt = new Date().toISOString();
  const violationPath = path.join(violationsRoot, `${Date.now()}-${reason}.json`);
  const violation = {
    schemaVersion: '0.1',
    sessionId,
    createdAt,
    reason,
    attemptedPath: writePath,
    grantsRef: instance.grantsRef,
    baseMutationGrant: grants.baseMutationGrant === true,
    allowedBasePaths: grants.allowedBasePaths || [],
    targetRepoWrites: grants.targetRepoWrites || [],
  };
  writeJson(violationPath, violation);

  const error = new Error(`${reason}; violation recorded at ${violationPath}`);
  error.violationPath = violationPath;
  throw error;
}

module.exports = {
  authorizeDurableWrite,
};
