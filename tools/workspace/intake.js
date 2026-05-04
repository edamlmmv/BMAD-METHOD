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

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

  const repoIntake = {
    schemaVersion: '0.1',
    sessionId,
    generatedAt,
    scanner,
    repos,
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
    },
  };

  const updatedInstance = {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'intake'])],
    repoIntakeRef: path.relative(sessionRoot, repoIntakePath),
    intakeProvenanceRef: path.relative(sessionRoot, provenancePath),
  };

  writeJson(repoIntakePath, repoIntake);
  writeJson(provenancePath, provenance);
  writeJson(instancePath, updatedInstance);

  return {
    sessionId,
    sessionRoot,
    repoIntakePath,
    provenancePath,
  };
}

module.exports = {
  runRepoIntake,
};
