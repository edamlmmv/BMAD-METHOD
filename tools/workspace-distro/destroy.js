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

function assertMissionId(missionId) {
  if (!missionId || !/^[a-zA-Z0-9._-]+$/.test(missionId)) {
    throw new Error('destroy requires a valid mission id');
  }
}

function destroyMission({ missionId, runtimeRoot = DEFAULT_RUNTIME_ROOT, keepReview = false }) {
  assertMissionId(missionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const missionRoot = path.join(resolvedRuntimeRoot, 'missions', missionId);
  const repoPackPath = path.join(missionRoot, 'repo-pack.json');

  if (!fs.existsSync(missionRoot) || !fs.existsSync(repoPackPath)) {
    throw new Error(`mission artifacts not found for ${missionId}`);
  }

  const retainedReviewPath = keepReview ? retainReview({ missionId, missionRoot, runtimeRoot: resolvedRuntimeRoot }) : null;
  const repoPack = readJson(repoPackPath);

  for (const repo of repoPack.repos || []) {
    removeWorktree(repo);
  }

  fs.rmSync(missionRoot, { recursive: true, force: true });

  return {
    missionId,
    removed: true,
    missionRoot,
    retainedReviewPath,
  };
}

function retainReview({ missionId, missionRoot, runtimeRoot }) {
  const reviewRoot = path.join(missionRoot, 'review');
  if (!fs.existsSync(reviewRoot)) {
    return null;
  }

  const retainedReviewPath = path.join(runtimeRoot, 'retained-reviews', missionId);
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
  destroyMission,
};
