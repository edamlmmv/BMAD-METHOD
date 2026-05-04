const ENGINE_LIKE_GROUPS = new Set(['runtime.session']);
const ENGINE_LIKE_INTERFACES = new Set(['scheduler', 'planner', 'ledger', 'memory-graph', 'review-engine', 'grant-engine']);

const REQUIRED_PACKET_FIELDS = [
  'id',
  'bmadWorkflow',
  'goal',
  'repoIntakeRefs',
  'constraints',
  'grants',
  'acceptanceCriteria',
  'capabilityContractRef',
  'renderedPromptRef',
];

const REQUIRED_CAPABILITY_FIELDS = [
  'id',
  'group',
  'provider',
  'interface',
  'allowedInNormalMission',
  'allowedInBaseImprovement',
  'requiresGrant',
  'writes',
  'forbiddenWrites',
  'outputs',
  'upstreamGapProofRequired',
];

function validateMissionPacket(packet) {
  const errors = [];

  if (!isObject(packet)) {
    return invalid('packet must be an object');
  }

  for (const field of REQUIRED_PACKET_FIELDS) {
    if (!(field in packet)) {
      errors.push(`packet.${field} is required`);
    }
  }

  requireNonEmptyString(packet, 'id', errors);
  requireNonEmptyString(packet, 'bmadWorkflow', errors);
  requireNonEmptyString(packet, 'goal', errors);
  requireNonEmptyArray(packet, 'repoIntakeRefs', errors);
  requireNonEmptyArray(packet, 'constraints', errors);
  requireNonEmptyArray(packet, 'grants', errors);
  requireNonEmptyArray(packet, 'acceptanceCriteria', errors);
  requireNonEmptyString(packet, 'capabilityContractRef', errors);
  requireNonEmptyString(packet, 'renderedPromptRef', errors);

  return result(errors);
}

function validateCapabilityContract(contract) {
  const errors = [];

  if (!isObject(contract)) {
    return invalid('capability contract must be an object');
  }

  requireNonEmptyString(contract, 'schemaVersion', errors);
  requireNonEmptyString(contract, 'workspaceDistroVersion', errors);

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

  for (const field of ['allowedInNormalMission', 'allowedInBaseImprovement', 'requiresGrant', 'upstreamGapProofRequired']) {
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
    if (!arrayIncludes(capability.forbiddenWrites, 'workspace-distro')) {
      errors.push(`${label}.forbiddenWrites must include workspace-distro`);
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
  validateMissionPacket,
};
