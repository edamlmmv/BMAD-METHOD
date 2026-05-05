const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateWorkPacket } = require('./contracts');
const { readExecutorContractStatus } = require('./executor-contract');
const { enrichChecks } = require('./next-action');
const { readResultLedger } = require('./result');
const { readCloseoutLedger } = require('./closeout');
const { REVIEW_MANIFEST_REF, readReviewManifestStatus } = require('./review-manifest');

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

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('SESSION_NOT_FOUND: status requires a valid session id');
  }
}

function readSessionStatus({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertSessionId(sessionId);

  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');
  if (!fs.existsSync(instancePath)) {
    throw new Error(`SESSION_NOT_FOUND: session artifacts not found for ${sessionId}`);
  }

  const checks = [];
  const artifacts = {
    instance: artifactStatus(sessionRoot, 'instance.json'),
    repoPack: artifactStatus(sessionRoot, 'repo-pack.json'),
    grants: artifactStatus(sessionRoot, 'grants.json'),
    intake: { present: false },
    graphEvidence: { present: false },
    packet: artifactStatus(sessionRoot, 'packets/bmad-work-packet.json'),
    executorContract: artifactStatus(sessionRoot, 'packets/executor-contract.json'),
    review: artifactStatus(sessionRoot, 'review/summary.json'),
    reviewManifest: artifactStatus(sessionRoot, REVIEW_MANIFEST_REF),
  };

  const instance = readRequiredJson(instancePath, 'INSTANCE_INVALID_JSON');
  const repoPack = readOptionalJson(path.join(sessionRoot, 'repo-pack.json'), checks, 'REPO_PACK_INVALID_JSON');
  const grants = readOptionalJson(path.join(sessionRoot, 'grants.json'), checks, 'GRANTS_INVALID_JSON');

  const status = {
    schemaVersion: '0.1',
    sessionId,
    sessionRoot,
    runtimeRoot: resolvedRuntimeRoot,
    sessionType: instance.sessionType || 'unknown',
    status: 'blocked',
    lifecycle: Array.isArray(instance.lifecycle) ? instance.lifecycle : [],
    artifacts,
    intake: { state: 'missing', repos: [] },
    setup: { state: 'missing', entries: {} },
    routing: null,
    executorContract: { state: 'missing', present: false, valid: false },
    results: { state: 'none', count: 0, latest: null, entries: [] },
    review: { state: 'missing', clean: null, changedRepos: [], manifest: { state: 'missing', present: false, valid: false } },
    closeout: { state: 'none', count: 0, latest: null, entries: [] },
    derivedLifecycle: 'launched',
    checks,
  };

  readIntakeStatus({ instance, sessionRoot, status, checks });
  readPacketStatus({ sessionRoot, status, checks });
  readResultStatus({ sessionRoot, status, checks });
  readReviewStatus({ sessionRoot, status, checks });
  readCloseoutStatus({ sessionRoot, status, checks });
  readBaseImprovementReadiness({ instance, grants, sessionRoot, status, checks });
  status.checks = enrichChecks(status.checks, { sessionId, runtimeRoot: resolvedRuntimeRoot });
  if (status.baseImprovementReadiness) {
    status.baseImprovementReadiness.checks = enrichChecks(status.baseImprovementReadiness.checks, {
      sessionId,
      runtimeRoot: resolvedRuntimeRoot,
    });
  }

  status.status = summarizeStatus(status);
  status.derivedLifecycle = deriveLifecycle(status);
  return status;
}

function readResultStatus({ sessionRoot, status, checks }) {
  status.artifacts.results = artifactStatus(sessionRoot, 'results');
  status.results = readResultLedger({ sessionRoot, sessionId: status.sessionId, checks });
}

function readCloseoutStatus({ sessionRoot, status, checks }) {
  status.artifacts.closeout = artifactStatus(sessionRoot, 'closeout');
  status.closeout = readCloseoutLedger({ sessionRoot, sessionId: status.sessionId, checks });
}

function readRequiredJson(filePath, code) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${code}: ${filePath}: ${error.message}`);
  }
}

function readOptionalJson(filePath, checks, code) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    checks.push(check(code, 'error', `Invalid JSON: ${filePath}`, filePath));
    return null;
  }
}

function artifactStatus(sessionRoot, relativePath) {
  const absolutePath = path.join(sessionRoot, relativePath);
  return {
    present: fs.existsSync(absolutePath),
    ref: relativePath,
    path: absolutePath,
  };
}

function readIntakeStatus({ instance, sessionRoot, status, checks }) {
  if (!instance.repoIntakeRef) {
    checks.push(check('MISSING_INTAKE', 'error', 'Repo Intake has not been recorded.'));
    return;
  }

  const repoIntakePath = path.join(sessionRoot, instance.repoIntakeRef);
  status.artifacts.intake = artifactStatus(sessionRoot, instance.repoIntakeRef);
  if (!fs.existsSync(repoIntakePath)) {
    checks.push(check('MISSING_INTAKE', 'error', 'Repo Intake artifact is missing.', repoIntakePath));
    return;
  }

  const repoIntake = readOptionalJson(repoIntakePath, checks, 'INTAKE_INVALID_JSON');
  if (!repoIntake) {
    status.intake.state = 'invalid';
    return;
  }

  status.intake = {
    state: 'fresh',
    ref: instance.repoIntakeRef,
    path: repoIntakePath,
    graphEvidenceRef: repoIntake.graphEvidenceRef || null,
    graphEvidenceState: repoIntake.graphEvidenceState || 'missing',
    repos: (repoIntake.repos || []).map((repo) => ({
      id: repo.id,
      sourcePath: repo.sourcePath,
      recordedHead: repo.head,
      currentHead: null,
      stale: false,
    })),
  };
  if (repoIntake.graphEvidenceRef) {
    status.artifacts.graphEvidence = artifactStatus(sessionRoot, repoIntake.graphEvidenceRef);
  }

  for (const repo of status.intake.repos) {
    try {
      repo.currentHead = git(['rev-parse', 'HEAD'], repo.sourcePath);
      if (repo.currentHead !== repo.recordedHead) {
        repo.stale = true;
        status.intake.state = 'stale';
        checks.push(
          check('STALE_INTAKE', 'error', `${repo.id} is at ${repo.currentHead} but intake recorded ${repo.recordedHead}.`, repoIntakePath),
        );
      }
    } catch (error) {
      status.intake.state = 'invalid';
      checks.push(check('INTAKE_REPO_UNREADABLE', 'error', `${repo.id} HEAD could not be read: ${error.message}`, repo.sourcePath));
    }
  }
}

function readPacketStatus({ sessionRoot, status, checks }) {
  const packetPath = path.join(sessionRoot, 'packets/bmad-work-packet.json');
  if (!fs.existsSync(packetPath)) {
    checks.push(check('WORK_PACKET_MISSING', 'error', 'BMAD Work Packet has not been created.', packetPath));
    return;
  }

  const packet = readOptionalJson(packetPath, checks, 'WORK_PACKET_INVALID_JSON');
  if (!packet) {
    status.setup.state = 'invalid';
    return;
  }

  const validation = validateWorkPacket(packet);
  if (!validation.ok) {
    status.setup.state = 'invalid';
    for (const error of validation.errors) {
      const code = error.includes('packetVersion') ? 'WORK_PACKET_SCHEMA_UNSUPPORTED' : 'WORK_PACKET_SCHEMA_INVALID';
      checks.push(check(code, 'error', error, packetPath));
    }
    return;
  }

  status.routing = packet.routing;
  status.setup = inspectSessionSetup(packet.sessionSetup, checks);
  status.executorContract = readExecutorContractStatus({ sessionRoot, packet, checks });
  status.artifacts.executorContract = artifactStatus(sessionRoot, packet.executorContractRef);
}

function inspectSessionSetup(sessionSetup, checks) {
  const entries = {};
  let hasWarning = false;

  for (const step of ['zoomOut', 'ubiquitousLanguage', 'grillDecisions', 'tddPlan']) {
    const entry = sessionSetup[step];
    entries[step] = { ...entry };

    if (entry.status === 'skipped') {
      continue;
    }

    if (entry.refType === 'external') {
      entries[step].verification = 'external-unverified';
      hasWarning = true;
      checks.push(check('SETUP_REF_EXTERNAL_UNVERIFIED', 'warning', `${step} uses opaque external setup ref.`, entry.ref));
      continue;
    }

    const resolvedPath = stripFragment(entry.resolvedRef || entry.ref);
    if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      entries[step].verification = 'missing';
      checks.push(check('SETUP_REF_MISSING', 'error', `${step} setup ref is missing.`, entry.resolvedRef || entry.ref));
      continue;
    }

    const actualSha = sha256File(resolvedPath);
    entries[step].actualSha256 = actualSha;
    if (!entry.sha256) {
      entries[step].verification = 'missing-checksum';
      checks.push(check('SETUP_REF_CHECKSUM_MISSING', 'error', `${step} setup ref checksum is missing.`, entry.ref));
      continue;
    }
    if (actualSha !== entry.sha256) {
      entries[step].verification = 'checksum-mismatch';
      checks.push(check('SETUP_REF_CHECKSUM_MISMATCH', 'error', `${step} setup ref checksum does not match.`, entry.ref));
      continue;
    }

    entries[step].verification = 'local-verified';
  }

  const hasSetupError = checks.some((item) => item.code.startsWith('SETUP_REF_') && item.severity === 'error');
  return {
    state: hasSetupError ? 'invalid' : hasWarning ? 'mixed' : 'complete',
    entries,
  };
}

function readReviewStatus({ sessionRoot, status, checks }) {
  const reviewPath = path.join(sessionRoot, 'review/summary.json');
  if (!fs.existsSync(reviewPath)) {
    checks.push(check('REVIEW_MISSING', 'error', 'Worktree Review has not been created.', reviewPath));
    return;
  }

  const review = readOptionalJson(reviewPath, checks, 'REVIEW_INVALID_JSON');
  if (!review) {
    status.review.state = 'invalid';
    return;
  }

  status.review = {
    state: 'present',
    ref: 'review/summary.json',
    path: reviewPath,
    clean: review.clean === true,
    changedRepos: (review.repos || []).filter((repo) => repo.clean === false).map((repo) => repo.repoId),
    manifest: readReviewManifestStatus({ sessionRoot, sessionId: status.sessionId, checks, warnWhenMissing: true }),
  };
  status.artifacts.reviewManifest = artifactStatus(sessionRoot, REVIEW_MANIFEST_REF);
}

function readBaseImprovementReadiness({ instance, grants, sessionRoot, status, checks }) {
  if (instance.sessionType !== 'base-improvement') {
    return;
  }

  const readinessChecks = [];
  if (!grants || grants.baseMutationGrant !== true) {
    readinessChecks.push(check('BASE_IMPROVEMENT_NOT_READY', 'error', 'Base Mutation Grant is missing.'));
  }
  if (!grants || !Array.isArray(grants.allowedBasePaths) || grants.allowedBasePaths.length === 0) {
    readinessChecks.push(check('BASE_IMPROVEMENT_NOT_READY', 'error', 'Base Mutation Grant has no scoped allowed paths.'));
  }
  if (status.setup.state !== 'complete' && status.setup.state !== 'mixed') {
    readinessChecks.push(check('BASE_IMPROVEMENT_NOT_READY', 'error', 'Setup Gate is not complete.'));
  }
  if (status.review.state !== 'present') {
    readinessChecks.push(check('BASE_IMPROVEMENT_NOT_READY', 'error', 'Worktree Review is missing.'));
  }

  const violationRoot = path.join(sessionRoot, 'violations');
  const violationCount = fs.existsSync(violationRoot) ? fs.readdirSync(violationRoot).filter((file) => file.endsWith('.json')).length : 0;
  if (violationCount > 0) {
    readinessChecks.push(check('GRANT_VIOLATION', 'error', `${violationCount} Grant Guard violation artifact(s) exist.`, violationRoot));
  }

  checks.push(...readinessChecks);
  status.baseImprovementReadiness = {
    state: readinessChecks.length === 0 ? 'ready-for-human-review' : 'blocked',
    checks: readinessChecks,
  };
}

function summarizeStatus(status) {
  if (status.checks.some((item) => item.code.startsWith('EXECUTOR_CONTRACT_') && item.severity === 'error')) {
    return 'invalid';
  }
  if (status.checks.some((item) => item.code.includes('INVALID') || item.code.includes('UNSUPPORTED'))) {
    return 'invalid';
  }
  if (status.checks.some((item) => item.code === 'STALE_INTAKE' || item.code === 'SETUP_REF_CHECKSUM_MISMATCH')) {
    return 'stale';
  }
  if (status.checks.some((item) => item.severity === 'error')) {
    return 'blocked';
  }
  return 'ready';
}

function deriveLifecycle(status) {
  if (status.checks.some((item) => item.severity === 'error')) {
    return 'blocked';
  }
  if ((status.closeout?.count || 0) > 0) {
    return 'closeout-recorded';
  }
  if (status.review?.state === 'present') {
    return 'review-recorded';
  }
  if ((status.results?.count || 0) > 0) {
    return 'result-recorded';
  }
  if (status.executorContract?.state === 'valid') {
    return 'executor-ready';
  }
  if (status.artifacts.packet?.present && status.setup?.state !== 'invalid') {
    return 'packet-ready';
  }
  if (status.intake?.state === 'fresh') {
    return 'intake-recorded';
  }
  return 'launched';
}

function check(code, severity, message, checkPath) {
  return {
    code,
    severity,
    message,
    ...(checkPath ? { path: checkPath } : {}),
  };
}

function stripFragment(value) {
  if (!value) {
    return value;
  }
  const hashIndex = value.indexOf('#');
  return hashIndex === -1 ? value : value.slice(0, hashIndex);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

module.exports = {
  readSessionStatus,
};
