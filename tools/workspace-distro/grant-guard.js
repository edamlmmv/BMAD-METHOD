const fs = require('node:fs');
const path = require('node:path');

const { DEFAULT_RUNTIME_ROOT } = require('./launch');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assertMissionId(missionId) {
  if (!missionId || !/^[a-zA-Z0-9._-]+$/.test(missionId)) {
    throw new Error('mission id may only contain letters, numbers, dots, underscores, and dashes');
  }
}

function isPathInside(candidatePath, rootPath) {
  const relativePath = path.relative(canonicalPath(rootPath), canonicalPath(candidatePath));
  return relativePath === '' || (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function canonicalPath(candidatePath) {
  let currentPath = path.resolve(candidatePath);
  if (fs.existsSync(currentPath)) {
    return fs.realpathSync.native(currentPath);
  }

  const missingSegments = [];
  while (!fs.existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return path.resolve(candidatePath);
    }
    missingSegments.unshift(path.basename(currentPath));
    currentPath = parentPath;
  }

  return path.join(fs.realpathSync.native(currentPath), ...missingSegments);
}

function resolveGrantPath(basePath, grantPath) {
  return path.isAbsolute(grantPath) ? path.resolve(grantPath) : path.resolve(basePath, grantPath);
}

function authorizeDurableWrite({ missionId, writePath, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertMissionId(missionId);
  if (!writePath) {
    throw new Error('authorize requires --write-path');
  }

  const missionRoot = path.join(path.resolve(runtimeRoot), 'missions', missionId);
  const instancePath = path.join(missionRoot, 'instance.json');
  const repoPackPath = path.join(missionRoot, 'repo-pack.json');
  const grantsPath = path.join(missionRoot, 'grants.json');
  if (!fs.existsSync(instancePath) || !fs.existsSync(repoPackPath) || !fs.existsSync(grantsPath)) {
    throw new Error(`mission artifacts not found for ${missionId}`);
  }

  const instance = readJson(instancePath);
  const repoPack = readJson(repoPackPath);
  const grants = readJson(grantsPath);
  const resolvedWritePath = path.resolve(writePath);
  const workspaceDistroPath = path.resolve(instance.workspaceDistroPath);
  const allowedTargetWrites = (grants.targetRepoWrites || repoPack.repos.map((repo) => repo.worktreePath)).map((targetPath) =>
    path.resolve(targetPath),
  );
  const allowedBasePaths = (grants.allowedBasePaths || []).map((grantPath) => resolveGrantPath(workspaceDistroPath, grantPath));
  const baseMutationGrant = grants.baseMutationGrant === true;

  if (isPathInside(resolvedWritePath, workspaceDistroPath) && !baseMutationGrant) {
    denyWrite({
      missionId,
      missionRoot,
      reason: 'base-write-denied',
      writePath: resolvedWritePath,
      grants,
      instance,
    });
  }

  if (isPathInside(resolvedWritePath, workspaceDistroPath)) {
    if (allowedBasePaths.some((allowedPath) => isPathInside(resolvedWritePath, allowedPath))) {
      return allowWrite({ missionId, writePath: resolvedWritePath, scope: 'workspace-distro' });
    }

    denyWrite({
      missionId,
      missionRoot,
      reason: 'base-path-not-granted',
      writePath: resolvedWritePath,
      grants,
      instance,
    });
  }

  if (allowedTargetWrites.some((allowedPath) => isPathInside(resolvedWritePath, allowedPath))) {
    return allowWrite({ missionId, writePath: resolvedWritePath, scope: 'target-repo' });
  }

  if (isPathInside(resolvedWritePath, missionRoot)) {
    return allowWrite({ missionId, writePath: resolvedWritePath, scope: 'mission-runtime' });
  }

  denyWrite({
    missionId,
    missionRoot,
    reason: 'write-outside-mission-boundary',
    writePath: resolvedWritePath,
    grants,
    instance,
  });
}

function allowWrite({ missionId, writePath, scope }) {
  return {
    missionId,
    allowed: true,
    scope,
    writePath,
  };
}

function denyWrite({ missionId, missionRoot, reason, writePath, grants, instance }) {
  const violationsRoot = path.join(missionRoot, 'violations');
  fs.mkdirSync(violationsRoot, { recursive: true });
  const createdAt = new Date().toISOString();
  const violationPath = path.join(violationsRoot, `${Date.now()}-${reason}.json`);
  const violation = {
    schemaVersion: '0.1',
    missionId,
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
