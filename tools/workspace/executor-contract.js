const fs = require('node:fs');
const path = require('node:path');

const EXECUTOR_CONTRACT_SCHEMA_VERSION = 1;
const EXECUTOR_CONTRACT_REF = 'packets/executor-contract.json';
const RESULT_LEDGER_REF = 'results';

const FORBIDDEN_EXECUTOR_ACTIONS = Object.freeze([
  'workspace-run',
  'scheduler',
  'watcher',
  'daemon',
  'live-adapter-activation',
  'restore',
  'replay',
  'merge',
  'promotion',
  'ungranted-base-write',
  'hidden-subprocess',
]);

const MANUAL_EXECUTION_STEPS = Object.freeze([
  'Inspect `bmad workspace status` before manual execution.',
  'Use the rendered prompt referenced by `renderedPromptRef`.',
  'Work only inside `allowedWriteRoots`.',
  'Run project checks manually in the target checkout.',
  'Record manual evidence with `bmad workspace result` after execution.',
]);

function buildExecutorContract({ sessionId, sessionType, packetRef, renderedPromptRef, routing, grants, repoPack, workspaceBasePath }) {
  return {
    kind: 'bmad-workspace-executor-contract',
    schemaVersion: EXECUTOR_CONTRACT_SCHEMA_VERSION,
    sessionId,
    packetRef,
    renderedPromptRef,
    resultLedgerRef: RESULT_LEDGER_REF,
    routing,
    sessionType,
    executionMode: 'manual',
    executorKind: 'codex',
    allowedWriteRoots: deriveAllowedWriteRoots({ sessionType, grants, repoPack, workspaceBasePath }),
    forbiddenActions: [...FORBIDDEN_EXECUTOR_ACTIONS],
    manualExecutionSteps: [...MANUAL_EXECUTION_STEPS],
  };
}

function deriveAllowedWriteRoots({ sessionType, grants, repoPack, workspaceBasePath }) {
  if (sessionType === 'base-improvement') {
    const baseRepo = (repoPack?.repos || []).find((repo) => repo.id === 'workspace-base') || repoPack?.repos?.[0];
    const baseRoot = baseRepo?.worktreePath || workspaceBasePath;
    return uniqueSorted((grants?.allowedBasePaths || []).map((allowedPath) => canonicalPath(resolveGrantPath(baseRoot, allowedPath))));
  }

  return uniqueSorted((grants?.targetRepoWrites || []).map((targetPath) => canonicalPath(targetPath)));
}

function validateExecutorContract(contract, options = {}) {
  const errors = [];
  if (!isObject(contract)) {
    return invalid('executorContract must be an object');
  }

  if (contract.kind !== 'bmad-workspace-executor-contract') {
    errors.push('executorContract.kind must be bmad-workspace-executor-contract');
  }
  if (contract.schemaVersion !== EXECUTOR_CONTRACT_SCHEMA_VERSION) {
    errors.push(`executorContract.schemaVersion must be ${EXECUTOR_CONTRACT_SCHEMA_VERSION}`);
  }

  requireNonEmptyString(contract, 'sessionId', errors);
  requireSafeSessionRef(contract, 'packetRef', errors);
  requireSafeSessionRef(contract, 'renderedPromptRef', errors);
  requireSafeSessionRef(contract, 'resultLedgerRef', errors);

  if (contract.resultLedgerRef !== RESULT_LEDGER_REF) {
    errors.push(`executorContract.resultLedgerRef must be ${RESULT_LEDGER_REF}`);
  }
  if (!isObject(contract.routing)) {
    errors.push('executorContract.routing must be an object');
  }
  if (!['normal', 'base-improvement'].includes(contract.sessionType)) {
    errors.push('executorContract.sessionType must be normal or base-improvement');
  }
  if (contract.executionMode !== 'manual') {
    errors.push('executorContract.executionMode must be manual');
  }
  if (contract.executorKind !== 'codex') {
    errors.push('executorContract.executorKind must be codex');
  }

  validateAllowedWriteRoots(contract.allowedWriteRoots, errors);
  validateForbiddenActions(contract.forbiddenActions, errors);
  validateManualExecutionSteps(contract.manualExecutionSteps, errors);

  if (options.expectedSessionId && contract.sessionId !== options.expectedSessionId) {
    errors.push(`executorContract.sessionId must equal ${options.expectedSessionId}`);
  }
  if (options.expectedPacketRef && contract.packetRef !== options.expectedPacketRef) {
    errors.push(`executorContract.packetRef must equal ${options.expectedPacketRef}`);
  }
  if (options.expectedRenderedPromptRef && contract.renderedPromptRef !== options.expectedRenderedPromptRef) {
    errors.push(`executorContract.renderedPromptRef must equal ${options.expectedRenderedPromptRef}`);
  }

  return result(errors);
}

function readExecutorContractStatus({ sessionRoot, packet, packetRef = 'packets/bmad-work-packet.json', checks = [] }) {
  const base = {
    ref: packet?.executorContractRef || null,
    path: packet?.executorContractRef ? path.join(sessionRoot, packet.executorContractRef) : path.join(sessionRoot, EXECUTOR_CONTRACT_REF),
    state: 'missing',
    present: false,
    valid: false,
  };

  if (!packet?.executorContractRef) {
    checks.push(check('EXECUTOR_CONTRACT_MISSING', 'error', 'BMAD Work Packet has no executorContractRef.', base.path));
    return base;
  }

  if (!isSafeSessionRef(packet.executorContractRef)) {
    checks.push(check('EXECUTOR_CONTRACT_INVALID', 'error', 'executorContractRef must be a safe session-relative POSIX path.', base.path));
    return { ...base, state: 'invalid' };
  }

  const contractPath = path.join(sessionRoot, packet.executorContractRef);
  if (!fs.existsSync(contractPath) || !fs.statSync(contractPath).isFile()) {
    checks.push(check('EXECUTOR_CONTRACT_MISSING', 'error', 'Declared executor contract is missing.', contractPath));
    return { ...base, path: contractPath, state: 'declared-missing' };
  }

  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    checks.push(check('EXECUTOR_CONTRACT_INVALID_JSON', 'error', `Executor contract is invalid JSON: ${error.message}`, contractPath));
    return { ...base, path: contractPath, state: 'invalid', present: true };
  }

  const validation = validateExecutorContract(contract, {
    expectedSessionId: packet.sessionId,
    expectedPacketRef: packetRef,
    expectedRenderedPromptRef: packet.renderedPromptRef,
  });
  if (!validation.ok) {
    checks.push(check('EXECUTOR_CONTRACT_INVALID', 'error', validation.errors.join('; '), contractPath));
    return { ...base, path: contractPath, state: 'invalid', present: true, errors: validation.errors };
  }

  validateRequiredRefs({ sessionRoot, contract, contractPath, checks });
  validateAllowedRootState({ contract, checks, contractPath });

  const hasRefError = checks.some((item) => item.path === contractPath && item.code === 'EXECUTOR_CONTRACT_REF_MISSING');
  if (hasRefError) {
    return { ...base, path: contractPath, state: 'invalid', present: true, errors: ['executor contract refs are missing'] };
  }

  return {
    ...base,
    path: contractPath,
    state: 'valid',
    present: true,
    valid: true,
    executionMode: contract.executionMode,
    executorKind: contract.executorKind,
    allowedWriteRoots: contract.allowedWriteRoots,
    forbiddenActions: contract.forbiddenActions,
    manualExecutionSteps: contract.manualExecutionSteps,
  };
}

function validateRequiredRefs({ sessionRoot, contract, contractPath, checks }) {
  for (const ref of [contract.packetRef, contract.renderedPromptRef]) {
    const refPath = path.join(sessionRoot, ref);
    if (!fs.existsSync(refPath) || !fs.statSync(refPath).isFile()) {
      checks.push(check('EXECUTOR_CONTRACT_REF_MISSING', 'error', `${ref} referenced by executor contract is missing.`, contractPath));
    }
  }
}

function validateAllowedRootState({ contract, checks, contractPath }) {
  for (const root of contract.allowedWriteRoots || []) {
    if (!fs.existsSync(root)) {
      checks.push(check('EXECUTOR_CONTRACT_WRITE_ROOT_MISSING', 'warning', `${root} no longer exists.`, contractPath));
    }
  }
}

function validateAllowedWriteRoots(allowedWriteRoots, errors) {
  if (!Array.isArray(allowedWriteRoots) || allowedWriteRoots.length === 0) {
    errors.push('executorContract.allowedWriteRoots must be a non-empty array');
    return;
  }
  for (const [index, root] of allowedWriteRoots.entries()) {
    if (typeof root !== 'string' || root.trim() === '') {
      errors.push(`executorContract.allowedWriteRoots[${index}] must be a non-empty string`);
      continue;
    }
    if (!path.isAbsolute(root)) {
      errors.push(`executorContract.allowedWriteRoots[${index}] must be an absolute path`);
    }
  }
}

function validateForbiddenActions(forbiddenActions, errors) {
  if (!Array.isArray(forbiddenActions)) {
    errors.push('executorContract.forbiddenActions must be an array');
    return;
  }
  for (const action of FORBIDDEN_EXECUTOR_ACTIONS) {
    if (!forbiddenActions.includes(action)) {
      errors.push(`executorContract.forbiddenActions must include ${action}`);
    }
  }
}

function validateManualExecutionSteps(manualExecutionSteps, errors) {
  if (!Array.isArray(manualExecutionSteps) || manualExecutionSteps.length === 0) {
    errors.push('executorContract.manualExecutionSteps must be a non-empty array');
    return;
  }
  if (manualExecutionSteps.some((step) => typeof step !== 'string' || step.trim() === '')) {
    errors.push('executorContract.manualExecutionSteps must contain non-empty strings');
  }
}

function requireNonEmptyString(object, field, errors) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`executorContract.${field} must be a non-empty string`);
  }
}

function requireSafeSessionRef(object, field, errors) {
  if (!isSafeSessionRef(object[field])) {
    errors.push(`executorContract.${field} must be a safe session-relative POSIX path`);
  }
}

function isSafeSessionRef(value) {
  return (
    typeof value === 'string' && value.trim() !== '' && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').includes('..')
  );
}

function resolveGrantPath(basePath, grantPath) {
  return path.isAbsolute(grantPath) ? path.resolve(grantPath) : path.resolve(basePath, grantPath);
}

function canonicalPath(candidatePath) {
  let currentPath = path.resolve(candidatePath);
  if (fs.existsSync(currentPath)) {
    return fs.realpathSync.native(currentPath);
  }

  const missingSegments = [];
  while (!fs.existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return path.resolve(candidatePath);
    }
    missingSegments.unshift(path.basename(currentPath));
    currentPath = parentPath;
  }

  return path.join(fs.realpathSync.native(currentPath), ...missingSegments);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function check(code, severity, message, checkPath) {
  return {
    code,
    severity,
    message,
    ...(checkPath ? { path: checkPath } : {}),
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalid(error) {
  return { ok: false, errors: [error] };
}

function result(errors) {
  return {
    ok: errors.length === 0,
    errors,
  };
}

module.exports = {
  EXECUTOR_CONTRACT_REF,
  FORBIDDEN_EXECUTOR_ACTIONS,
  buildExecutorContract,
  readExecutorContractStatus,
  validateExecutorContract,
};
