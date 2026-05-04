const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateWorkPacket } = require('./contracts');
const { createLegacyRouting, validateRoutingDecision } = require('./routing');
const { scanForSecrets } = require('./result');

const CLOSEOUT_SCHEMA_VERSION = 1;
const CLOSEOUT_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
const OUTCOMES = new Set(['completed', 'blocked', 'abandoned', 'continued']);
const NEXT_ACTIONS = new Set([
  'manual-target-review',
  'manual-base-review',
  'manual-archive-review',
  'manual-continuation-review',
  'manual-discard-review',
]);

function recordSessionCloseout({
  sessionId,
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  inputPath,
  closeoutId = createCloseoutId(),
  createdAt = new Date().toISOString(),
}) {
  assertSessionId(sessionId, 'closeout');
  assertCloseoutId(closeoutId);
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('CLOSEOUT_INPUT_REQUIRED: closeout requires --input <closeout-json>');
  }

  const sessionRoot = path.join(path.resolve(runtimeRoot), 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');
  if (!fs.existsSync(instancePath)) {
    throw new Error(`SESSION_NOT_FOUND: session artifacts not found for ${sessionId}`);
  }

  const { readSessionStatus } = require('./status');
  const status = readSessionStatus({ sessionId, runtimeRoot });
  assertCloseoutPreconditions(status);

  const rawInput = readCloseoutInput(inputPath);
  assertNoCloseoutSecrets(rawInput, 'closeout input');
  const input = parseCloseoutInput(rawInput, inputPath);

  if (input.outcome === 'completed' && status.review.state !== 'present') {
    throw new Error(`CLOSEOUT_REVIEW_MISSING: Worktree Review is required before completed closeout ${closeoutId}`);
  }

  const closeoutRef = path.posix.join('closeout', `${closeoutId}.json`);
  const closeoutPath = path.join(sessionRoot, closeoutRef);
  if (fs.existsSync(closeoutPath)) {
    throw new Error(`CLOSEOUT_EXISTS: ${closeoutId}`);
  }

  const packetRef = status.artifacts.packet.ref || 'packets/bmad-work-packet.json';
  const packet = readJson(path.join(sessionRoot, packetRef), 'CLOSEOUT_PACKET_INVALID_JSON');
  const packetValidation = validateWorkPacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`CLOSEOUT_PACKET_INVALID: ${packetValidation.errors.join('; ')}`);
  }

  const closeout = buildCloseoutArtifact({
    input,
    sessionId,
    closeoutId,
    createdAt,
    packet,
    packetRef,
    status,
  });
  const validation = validateCloseoutArtifact(closeout, { expectedSessionId: sessionId });
  if (!validation.ok) {
    throw new Error(`CLOSEOUT_INVALID: ${validation.errors.join('; ')}`);
  }
  assertNoCloseoutSecrets(JSON.stringify(closeout), 'closeout artifact');

  writeJsonAtomic(closeoutPath, closeout);
  return {
    sessionId,
    sessionRoot,
    closeoutId,
    closeoutRef,
    closeoutPath,
  };
}

function buildCloseoutArtifact({ input, sessionId, closeoutId, createdAt, packet, packetRef, status }) {
  return {
    kind: 'bmad-workspace-closeout',
    schemaVersion: CLOSEOUT_SCHEMA_VERSION,
    sessionId,
    closeoutId,
    createdAt,
    packetRef,
    routing: packet.routing || createLegacyRouting(packet),
    executorContractRef: status.executorContract?.ref || null,
    resultRefs: (status.results?.entries || [])
      .filter((entry) => entry.valid)
      .map((entry) => entry.ref)
      .sort(),
    reviewRef: status.review?.state === 'present' ? status.review.ref : null,
    outcome: input.outcome,
    nextAction: input.nextAction,
    summary: input.summary,
    ...(Array.isArray(input.evidenceRefs) ? { evidenceRefs: input.evidenceRefs } : {}),
  };
}

function readCloseoutLedger({ sessionRoot, sessionId, checks = [] }) {
  const closeoutRoot = path.join(sessionRoot, 'closeout');
  const ledger = {
    state: 'none',
    ref: 'closeout',
    path: closeoutRoot,
    count: 0,
    latest: null,
    entries: [],
  };

  if (!fs.existsSync(closeoutRoot)) {
    return ledger;
  }

  const stat = fs.lstatSync(closeoutRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    checks.push(check('CLOSEOUT_INVALID', 'error', 'Closeout ledger path is not a directory.', closeoutRoot));
    return { ...ledger, state: 'invalid' };
  }

  const entries = fs
    .readdirSync(closeoutRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    return ledger;
  }

  let hasError = false;
  for (const entry of entries) {
    const closeoutRef = path.posix.join('closeout', entry.name);
    const closeoutPath = path.join(closeoutRoot, entry.name);
    const baseEntry = {
      closeoutId: entry.name.slice(0, -'.json'.length),
      ref: closeoutRef,
      path: closeoutPath,
      valid: false,
    };

    if (!entry.isFile() || entry.isSymbolicLink()) {
      hasError = true;
      checks.push(check('CLOSEOUT_INVALID', 'error', `${closeoutRef} is not a regular closeout file.`, closeoutPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const raw = fs.readFileSync(closeoutPath, 'utf8');
    const secretFindings = scanForSecrets(raw);
    if (secretFindings.length > 0) {
      hasError = true;
      checks.push(check('CLOSEOUT_SECRET_DETECTED', 'error', `${closeoutRef} contains ${secretFindings[0].type}.`, closeoutPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    let closeout;
    try {
      closeout = JSON.parse(raw);
    } catch (error) {
      hasError = true;
      checks.push(check('CLOSEOUT_INVALID_JSON', 'error', `${closeoutRef} is invalid JSON: ${error.message}`, closeoutPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const validation = validateCloseoutArtifact(closeout, { expectedSessionId: sessionId });
    if (!validation.ok) {
      hasError = true;
      checks.push(check('CLOSEOUT_INVALID', 'error', `${closeoutRef}: ${validation.errors.join('; ')}`, closeoutPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const validEntry = {
      closeoutId: closeout.closeoutId,
      ref: closeoutRef,
      path: closeoutPath,
      valid: true,
      createdAt: closeout.createdAt,
      outcome: closeout.outcome,
      nextAction: closeout.nextAction,
      summary: closeout.summary,
      routeWorkflow: closeout.routing.selectedWorkflow,
    };
    ledger.entries.push(validEntry);
    ledger.count++;
  }

  ledger.latest = latestCloseoutEntry(ledger.entries.filter((entry) => entry.valid));
  ledger.state = hasError ? 'invalid' : ledger.count > 0 ? 'present' : 'none';
  return ledger;
}

function validateCloseoutArtifact(closeout, options = {}) {
  const errors = [];
  if (!isObject(closeout)) {
    return invalid('closeout must be an object');
  }

  if (closeout.kind !== 'bmad-workspace-closeout') {
    errors.push('closeout.kind must be bmad-workspace-closeout');
  }
  if (closeout.schemaVersion !== CLOSEOUT_SCHEMA_VERSION) {
    errors.push(`closeout.schemaVersion must be ${CLOSEOUT_SCHEMA_VERSION}`);
  }
  requireNonEmptyString(closeout, 'sessionId', errors, 'closeout');
  requireNonEmptyString(closeout, 'closeoutId', errors, 'closeout');
  requireNonEmptyString(closeout, 'createdAt', errors, 'closeout');
  validateSessionRef(closeout.packetRef, errors, 'closeout.packetRef');
  validateNullableSessionRef(closeout.executorContractRef, errors, 'closeout.executorContractRef');
  validateNullableSessionRef(closeout.reviewRef, errors, 'closeout.reviewRef');
  if (!CLOSEOUT_ID_PATTERN.test(closeout.closeoutId || '')) {
    errors.push('closeout.closeoutId may only contain letters, numbers, dots, underscores, and dashes');
  }
  if (options.expectedSessionId && closeout.sessionId !== options.expectedSessionId) {
    errors.push(`closeout.sessionId must equal ${options.expectedSessionId}`);
  }
  validateRoutingDecision(closeout.routing, errors, 'closeout.routing');
  validateRefArray(closeout.resultRefs, errors, 'closeout.resultRefs');
  validateRefArray(closeout.evidenceRefs, errors, 'closeout.evidenceRefs', { optional: true });
  if (!OUTCOMES.has(closeout.outcome)) {
    errors.push('closeout.outcome must be completed, blocked, abandoned, or continued');
  }
  if (!NEXT_ACTIONS.has(closeout.nextAction)) {
    errors.push('closeout.nextAction must be a manual next-action value');
  }
  requireNonEmptyString(closeout, 'summary', errors, 'closeout');
  return resultFromErrors(errors);
}

function assertCloseoutPreconditions(status) {
  const codes = new Set(status.checks.map((item) => item.code));
  if (codes.has('WORK_PACKET_MISSING')) {
    throw new Error('CLOSEOUT_PACKET_MISSING: create a valid BMAD Work Packet before recording closeout');
  }
  if (
    [...codes].some(
      (code) => code === 'WORK_PACKET_INVALID_JSON' || code === 'WORK_PACKET_SCHEMA_INVALID' || code === 'WORK_PACKET_SCHEMA_UNSUPPORTED',
    )
  ) {
    throw new Error('CLOSEOUT_PACKET_INVALID: create a valid BMAD Work Packet before recording closeout');
  }
  if (['declared-missing', 'invalid'].includes(status.executorContract?.state)) {
    throw new Error(`EXECUTOR_CONTRACT_INVALID: executor contract is ${status.executorContract.state} for ${status.sessionId}`);
  }
}

function readCloseoutInput(inputPath) {
  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`CLOSEOUT_INPUT_NOT_FOUND: ${resolvedInputPath}`);
  }
  if (!fs.statSync(resolvedInputPath).isFile()) {
    throw new Error(`CLOSEOUT_INPUT_NOT_FOUND: ${resolvedInputPath} is not a file`);
  }
  return fs.readFileSync(resolvedInputPath, 'utf8');
}

function parseCloseoutInput(rawInput, inputPath) {
  try {
    return JSON.parse(rawInput);
  } catch (error) {
    throw new Error(`CLOSEOUT_INPUT_INVALID_JSON: ${path.resolve(inputPath)}: ${error.message}`);
  }
}

function assertNoCloseoutSecrets(content, label) {
  const findings = scanForSecrets(content);
  if (findings.length > 0) {
    throw new Error(`CLOSEOUT_SECRET_DETECTED: ${label} contains ${findings[0].type}`);
  }
}

function createCloseoutId() {
  const stamp = new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `closeout-${stamp}-${suffix}`;
}

function assertSessionId(sessionId, commandName) {
  if (!sessionId || !CLOSEOUT_ID_PATTERN.test(sessionId)) {
    throw new Error(`SESSION_NOT_FOUND: ${commandName} requires a valid session id`);
  }
}

function assertCloseoutId(closeoutId) {
  if (typeof closeoutId !== 'string' || !CLOSEOUT_ID_PATTERN.test(closeoutId)) {
    throw new Error('CLOSEOUT_ID_UNSAFE: closeout id may only contain letters, numbers, dots, underscores, and dashes');
  }
}

function validateRefArray(refs, errors, label, options = {}) {
  if (refs === undefined && options.optional) {
    return;
  }
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
    errors.push(`${label} must be a safe session-relative POSIX path`);
  }
}

function isSafeSessionRef(ref) {
  return typeof ref === 'string' && ref.trim() !== '' && !path.isAbsolute(ref) && !ref.includes('\\') && !ref.split('/').includes('..');
}

function latestCloseoutEntry(entries) {
  if (entries.length === 0) {
    return null;
  }
  return [...entries].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt) || right.closeoutId.localeCompare(left.closeoutId),
  )[0];
}

function readJson(filePath, code = 'CLOSEOUT_INVALID_JSON') {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${code}: ${filePath}: ${error.message}`);
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

function check(code, severity, message, checkPath) {
  return {
    code,
    severity,
    message,
    ...(checkPath ? { path: checkPath } : {}),
  };
}

function requireNonEmptyString(object, field, errors, label) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}.${field} must be a non-empty string`);
  }
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
  CLOSEOUT_SCHEMA_VERSION,
  recordSessionCloseout,
  readCloseoutLedger,
  validateCloseoutArtifact,
};
