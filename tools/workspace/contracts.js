const { validateRoutingDecision } = require('./routing');

const ENGINE_LIKE_GROUPS = new Set(['runtime.session']);
const ENGINE_LIKE_INTERFACES = new Set(['scheduler', 'planner', 'ledger', 'memory-graph', 'review-engine', 'grant-engine']);

const REQUIRED_PACKET_FIELDS = [
  'kind',
  'packetVersion',
  'sessionId',
  'bmadWorkflow',
  'goal',
  'repoIntakeRefs',
  'constraints',
  'grants',
  'acceptanceCriteria',
  'capabilityContractRef',
  'renderedPromptRef',
  'sessionSetup',
];

const REQUIRED_CAPABILITY_FIELDS = [
  'id',
  'group',
  'provider',
  'interface',
  'allowedInNormalSession',
  'allowedInBaseImprovement',
  'requiresGrant',
  'writes',
  'forbiddenWrites',
  'outputs',
  'upstreamGapProofRequired',
];

function validateWorkPacket(packet) {
  const errors = [];

  if (!isObject(packet)) {
    return invalid('packet must be an object');
  }

  for (const legacyField of ['missionId', 'missionRoot', 'missionType']) {
    if (legacyField in packet) {
      errors.push(`v3-workspace-artifact-unsupported: packet.${legacyField} is not supported in V4`);
    }
  }

  for (const field of REQUIRED_PACKET_FIELDS) {
    if (!(field in packet)) {
      errors.push(`packet.${field} is required`);
    }
  }

  if (packet.kind !== 'bmad-work-packet') {
    errors.push('packet.kind must be bmad-work-packet');
  }
  if (packet.packetVersion !== 4) {
    errors.push('v3-workspace-artifact-unsupported: packet.packetVersion must be 4');
  }
  requireNonEmptyString(packet, 'sessionId', errors);
  requireNonEmptyString(packet, 'bmadWorkflow', errors);
  requireNonEmptyString(packet, 'goal', errors);
  requireNonEmptyArray(packet, 'repoIntakeRefs', errors);
  requireNonEmptyArray(packet, 'constraints', errors);
  requireNonEmptyArray(packet, 'grants', errors);
  requireNonEmptyArray(packet, 'acceptanceCriteria', errors);
  requireNonEmptyString(packet, 'capabilityContractRef', errors);
  requireNonEmptyString(packet, 'renderedPromptRef', errors);
  if ('routing' in packet) {
    validateRoutingDecision(packet.routing, errors);
    if (packet.routing?.selectedWorkflow && packet.bmadWorkflow !== packet.routing.selectedWorkflow) {
      errors.push('packet.bmadWorkflow must equal packet.routing.selectedWorkflow');
    }
  }
  validateSessionSetup(packet.sessionSetup, errors);

  return result(errors);
}

function validateSessionSetup(sessionSetup, errors) {
  if (!isObject(sessionSetup)) {
    errors.push('missing-session-setup: packet.sessionSetup must be an object');
    return;
  }

  for (const step of ['zoomOut', 'ubiquitousLanguage', 'grillDecisions', 'tddPlan']) {
    const entry = sessionSetup[step];
    if (!isObject(entry)) {
      errors.push(`missing-session-setup: packet.sessionSetup.${step} is required`);
      continue;
    }

    if (entry.status === 'complete') {
      if (typeof entry.ref !== 'string' || entry.ref.trim() === '') {
        errors.push(`packet.sessionSetup.${step}.ref must be a non-empty string when status is complete`);
      }
      if ('skipReason' in entry) {
        errors.push(`packet.sessionSetup.${step}.skipReason is only valid when status is skipped`);
      }
      validateCompleteSetupRef(entry, step, errors);
      continue;
    }

    if (entry.status === 'skipped') {
      if (typeof entry.skipReason !== 'string' || entry.skipReason.trim() === '') {
        errors.push(`packet.sessionSetup.${step}.skipReason must be a non-empty string when status is skipped`);
      }
      if ('ref' in entry) {
        errors.push(`packet.sessionSetup.${step}.ref is only valid when status is complete`);
      }
      continue;
    }

    errors.push(`packet.sessionSetup.${step}.status must be complete or skipped`);
  }
}

function validateCompleteSetupRef(entry, step, errors) {
  if (!('refType' in entry)) {
    return;
  }

  if (!['file', 'external'].includes(entry.refType)) {
    errors.push(`packet.sessionSetup.${step}.refType must be file or external`);
    return;
  }

  if (entry.refType === 'file') {
    if (typeof entry.resolvedRef !== 'string' || entry.resolvedRef.trim() === '') {
      errors.push(`packet.sessionSetup.${step}.resolvedRef must be a non-empty string for file refs`);
    }
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(entry.sha256)) {
      errors.push(`packet.sessionSetup.${step}.sha256 must be a 64-character hex string for file refs`);
    }
    if (entry.verification && entry.verification !== 'local-verified') {
      errors.push(`packet.sessionSetup.${step}.verification must be local-verified for file refs`);
    }
  }

  if (entry.refType === 'external') {
    if (entry.verification !== 'external-unverified') {
      errors.push(`packet.sessionSetup.${step}.verification must be external-unverified for external refs`);
    }
    if ('sha256' in entry) {
      errors.push(`packet.sessionSetup.${step}.sha256 is not valid for external refs`);
    }
    if ('resolvedRef' in entry) {
      errors.push(`packet.sessionSetup.${step}.resolvedRef is not valid for external refs`);
    }
  }
}

function validateCapabilityContract(contract) {
  const errors = [];

  if (!isObject(contract)) {
    return invalid('capability contract must be an object');
  }

  requireNonEmptyString(contract, 'schemaVersion', errors);
  requireNonEmptyString(contract, 'workspaceVersion', errors);

  if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
    errors.push('contract.capabilities must be a non-empty array');
    return result(errors);
  }

  for (const [index, capability] of contract.capabilities.entries()) {
    validateCapability(capability, index, errors);
  }

  return result(errors);
}

function validateCapability(capability, index, errors) {
  const label = `contract.capabilities[${index}]`;

  if (!isObject(capability)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const field of REQUIRED_CAPABILITY_FIELDS) {
    if (!(field in capability)) {
      errors.push(`${label}.${field} is required`);
    }
  }

  for (const field of ['id', 'group', 'provider', 'interface']) {
    requireNonEmptyString(capability, field, errors, label);
  }

  for (const field of ['allowedInNormalSession', 'allowedInBaseImprovement', 'requiresGrant', 'upstreamGapProofRequired']) {
    if (typeof capability[field] !== 'boolean') {
      errors.push(`${label}.${field} must be boolean`);
    }
  }

  for (const field of ['writes', 'forbiddenWrites', 'outputs']) {
    if (!Array.isArray(capability[field])) {
      errors.push(`${label}.${field} must be an array`);
    }
  }

  if (capability.id === 'evidence.graph.repo-intake') {
    if (capability.group !== 'evidence.graph') {
      errors.push(`${label}.group must be evidence.graph for repo intake`);
    }
    if (!arrayIncludes(capability.forbiddenWrites, 'workspace-base')) {
      errors.push(`${label}.forbiddenWrites must include workspace-base`);
    }
    for (const output of ['repo-intake.json', 'graph.json', 'provenance.json']) {
      if (!arrayIncludes(capability.outputs, output)) {
        errors.push(`${label}.outputs must include ${output}`);
      }
    }
  }

  if (isEngineLike(capability) && capability.upstreamGapProofRequired !== true) {
    errors.push(`${label}.upstreamGapProofRequired must be true for engine-like adapters`);
  }
}

function isEngineLike(capability) {
  return ENGINE_LIKE_GROUPS.has(capability.group) || ENGINE_LIKE_INTERFACES.has(capability.interface);
}

function requireNonEmptyString(object, field, errors, label = 'packet') {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}.${field} must be a non-empty string`);
  }
}

function requireNonEmptyArray(object, field, errors, label = 'packet') {
  if (!Array.isArray(object[field]) || object[field].length === 0) {
    errors.push(`${label}.${field} must be a non-empty array`);
  }
}

function arrayIncludes(value, expected) {
  return Array.isArray(value) && value.includes(expected);
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
  validateCapabilityContract,
  validateWorkPacket,
};
