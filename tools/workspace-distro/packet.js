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
    throw new Error('packet requires a valid mission id');
  }
}

function missingIntake(missionId) {
  throw new Error(`missing-intake: run workspace intake ${missionId} before packet`);
}

function validatePacketReadiness({ missionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertMissionId(missionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const missionRoot = path.join(resolvedRuntimeRoot, 'missions', missionId);
  const instancePath = path.join(missionRoot, 'instance.json');

  if (!fs.existsSync(instancePath)) {
    throw new Error(`mission artifacts not found for ${missionId}`);
  }

  const instance = readJson(instancePath);
  if (!instance.repoIntakeRef) {
    missingIntake(missionId);
  }

  const repoIntakePath = path.join(missionRoot, instance.repoIntakeRef);
  if (!fs.existsSync(repoIntakePath)) {
    missingIntake(missionId);
  }

  const repoIntake = readJson(repoIntakePath);
  for (const repo of repoIntake.repos || []) {
    const currentHead = git(['rev-parse', 'HEAD'], repo.sourcePath);
    if (currentHead !== repo.head) {
      throw new Error(
        `stale-intake: ${repo.id} is at ${currentHead} but intake recorded ${repo.head}; rerun workspace intake ${missionId}`,
      );
    }
  }

  return {
    missionId,
    missionRoot,
    repoIntakePath,
    status: 'fresh-intake',
  };
}

module.exports = {
  validatePacketReadiness,
};
