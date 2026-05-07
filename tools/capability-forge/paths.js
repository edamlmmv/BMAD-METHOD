const fs = require('node:fs');
const path = require('node:path');
const { forgeError } = require('./errors');

function normalizePosix(value) {
  return value.split(path.sep).join('/');
}

function assertSafeRelativePath(value, label = 'path') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw forgeError('FORGE_PATH_UNSAFE', `${label} must be a non-empty relative path`);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || path.isAbsolute(value) || value.includes('\\')) {
    throw forgeError('FORGE_PATH_UNSAFE', `${label} must be a local relative POSIX path`);
  }
  if (value.split('/').includes('..')) {
    throw forgeError('FORGE_PATH_UNSAFE', `${label} must not traverse parent directories`);
  }
  return value;
}

function resolveUnderRoot(root, relativePath, label = 'path') {
  assertSafeRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw forgeError('FORGE_PATH_UNSAFE', `${label} escapes ${resolvedRoot}`);
  }
  return resolved;
}

function assertNoSymlinkPath(targetPath, label = 'target', rootPath = path.parse(path.resolve(targetPath)).root) {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(targetPath);
  const relativeParts = path.relative(resolvedRoot, resolvedTarget).split(path.sep).filter(Boolean);
  let cursor = resolvedRoot;
  for (const part of relativeParts) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) {
      throw forgeError('FORGE_PATH_UNSAFE', `${label} must not contain symlink segment: ${cursor}`);
    }
  }
}

function resolvePromotionTarget({ projectRoot, target, allowedRoots }) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  assertSafeRelativePath(target, 'promotion target');
  const resolvedTarget = path.resolve(resolvedProjectRoot, target);
  assertNoSymlinkPath(path.dirname(resolvedTarget), 'promotion target', resolvedProjectRoot);

  const resolvedAllowedRoots = allowedRoots.map((allowedRoot) => path.resolve(resolvedProjectRoot, allowedRoot));
  const insideAllowedRoot = resolvedAllowedRoots.some(
    (allowedRoot) => resolvedTarget === allowedRoot || resolvedTarget.startsWith(`${allowedRoot}${path.sep}`),
  );
  if (!insideAllowedRoot) {
    throw forgeError('FORGE_PROMOTE_UNSAFE', 'promotion target must stay under configured workspace.runtime_roots');
  }
  return resolvedTarget;
}

module.exports = {
  assertNoSymlinkPath,
  assertSafeRelativePath,
  normalizePosix,
  resolvePromotionTarget,
  resolveUnderRoot,
};
