const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');

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

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('destroy requires a valid session id');
  }
}

function destroySession({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT, keepReview = false }) {
  assertSessionId(sessionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const repoPackPath = path.join(sessionRoot, 'repo-pack.json');

  if (!fs.existsSync(sessionRoot) || !fs.existsSync(repoPackPath)) {
    throw new Error(`session artifacts not found for ${sessionId}`);
  }

  const retainedReviewPath = keepReview ? retainReview({ sessionId, sessionRoot, runtimeRoot: resolvedRuntimeRoot }) : null;
  const repoPack = readJson(repoPackPath);

  for (const repo of repoPack.repos || []) {
    removeWorktree(repo);
  }

  fs.rmSync(sessionRoot, { recursive: true, force: true });

  return {
    sessionId,
    removed: true,
    sessionRoot,
    retainedReviewPath,
  };
}

function retainReview({ sessionId, sessionRoot, runtimeRoot }) {
  const reviewRoot = path.join(sessionRoot, 'review');
  if (!fs.existsSync(reviewRoot)) {
    return null;
  }

  const retainedReviewPath = path.join(runtimeRoot, 'retained-reviews', sessionId);
  fs.rmSync(retainedReviewPath, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(retainedReviewPath), { recursive: true });
  copyDirectory(reviewRoot, retainedReviewPath);
  return retainedReviewPath;
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function removeWorktree(repo) {
  if (!repo.sourcePath || !repo.worktreePath || !fs.existsSync(repo.worktreePath)) {
    return;
  }

  git(['worktree', 'remove', '--force', repo.worktreePath], repo.sourcePath);
}

module.exports = {
  destroySession,
};
