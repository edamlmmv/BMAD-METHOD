const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateWorkPacket } = require('./contracts');
const { validateRoutingDecision } = require('./routing');

const RESULT_SCHEMA_VERSION = 1;
const RESULT_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
const OUTCOMES = new Set(['succeeded', 'failed', 'blocked']);

const SECRET_PATTERNS = [
  { id: 'aws-access-key-id', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g },
  { id: 'openai-api-key', pattern: /\bsk(?:-proj)?-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
];

function recordSessionResult({
  sessionId,
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  inputPath,
  resultId = createResultId(),
  createdAt = new Date().toISOString(),
}) {
  assertSessionId(sessionId, 'result');
  assertResultId(resultId);

  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('RESULT_INPUT_REQUIRED: result requires --input <result-json>');
  }

  const sessionRoot = path.join(path.resolve(runtimeRoot), 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');
  if (!fs.existsSync(instancePath)) {
    throw new Error(`SESSION_NOT_FOUND: session artifacts not found for ${sessionId}`);
  }

  const instance = readJson(instancePath, 'RESULT_SESSION_INVALID_JSON');
  const packetRef = instance.packetRef || 'packets/bmad-work-packet.json';
  const packetPath = path.join(sessionRoot, packetRef);
  if (!fs.existsSync(packetPath)) {
    throw new Error(`RESULT_PACKET_MISSING: create a valid BMAD Work Packet before recording result ${resultId}`);
  }

  const packet = readJson(packetPath, 'RESULT_PACKET_INVALID_JSON');
  const packetValidation = validateWorkPacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`RESULT_PACKET_INVALID: ${packetValidation.errors.join('; ')}`);
  }

  const rawInput = readResultInput(inputPath);
  assertNoSecrets(rawInput, 'result input');
  const input = parseResultInput(rawInput, inputPath);

  const resultRef = path.posix.join('results', `${resultId}.json`);
  const resultPath = path.join(sessionRoot, resultRef);
  if (fs.existsSync(resultPath)) {
    throw new Error(`RESULT_EXISTS: ${resultId}`);
  }

  const result = buildResultArtifact({
    input,
    sessionId,
    resultId,
    createdAt,
    packet,
    packetRef,
  });
  const validation = validateResultArtifact(result, { expectedSessionId: sessionId });
  if (!validation.ok) {
    throw new Error(`RESULT_INVALID: ${validation.errors.join('; ')}`);
  }
  assertNoSecrets(JSON.stringify(result), 'result artifact');

  writeJsonAtomic(resultPath, result);
  writeJsonAtomic(instancePath, {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'result'])],
    resultRefs: [...new Set([...(instance.resultRefs || []), resultRef])],
  });

  return {
    sessionId,
    sessionRoot,
    resultId,
    resultRef,
    resultPath,
  };
}

function buildResultArtifact({ input, sessionId, resultId, createdAt, packet, packetRef }) {
  return {
    kind: 'bmad-workspace-result',
    schemaVersion: RESULT_SCHEMA_VERSION,
    sessionId,
    resultId,
    createdAt,
    packetRef,
    renderedPromptRef: packet.renderedPromptRef || null,
    routing: packet.routing,
    outcome: input.outcome,
    summary: input.summary,
    ...(Array.isArray(input.commands) ? { commands: input.commands } : {}),
    ...(Array.isArray(input.evidenceRefs) ? { evidenceRefs: input.evidenceRefs } : {}),
    ...(isObject(input.failure) ? { failure: input.failure } : {}),
  };
}

function readResultLedger({ sessionRoot, sessionId, checks = [] }) {
  const resultsRoot = path.join(sessionRoot, 'results');
  const ledger = {
    state: 'none',
    ref: 'results',
    path: resultsRoot,
    count: 0,
    latest: null,
    entries: [],
  };

  if (!fs.existsSync(resultsRoot)) {
    return ledger;
  }

  const stat = fs.lstatSync(resultsRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    checks.push(check('RESULT_INVALID', 'error', 'Result ledger path is not a directory.', resultsRoot));
    return { ...ledger, state: 'invalid' };
  }

  const entries = fs
    .readdirSync(resultsRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    return ledger;
  }

  let hasError = false;
  for (const entry of entries) {
    const resultRef = path.posix.join('results', entry.name);
    const resultPath = path.join(resultsRoot, entry.name);
    const baseEntry = {
      resultId: entry.name.slice(0, -'.json'.length),
      ref: resultRef,
      path: resultPath,
      valid: false,
    };

    if (!entry.isFile() || entry.isSymbolicLink()) {
      hasError = true;
      checks.push(check('RESULT_INVALID', 'error', `${resultRef} is not a regular result file.`, resultPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const raw = fs.readFileSync(resultPath, 'utf8');
    const secretFindings = scanForSecrets(raw);
    if (secretFindings.length > 0) {
      hasError = true;
      checks.push(check('RESULT_SECRET_DETECTED', 'error', `${resultRef} contains ${secretFindings[0].type}.`, resultPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    let result;
    try {
      result = JSON.parse(raw);
    } catch (error) {
      hasError = true;
      checks.push(check('RESULT_INVALID_JSON', 'error', `${resultRef} is invalid JSON: ${error.message}`, resultPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const validation = validateResultArtifact(result, { expectedSessionId: sessionId });
    if (!validation.ok) {
      hasError = true;
      checks.push(check('RESULT_INVALID', 'error', `${resultRef}: ${validation.errors.join('; ')}`, resultPath));
      ledger.entries.push(baseEntry);
      continue;
    }

    const validEntry = {
      resultId: result.resultId,
      ref: resultRef,
      path: resultPath,
      valid: true,
      createdAt: result.createdAt,
      outcome: result.outcome,
      summary: result.summary,
      routeWorkflow: result.routing.selectedWorkflow,
    };
    ledger.entries.push(validEntry);
    ledger.count++;
  }

  ledger.latest = latestResultEntry(ledger.entries.filter((entry) => entry.valid));
  ledger.state = hasError ? 'invalid' : ledger.count > 0 ? 'present' : 'none';
  return ledger;
}

function validateResultArtifact(result, options = {}) {
  const errors = [];
  if (!isObject(result)) {
    return invalid('result must be an object');
  }

  if (result.kind !== 'bmad-workspace-result') {
    errors.push('result.kind must be bmad-workspace-result');
  }
  if (result.schemaVersion !== RESULT_SCHEMA_VERSION) {
    errors.push(`result.schemaVersion must be ${RESULT_SCHEMA_VERSION}`);
  }
  requireNonEmptyString(result, 'sessionId', errors, 'result');
  requireNonEmptyString(result, 'resultId', errors, 'result');
  requireNonEmptyString(result, 'createdAt', errors, 'result');
  requireNonEmptyString(result, 'packetRef', errors, 'result');
  if (result.renderedPromptRef !== null && typeof result.renderedPromptRef !== 'string') {
    errors.push('result.renderedPromptRef must be a string or null');
  }
  if (!RESULT_ID_PATTERN.test(result.resultId || '')) {
    errors.push('result.resultId may only contain letters, numbers, dots, underscores, and dashes');
  }
  if (options.expectedSessionId && result.sessionId !== options.expectedSessionId) {
    errors.push(`result.sessionId must equal ${options.expectedSessionId}`);
  }
  if (!OUTCOMES.has(result.outcome)) {
    errors.push('result.outcome must be succeeded, failed, or blocked');
  }
  requireNonEmptyString(result, 'summary', errors, 'result');
  validateRoutingDecision(result.routing, errors, 'result.routing');
  validateCommands(result.commands, errors);
  validateEvidenceRefs(result.evidenceRefs, errors);
  validateFailure(result.failure, errors);
  return resultFromErrors(errors);
}

function validateCommands(commands, errors) {
  if (commands === undefined) {
    return;
  }
  if (!Array.isArray(commands)) {
    errors.push('result.commands must be an array');
    return;
  }
  for (const [index, command] of commands.entries()) {
    const label = `result.commands[${index}]`;
    if (!isObject(command)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    requireNonEmptyString(command, 'command', errors, label);
    if ('exitCode' in command && !Number.isInteger(command.exitCode)) {
      errors.push(`${label}.exitCode must be an integer`);
    }
    for (const field of ['cwd', 'summary']) {
      if (field in command && typeof command[field] !== 'string') {
        errors.push(`${label}.${field} must be a string`);
      }
    }
  }
}

function validateEvidenceRefs(evidenceRefs, errors) {
  if (evidenceRefs === undefined) {
    return;
  }
  if (!Array.isArray(evidenceRefs) || evidenceRefs.some((ref) => typeof ref !== 'string' || ref.trim() === '')) {
    errors.push('result.evidenceRefs must be an array of non-empty strings');
  }
}

function validateFailure(failure, errors) {
  if (failure === undefined) {
    return;
  }
  if (!isObject(failure)) {
    errors.push('result.failure must be an object');
    return;
  }
  for (const field of ['rootCause', 'nextAction']) {
    if (field in failure && typeof failure[field] !== 'string') {
      errors.push(`result.failure.${field} must be a string`);
    }
  }
  if ('retryable' in failure && typeof failure.retryable !== 'boolean') {
    errors.push('result.failure.retryable must be boolean');
  }
}

function scanForSecrets(content) {
  if (typeof content !== 'string' || content === '') {
    return [];
  }
  const findings = [];
  for (const secretPattern of SECRET_PATTERNS) {
    secretPattern.pattern.lastIndex = 0;
    if (secretPattern.pattern.test(content)) {
      findings.push({ type: secretPattern.id });
    }
  }
  return findings;
}

function assertNoSecrets(content, label) {
  const findings = scanForSecrets(content);
  if (findings.length > 0) {
    throw new Error(`RESULT_SECRET_DETECTED: ${label} contains ${findings[0].type}`);
  }
}

function readResultInput(inputPath) {
  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`RESULT_INPUT_NOT_FOUND: ${resolvedInputPath}`);
  }
  if (!fs.statSync(resolvedInputPath).isFile()) {
    throw new Error(`RESULT_INPUT_NOT_FOUND: ${resolvedInputPath} is not a file`);
  }
  return fs.readFileSync(resolvedInputPath, 'utf8');
}

function parseResultInput(rawInput, inputPath) {
  try {
    return JSON.parse(rawInput);
  } catch (error) {
    throw new Error(`RESULT_INPUT_INVALID_JSON: ${path.resolve(inputPath)}: ${error.message}`);
  }
}

function createResultId() {
  const stamp = new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/g, '')
    .slice(0, 14);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `result-${stamp}-${suffix}`;
}

function assertSessionId(sessionId, commandName) {
  if (!sessionId || !RESULT_ID_PATTERN.test(sessionId)) {
    throw new Error(`SESSION_NOT_FOUND: ${commandName} requires a valid session id`);
  }
}

function assertResultId(resultId) {
  if (typeof resultId !== 'string' || !RESULT_ID_PATTERN.test(resultId)) {
    throw new Error('RESULT_ID_UNSAFE: result id may only contain letters, numbers, dots, underscores, and dashes');
  }
}

function latestResultEntry(entries) {
  if (entries.length === 0) {
    return null;
  }
  return [...entries].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt) || right.resultId.localeCompare(left.resultId),
  )[0];
}

function readJson(filePath, code = 'RESULT_INVALID_JSON') {
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
  RESULT_SCHEMA_VERSION,
  recordSessionResult,
  readResultLedger,
  scanForSecrets,
  validateResultArtifact,
};
