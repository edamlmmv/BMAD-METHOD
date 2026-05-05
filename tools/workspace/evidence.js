const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { nextManualActionForCode } = require('./next-action');
const { readSessionStatus } = require('./status');

const EVIDENCE_SCHEMA_VERSION = 1;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

function readEvidenceIndex({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT, generatedAt = new Date().toISOString() }) {
  assertSessionId(sessionId);

  const status = readSessionStatus({ sessionId, runtimeRoot });
  const checks = normalizeChecks(status);
  const artifacts = collectEvidenceArtifacts({ status, checks });

  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    sessionId,
    sessionRoot: status.sessionRoot,
    generatedAt,
    state: deriveEvidenceState(checks),
    evidenceGates: status.evidenceGates || { state: 'not-applicable', gates: [] },
    artifacts,
    checks,
  };
}

function validateEvidenceIndex(evidence, options = {}) {
  const errors = [];
  if (!isObject(evidence)) {
    return invalid('evidence index must be an object');
  }
  if (evidence.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    errors.push(`evidence.schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`);
  }
  requireString(evidence, 'sessionId', errors, 'evidence');
  requireString(evidence, 'sessionRoot', errors, 'evidence');
  requireString(evidence, 'generatedAt', errors, 'evidence');
  if (options.expectedSessionId && evidence.sessionId !== options.expectedSessionId) {
    errors.push(`evidence.sessionId must equal ${options.expectedSessionId}`);
  }
  if (!['complete', 'warning', 'invalid'].includes(evidence.state)) {
    errors.push('evidence.state must be complete, warning, or invalid');
  }
  validateArtifacts(evidence.artifacts, errors);
  validateChecks(evidence.checks, errors);
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

function collectEvidenceArtifacts({ status, checks }) {
  const artifacts = [];
  const seen = new Set();
  const add = (artifact) => {
    if (!artifact.ref || seen.has(`${artifact.stage}:${artifact.ref}`)) {
      return;
    }
    seen.add(`${artifact.stage}:${artifact.ref}`);
    artifacts.push(enrichArtifact({ artifact, status, checks }));
  };

  add({ stage: 'launch', kind: 'instance', ref: 'instance.json', sourceCommand: 'bmad workspace launch' });
  add({ stage: 'launch', kind: 'repo-pack', ref: 'repo-pack.json', sourceCommand: 'bmad workspace launch' });
  add({ stage: 'launch', kind: 'grants', ref: 'grants.json', sourceCommand: 'bmad workspace launch' });
  add({
    stage: 'intake',
    kind: 'repo-intake',
    ref: status.artifacts.intake.ref || 'intake/repo-intake.json',
    sourceCommand: 'bmad workspace intake',
  });
  add({
    stage: 'intake',
    kind: 'graph-evidence',
    ref: status.artifacts.graphEvidence.ref || status.intake.graphEvidenceRef || 'intake/graph.json',
    sourceCommand: 'bmad workspace intake',
  });
  add({ stage: 'packet', kind: 'work-packet', ref: 'packets/bmad-work-packet.json', sourceCommand: 'bmad workspace packet' });
  add({ stage: 'packet', kind: 'capability-contract', ref: 'capabilities.json', sourceCommand: 'bmad workspace packet' });
  add({ stage: 'packet', kind: 'rendered-prompt', ref: 'packets/rendered-prompt.md', sourceCommand: 'bmad workspace packet' });
  add({
    stage: 'packet',
    kind: 'executor-contract',
    ref: status.executorContract?.ref || 'packets/executor-contract.json',
    sourceCommand: 'bmad workspace packet',
  });

  for (const result of status.results?.entries || []) {
    add({ stage: 'result', kind: 'result', ref: result.ref, sourceCommand: 'bmad workspace result' });
  }

  add({ stage: 'review', kind: 'review-summary', ref: 'review/summary.json', sourceCommand: 'bmad workspace review' });
  add({ stage: 'review', kind: 'review-manifest', ref: 'review/review-manifest.json', sourceCommand: 'bmad workspace review' });
  const review = readOptionalJson(path.join(status.sessionRoot, 'review/summary.json'));
  for (const repo of review?.repos || []) {
    add({
      stage: 'review',
      kind: 'review-status',
      ref: toSessionRef(status.sessionRoot, repo.statusPath),
      sourceCommand: 'bmad workspace review',
    });
    add({
      stage: 'review',
      kind: 'review-patch',
      ref: toSessionRef(status.sessionRoot, repo.patchPath),
      sourceCommand: 'bmad workspace review',
    });
  }

  for (const closeout of status.closeout?.entries || []) {
    add({ stage: 'closeout', kind: 'closeout', ref: closeout.ref, sourceCommand: 'bmad workspace closeout' });
  }

  return artifacts.sort((left, right) => left.stage.localeCompare(right.stage) || left.ref.localeCompare(right.ref));
}

function enrichArtifact({ artifact, status, checks }) {
  const artifactPath = path.join(status.sessionRoot, artifact.ref);
  const stat = safeStat(artifactPath);
  const relatedChecks = checks.filter((item) => item.ref === artifact.ref || item.path === artifactPath);
  const validationState = artifactValidationState({ present: Boolean(stat), relatedChecks });
  return {
    stage: artifact.stage,
    kind: artifact.kind,
    ref: artifact.ref,
    present: Boolean(stat),
    validationState,
    sha256: stat?.isFile() ? sha256File(artifactPath) : null,
    bytes: stat?.isFile() ? stat.size : null,
    sourceCommand: artifact.sourceCommand,
  };
}

function normalizeChecks(status) {
  return (status.checks || []).map((item) => {
    const ref = item.path ? toSessionRef(status.sessionRoot, item.path) : item.ref || null;
    return {
      code: item.code,
      severity: item.severity,
      message: item.message,
      ref,
      ...(item.path ? { path: item.path } : {}),
      nextManualAction:
        item.nextManualAction || nextManualActionForCode(item.code, { sessionId: status.sessionId, runtimeRoot: status.runtimeRoot }),
    };
  });
}

function artifactValidationState({ present, relatedChecks }) {
  if (!present) {
    return 'missing';
  }
  if (relatedChecks.some((item) => item.severity === 'error')) {
    return 'invalid';
  }
  if (relatedChecks.some((item) => item.severity === 'warning')) {
    return 'warning';
  }
  return 'valid';
}

function deriveEvidenceState(checks) {
  if (checks.some((item) => item.severity === 'error')) {
    return 'invalid';
  }
  if (checks.some((item) => item.severity === 'warning')) {
    return 'warning';
  }
  return 'complete';
}

function validateArtifacts(artifacts, errors) {
  if (!Array.isArray(artifacts)) {
    errors.push('evidence.artifacts must be an array');
    return;
  }
  for (const [index, artifact] of artifacts.entries()) {
    const label = `evidence.artifacts[${index}]`;
    if (!isObject(artifact)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of ['stage', 'kind', 'ref', 'validationState', 'sourceCommand']) {
      requireString(artifact, field, errors, label);
    }
    if (typeof artifact.present !== 'boolean') {
      errors.push(`${label}.present must be a boolean`);
    }
    if (!['valid', 'warning', 'invalid', 'missing'].includes(artifact.validationState)) {
      errors.push(`${label}.validationState must be valid, warning, invalid, or missing`);
    }
    if (artifact.sha256 !== null && (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(artifact.sha256))) {
      errors.push(`${label}.sha256 must be a SHA-256 string or null`);
    }
    if (artifact.bytes !== null && !Number.isInteger(artifact.bytes)) {
      errors.push(`${label}.bytes must be an integer or null`);
    }
  }
}

function validateChecks(checks, errors) {
  if (!Array.isArray(checks)) {
    errors.push('evidence.checks must be an array');
    return;
  }
  for (const [index, check] of checks.entries()) {
    const label = `evidence.checks[${index}]`;
    if (!isObject(check)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of ['code', 'severity', 'message', 'nextManualAction']) {
      requireString(check, field, errors, label);
    }
    if (check.ref !== null && typeof check.ref !== 'string') {
      errors.push(`${label}.ref must be a string or null`);
    }
  }
}

function toSessionRef(sessionRoot, candidatePath) {
  if (!candidatePath || typeof candidatePath !== 'string') {
    return null;
  }
  if (!path.isAbsolute(candidatePath)) {
    return candidatePath.split(path.sep).join('/');
  }
  const relative = path.relative(sessionRoot, candidatePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep).join('/');
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function readOptionalJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertSessionId(sessionId) {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error('SESSION_NOT_FOUND: evidence requires a valid session id');
  }
}

function requireString(object, field, errors, label) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}.${field} must be a non-empty string`);
  }
}

function invalid(error) {
  return { ok: false, errors: [error] };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  EVIDENCE_SCHEMA_VERSION,
  readEvidenceIndex,
  validateEvidenceIndex,
};
