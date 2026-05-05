const fs = require('node:fs');
const path = require('node:path');

function canonicalPath(candidatePath) {
  let currentPath = path.resolve(candidatePath);
  if (fs.existsSync(currentPath)) {
    return normalizeForPlatform(fs.realpathSync.native(currentPath));
  }

  const missingSegments = [];
  while (!fs.existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return normalizeForPlatform(path.resolve(candidatePath));
    }
    missingSegments.unshift(path.basename(currentPath));
    currentPath = parentPath;
  }

  return normalizeForPlatform(path.join(fs.realpathSync.native(currentPath), ...missingSegments));
}

function normalizeForPlatform(candidatePath) {
  const normalized = path.normalize(candidatePath);
  return process.platform === 'darwin' ? normalized.toLowerCase() : normalized;
}

function isPathInside(candidatePath, rootPath) {
  const canonicalRoot = canonicalPath(rootPath);
  const canonicalCandidate = canonicalPath(candidatePath);
  const relativePath = path.relative(canonicalRoot, canonicalCandidate);
  return relativePath === '' || (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function assertPathInside(candidatePath, rootPath, code = 'PATH_OUTSIDE_ROOT') {
  if (!isPathInside(candidatePath, rootPath)) {
    throw new Error(`${code}: ${path.resolve(candidatePath)} escapes ${path.resolve(rootPath)}`);
  }
}

function assertSafeRelativePath(relativePath, code = 'UNSAFE_PATH') {
  if (
    typeof relativePath !== 'string' ||
    relativePath.trim() === '' ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.split('/').includes('..')
  ) {
    throw new Error(`${code}: ${relativePath}`);
  }
}

module.exports = {
  assertPathInside,
  assertSafeRelativePath,
  canonicalPath,
  isPathInside,
};
