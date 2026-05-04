const fs = require('node:fs');
const path = require('node:path');
const { FORBIDDEN_EXECUTOR_ACTIONS } = require('./executor-contract');

const REVIEW_MANIFEST_SCHEMA_VERSION = 1;
const REVIEW_MANIFEST_REF = 'review/review-manifest.json';
const REVIEW_MANIFEST_KIND = 'bmad-workspace-review-manifest';
const REVIEW_MANIFEST_FORBIDDEN_ACTIONS = Object.freeze([
  ...new Set([
    ...FORBIDDEN_EXECUTOR_ACTIONS,
    'execute',
    'restore',
    'replay',
    'merge',
    'promotion',
    'schedule',
    'watch',
    'fetch',
    'live-adapter-activation',
  ]),
]);
const CHECK_STATUSES = new Set(['pass', 'fail', 'warn', 'not_applicable']);
const FINDING_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);
const FINDING_OWNERS = new Set(['human', 'agent', 'unknown']);
const FINDING_STATUSES = new Set(['open', 'accepted', 'resolved', 'deferred']);
const DECISION_STATUSES = new Set(['ready', 'blocked', 'needs_human_review']);

function buildReviewManifest({ sessionId, sessionRoot, summary, createdAt = new Date().toISOString() }) {
  const summaryRef = 'review/summary.json';
  const resultRefs = listJsonRefs(sessionRoot, 'results');
  const closeoutRefs = listJsonRefs(sessionRoot, 'closeout');
  const patchRefs = (summary.repos || [])
    .map((repo) => toSessionRef(sessionRoot, repo.patchPath))
    .filter(Boolean)
    .sort();
  const statusRefs = (summary.repos || [])
    .map((repo) => toSessionRef(sessionRoot, repo.statusPath))
    .filter(Boolean)
    .sort();

  const sourceRefs = {
    packet: existingRef(sessionRoot, 'packets/bmad-work-packet.json'),
    executorContract: existingRef(sessionRoot, 'packets/executor-contract.json'),
    capabilityContract: existingRef(sessionRoot, 'capabilities.json'),
    resultLedger: resultRefs.length > 0 ? 'results' : null,
    reviewSummary: existingRef(sessionRoot, summaryRef),
    reviewManifest: REVIEW_MANIFEST_REF,
    closeout: closeoutRefs.at(-1) || null,
    evidenceIndex: null,
    archive: null,
    archiveDiff: null,
  };

  const checks = [
    check('review-summary-present', sourceRefs.reviewSummary ? 'pass' : 'fail', [summaryRef], 'Worktree Review summary is present.'),
    check(
      'packet-present',
      sourceRefs.packet ? 'pass' : 'warn',
      compact([sourceRefs.packet || 'packets/bmad-work-packet.json']),
      sourceRefs.packet ? 'BMAD Work Packet is present.' : 'BMAD Work Packet is not present.',
    ),
    check(
      'executor-contract-present',
      sourceRefs.executorContract ? 'pass' : 'warn',
      compact([sourceRefs.executorContract || 'packets/executor-contract.json']),
      sourceRefs.executorContract ? 'Executor Contract is present.' : 'Executor Contract is not present.',
    ),
    check(
      'result-ledger-present',
      resultRefs.length > 0 ? 'pass' : 'not_applicable',
      resultRefs,
      resultRefs.length > 0 ? 'Result Ledger artifacts are present.' : 'No Result Ledger artifacts recorded.',
    ),
    check(
      'closeout-present',
      closeoutRefs.length > 0 ? 'pass' : 'not_applicable',
      closeoutRefs,
      closeoutRefs.length > 0 ? 'Manual Closeout artifacts are present.' : 'No Manual Closeout artifacts recorded.',
    ),
    check(
      'worktree-clean',
      summary.clean === true ? 'pass' : 'warn',
      compact([summaryRef, ...statusRefs, ...patchRefs]),
      summary.clean === true ? 'All reviewed worktrees are clean.' : 'Worktree Review captured changed files for manual inspection.',
    ),
    check(
      'forbidden-actions-declared',
      'pass',
      [REVIEW_MANIFEST_REF],
      'Review Manifest declares forbidden execution, restore, replay, merge, promotion, scheduling, watching, fetching, and adapter actions.',
    ),
  ];

  const findings = [];
  const changedRepos = (summary.repos || []).filter((repo) => repo.clean === false);
  if (changedRepos.length > 0) {
    findings.push({
      id: 'worktree-changes-present',
      severity: 'info',
      title: 'Worktree changes present',
      body: 'Worktree Review captured changed files for manual inspection.',
      evidenceRefs: compact([summaryRef, ...statusRefs, ...patchRefs]),
      owner: 'human',
      status: 'open',
    });
  }

  return {
    kind: REVIEW_MANIFEST_KIND,
    schemaVersion: REVIEW_MANIFEST_SCHEMA_VERSION,
    sessionId,
    reviewId: createReviewId(createdAt),
    createdAt,
    createdBy: 'manual',
    sourceRefs,
    capabilities: {
      allowed: ['read-session-artifact', 'read-git-worktree-status', 'write-review-artifact', 'write-review-patch'],
      forbidden: [...REVIEW_MANIFEST_FORBIDDEN_ACTIONS],
    },
    checks,
    findings,
    decision: deriveDecision({ checks, findings }),
  };
}

function readReviewManifestStatus({ sessionRoot, sessionId, checks = [], warnWhenMissing = false }) {
  const manifestPath = path.join(sessionRoot, REVIEW_MANIFEST_REF);
  const base = {
    state: 'missing',
    present: false,
    valid: false,
    ref: REVIEW_MANIFEST_REF,
    path: manifestPath,
  };

  if (!fs.existsSync(manifestPath)) {
    if (warnWhenMissing) {
      checks.push(checkStatus('REVIEW_MANIFEST_MISSING', 'warning', 'Review Manifest has not been created.', manifestPath));
    }
    return base;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    checks.push(
      checkStatus('REVIEW_MANIFEST_INVALID_JSON', 'error', `${REVIEW_MANIFEST_REF} is invalid JSON: ${error.message}`, manifestPath),
    );
    return { ...base, state: 'invalid', present: true };
  }

  const validation = validateReviewManifest(manifest, { expectedSessionId: sessionId });
  if (!validation.ok) {
    checks.push(checkStatus('REVIEW_MANIFEST_INVALID', 'error', `${REVIEW_MANIFEST_REF}: ${validation.errors.join('; ')}`, manifestPath));
    return { ...base, state: 'invalid', present: true };
  }

  return {
    ...base,
    state: 'valid',
    present: true,
    valid: true,
    reviewId: manifest.reviewId,
    createdAt: manifest.createdAt,
    decision: manifest.decision,
    findingCount: manifest.findings.length,
  };
}

function validateReviewManifest(manifest, options = {}) {
  const errors = [];
  if (!isObject(manifest)) {
    return invalid('reviewManifest must be an object');
  }
  if (manifest.kind !== REVIEW_MANIFEST_KIND) {
    errors.push(`reviewManifest.kind must be ${REVIEW_MANIFEST_KIND}`);
  }
  if (manifest.schemaVersion !== REVIEW_MANIFEST_SCHEMA_VERSION) {
    errors.push(`reviewManifest.schemaVersion must be ${REVIEW_MANIFEST_SCHEMA_VERSION}`);
  }
  requireNonEmptyString(manifest, 'sessionId', errors, 'reviewManifest');
  requireNonEmptyString(manifest, 'reviewId', errors, 'reviewManifest');
  requireNonEmptyString(manifest, 'createdAt', errors, 'reviewManifest');
  if (options.expectedSessionId && manifest.sessionId !== options.expectedSessionId) {
    errors.push(`reviewManifest.sessionId must equal ${options.expectedSessionId}`);
  }
  if (!['manual', 'agent'].includes(manifest.createdBy)) {
    errors.push('reviewManifest.createdBy must be manual or agent');
  }
  validateSourceRefs(manifest.sourceRefs, errors);
  validateCapabilities(manifest.capabilities, errors);
  validateChecks(manifest.checks, errors);
  validateFindings(manifest.findings, errors);
  validateDecision(manifest.decision, errors);
  return resultFromErrors(errors);
}

function validateSourceRefs(sourceRefs, errors) {
  if (!isObject(sourceRefs)) {
    errors.push('reviewManifest.sourceRefs must be an object');
    return;
  }
  for (const field of [
    'packet',
    'executorContract',
    'capabilityContract',
    'resultLedger',
    'reviewSummary',
    'reviewManifest',
    'closeout',
    'evidenceIndex',
    'archive',
    'archiveDiff',
  ]) {
    validateNullableSessionRef(sourceRefs[field], errors, `reviewManifest.sourceRefs.${field}`);
  }
}

function validateCapabilities(capabilities, errors) {
  if (!isObject(capabilities)) {
    errors.push('reviewManifest.capabilities must be an object');
    return;
  }
  validateStringArray(capabilities.allowed, errors, 'reviewManifest.capabilities.allowed');
  validateStringArray(capabilities.forbidden, errors, 'reviewManifest.capabilities.forbidden');
  for (const action of REVIEW_MANIFEST_FORBIDDEN_ACTIONS) {
    if (!Array.isArray(capabilities.forbidden) || !capabilities.forbidden.includes(action)) {
      errors.push(`reviewManifest.capabilities.forbidden must include ${action}`);
    }
  }
}

function validateChecks(checks, errors) {
  if (!Array.isArray(checks)) {
    errors.push('reviewManifest.checks must be an array');
    return;
  }
  for (const [index, check] of checks.entries()) {
    const label = `reviewManifest.checks[${index}]`;
    if (!isObject(check)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    requireNonEmptyString(check, 'id', errors, label);
    requireNonEmptyString(check, 'message', errors, label);
    if (!CHECK_STATUSES.has(check.status)) {
      errors.push(`${label}.status must be pass, fail, warn, or not_applicable`);
    }
    validateRefArray(check.evidenceRefs, errors, `${label}.evidenceRefs`);
  }
}

function validateFindings(findings, errors) {
  if (!Array.isArray(findings)) {
    errors.push('reviewManifest.findings must be an array');
    return;
  }
  for (const [index, finding] of findings.entries()) {
    const label = `reviewManifest.findings[${index}]`;
    if (!isObject(finding)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of ['id', 'title', 'body']) {
      requireNonEmptyString(finding, field, errors, label);
    }
    if (!FINDING_SEVERITIES.has(finding.severity)) {
      errors.push(`${label}.severity must be critical, high, medium, low, or info`);
    }
    if (!FINDING_OWNERS.has(finding.owner)) {
      errors.push(`${label}.owner must be human, agent, or unknown`);
    }
    if (!FINDING_STATUSES.has(finding.status)) {
      errors.push(`${label}.status must be open, accepted, resolved, or deferred`);
    }
    validateRefArray(finding.evidenceRefs, errors, `${label}.evidenceRefs`);
  }
}

function validateDecision(decision, errors) {
  if (!isObject(decision)) {
    errors.push('reviewManifest.decision must be an object');
    return;
  }
  if (!DECISION_STATUSES.has(decision.status)) {
    errors.push('reviewManifest.decision.status must be ready, blocked, or needs_human_review');
  }
  requireNonEmptyString(decision, 'reason', errors, 'reviewManifest.decision');
}

function deriveDecision({ checks, findings }) {
  if (checks.some((item) => item.status === 'fail')) {
    return {
      status: 'blocked',
      reason: 'Review Manifest contains failing checks.',
    };
  }
  if (findings.some((item) => item.status === 'open')) {
    return {
      status: 'needs_human_review',
      reason: 'Review Manifest contains open findings for manual inspection.',
    };
  }
  return {
    status: 'ready',
    reason: 'Review Manifest has no failing checks or open findings.',
  };
}

function listJsonRefs(sessionRoot, relativeDir) {
  const root = path.join(sessionRoot, relativeDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.posix.join(relativeDir, entry.name))
    .sort();
}

function existingRef(sessionRoot, ref) {
  return fs.existsSync(path.join(sessionRoot, ref)) ? ref : null;
}

function toSessionRef(sessionRoot, candidatePath) {
  if (!candidatePath || typeof candidatePath !== 'string') {
    return null;
  }
  if (!path.isAbsolute(candidatePath)) {
    return toPosix(candidatePath);
  }
  const relative = path.relative(sessionRoot, candidatePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return toPosix(relative);
}

function createReviewId(createdAt) {
  const stamp = String(createdAt)
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  return `review-${stamp}`;
}

function check(id, status, evidenceRefs, message) {
  return {
    id,
    status,
    evidenceRefs,
    message,
  };
}

function checkStatus(code, severity, message, checkPath) {
  return {
    code,
    severity,
    message,
    ...(checkPath ? { path: checkPath } : {}),
  };
}

function validateRefArray(refs, errors, label) {
  if (!Array.isArray(refs)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const [index, ref] of refs.entries()) {
    validateSessionRef(ref, errors, `${label}[${index}]`);
  }
}

function validateNullableSessionRef(ref, errors, label) {
  if (ref === null) {
    return;
  }
  validateSessionRef(ref, errors, label);
}

function validateSessionRef(ref, errors, label) {
  if (!isSafeSessionRef(ref)) {
    errors.push(`${label} must be a safe session-relative POSIX path or null`);
  }
}

function isSafeSessionRef(ref) {
  return typeof ref === 'string' && ref.trim() !== '' && !path.isAbsolute(ref) && !ref.includes('\\') && !ref.split('/').includes('..');
}

function validateStringArray(values, errors, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || value.trim() === '')) {
    errors.push(`${label} must be an array of non-empty strings`);
  }
}

function requireNonEmptyString(object, field, errors, label) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}.${field} must be a non-empty string`);
  }
}

function compact(values) {
  return values.filter(Boolean);
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function invalid(error) {
  return { ok: false, errors: [error] };
}

function resultFromErrors(errors) {
  return {
    ok: errors.length === 0,
    errors,
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  REVIEW_MANIFEST_FORBIDDEN_ACTIONS,
  REVIEW_MANIFEST_KIND,
  REVIEW_MANIFEST_REF,
  REVIEW_MANIFEST_SCHEMA_VERSION,
  buildReviewManifest,
  readReviewManifestStatus,
  validateReviewManifest,
};
