const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');

const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

function listSessions({ runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionsRoot = path.join(resolvedRuntimeRoot, 'sessions');
  const inventory = {
    schemaVersion: 1,
    runtimeRoot: resolvedRuntimeRoot,
    sessionsRoot,
    sessions: [],
    errors: [],
  };

  if (!fs.existsSync(resolvedRuntimeRoot)) {
    return inventory;
  }

  assertReadableDirectory(resolvedRuntimeRoot);

  if (!fs.existsSync(sessionsRoot)) {
    return inventory;
  }

  assertReadableDirectory(sessionsRoot);

  const entries = fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

  inventory.sessions = entries.map((entry) => readSessionInventory(sessionsRoot, entry));
  return inventory;
}

function assertReadableDirectory(directoryPath) {
  let stat;
  try {
    stat = fs.lstatSync(directoryPath);
    fs.accessSync(directoryPath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`RUNTIME_ROOT_UNREADABLE: ${directoryPath}: ${error.message}`);
  }

  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`RUNTIME_ROOT_UNREADABLE: ${directoryPath} is not a readable directory`);
  }
}

function readSessionInventory(sessionsRoot, entry) {
  const sessionId = entry.name;
  const sessionRoot = path.join(sessionsRoot, sessionId);
  const checks = [];
  const session = {
    sessionId,
    sessionRoot,
    sessionType: 'unknown',
    createdAt: null,
    status: 'invalid',
    valid: false,
    artifacts: createArtifactMap(sessionRoot),
    checks,
  };

  if (!SESSION_ID_PATTERN.test(sessionId)) {
    checks.push(check('SESSION_INVALID', 'error', 'Session id contains unsupported characters.', sessionRoot));
    return session;
  }

  if (entry.isSymbolicLink()) {
    checks.push(check('SESSION_INVALID', 'error', 'Session entry is a symlink and was not followed.', sessionRoot));
    return session;
  }

  if (!entry.isDirectory()) {
    checks.push(check('SESSION_INVALID', 'error', 'Session entry is not a directory.', sessionRoot));
    return session;
  }

  const instancePath = path.join(sessionRoot, 'instance.json');
  if (!fs.existsSync(instancePath)) {
    checks.push(check('SESSION_INVALID', 'error', 'Session instance.json is missing.', instancePath));
    return session;
  }

  let instance;
  try {
    instance = JSON.parse(fs.readFileSync(instancePath, 'utf8'));
  } catch (error) {
    checks.push(check('SESSION_INVALID', 'error', `Session instance.json is invalid JSON: ${error.message}`, instancePath));
    return session;
  }

  session.sessionType = instance.sessionType || 'unknown';
  session.createdAt = instance.createdAt || null;
  session.artifacts = createArtifactMap(sessionRoot, instance);
  session.valid = true;
  session.status = 'valid';
  return session;
}

function createArtifactMap(sessionRoot, instance = {}) {
  return {
    instance: artifactStatus(sessionRoot, 'instance.json'),
    repoPack: artifactStatus(sessionRoot, instance.repoPackRef || 'repo-pack.json'),
    grants: artifactStatus(sessionRoot, instance.grantsRef || 'grants.json'),
    intake: artifactStatus(sessionRoot, instance.repoIntakeRef || 'intake/repo-intake.json'),
    packet: artifactStatus(sessionRoot, instance.packetRef || 'packets/bmad-work-packet.json'),
    review: artifactStatus(sessionRoot, instance.reviewRef || 'review/summary.json'),
  };
}

function artifactStatus(sessionRoot, relativePath) {
  const absolutePath = path.join(sessionRoot, relativePath);
  return {
    present: fs.existsSync(absolutePath),
    ref: relativePath,
    path: absolutePath,
  };
}

function check(code, severity, message, checkPath) {
  return {
    code,
    severity,
    message,
    ...(checkPath ? { path: checkPath } : {}),
  };
}

module.exports = {
  listSessions,
};
