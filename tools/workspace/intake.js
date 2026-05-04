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

function assertMissionId(missionId) {
  if (!missionId || !/^[a-zA-Z0-9._-]+$/.test(missionId)) {
    throw new Error('intake requires a valid mission id');
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

function runRepoIntake({ missionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertMissionId(missionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const missionRoot = path.join(resolvedRuntimeRoot, 'missions', missionId);
  const instancePath = path.join(missionRoot, 'instance.json');
  const repoPackPath = path.join(missionRoot, 'repo-pack.json');

  if (!fs.existsSync(instancePath) || !fs.existsSync(repoPackPath)) {
    throw new Error(`mission artifacts not found for ${missionId}`);
  }

  const instance = readJson(instancePath);
  const repoPack = readJson(repoPackPath);
  const generatedAt = new Date().toISOString();
  const scanner = createScanner(generatedAt);

  const intakeRoot = path.join(missionRoot, 'intake');
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
    missionId,
    generatedAt,
    scanner,
    repos,
  };

  const provenance = {
    schemaVersion: '0.1',
    missionId,
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
    repoIntakeRef: path.relative(missionRoot, repoIntakePath),
    intakeProvenanceRef: path.relative(missionRoot, provenancePath),
  };

  writeJson(repoIntakePath, repoIntake);
  writeJson(provenancePath, provenance);
  writeJson(instancePath, updatedInstance);

  return {
    missionId,
    missionRoot,
    repoIntakePath,
    provenancePath,
  };
}

module.exports = {
  runRepoIntake,
};
