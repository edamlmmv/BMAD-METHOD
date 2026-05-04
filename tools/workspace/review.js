const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { REVIEW_MANIFEST_REF, buildReviewManifest } = require('./review-manifest');

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

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('review requires a valid session id');
  }
}

function runWorktreeReview({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
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
  const reviewRoot = path.join(sessionRoot, 'review');
  fs.mkdirSync(reviewRoot, { recursive: true });

  const repos = repoPack.repos.map((repo) => reviewRepo(repo, reviewRoot));
  const summaryPath = path.join(reviewRoot, 'summary.json');
  const manifestPath = path.join(sessionRoot, REVIEW_MANIFEST_REF);
  const summary = {
    schemaVersion: '0.1',
    sessionId,
    generatedAt,
    clean: repos.every((repo) => repo.clean),
    repos,
  };

  writeJson(summaryPath, summary);
  const manifest = buildReviewManifest({ sessionId, sessionRoot, summary, createdAt: generatedAt });
  writeJson(manifestPath, manifest);
  writeJson(instancePath, {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'review'])],
    reviewRef: path.relative(sessionRoot, summaryPath),
    reviewManifestRef: REVIEW_MANIFEST_REF,
  });

  return {
    sessionId,
    sessionRoot,
    summaryPath,
    manifestPath,
  };
}

function reviewRepo(repo, reviewRoot) {
  const repoReviewRoot = path.join(reviewRoot, repo.id);
  fs.mkdirSync(repoReviewRoot, { recursive: true });

  const statusText = git(['status', '--porcelain=v1', '--untracked-files=all'], repo.worktreePath);
  const changedFiles = parseChangedFiles(statusText);
  const clean = changedFiles.length === 0;
  const statusPath = path.join(repoReviewRoot, 'status.json');
  const patchPath = clean ? null : path.join(repoReviewRoot, 'diff.patch');

  if (patchPath) {
    fs.writeFileSync(patchPath, `${collectPatch(repo.worktreePath)}\n`);
  }

  const status = {
    schemaVersion: '0.1',
    repoId: repo.id,
    sourcePath: repo.sourcePath,
    worktreePath: repo.worktreePath,
    clean,
    status: statusText,
    changedFiles,
    patchPath,
  };

  writeJson(statusPath, status);

  return {
    repoId: repo.id,
    sourcePath: repo.sourcePath,
    worktreePath: repo.worktreePath,
    clean,
    changedFiles,
    statusPath,
    patchPath,
  };
}

function parseChangedFiles(statusText) {
  if (!statusText) {
    return [];
  }

  return statusText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      if (line.length > 3 && line[2] === ' ') {
        return line.slice(3).trim();
      }
      if (line.length > 2 && line[1] === ' ') {
        return line.slice(2).trim();
      }
      return line.trim();
    });
}

function collectPatch(worktreePath) {
  const unstaged = git(['diff', '--binary'], worktreePath);
  const staged = git(['diff', '--cached', '--binary'], worktreePath);

  return [unstaged, staged].filter(Boolean).join('\n');
}

module.exports = {
  runWorktreeReview,
};
