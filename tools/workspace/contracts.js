const { validateRoutingDecision } = require('./routing');
const { PACKET_VERSION_WITH_EVIDENCE_GATES, VALID_FRESHNESS_POLICIES } = require('./evidence-gates');

const ENGINE_LIKE_GROUPS = new Set(['runtime.session']);
const ENGINE_LIKE_INTERFACES = new Set(['scheduler', 'planner', 'ledger', 'memory-graph', 'review-engine', 'grant-engine']);

const REQUIRED_PACKET_FIELDS_V4 = [
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
  'executorContractRef',
  'routing',
  'sessionSetup',
];

const REQUIRED_PACKET_FIELDS_V5 = [
  ...REQUIRED_PACKET_FIELDS_V4.filter((field) => field !== 'repoIntakeRefs'),
  'evidenceGates',
  'evidenceRefs',
];

const ALLOWED_PACKET_FIELDS_V4 = new Set([...REQUIRED_PACKET_FIELDS_V4, 'reviewPlan']);
const ALLOWED_PACKET_FIELDS_V5 = new Set([...REQUIRED_PACKET_FIELDS_V5, 'repoIntakeRefs', 'reviewPlan']);
const ALLOWED_EVIDENCE_GATE_FIELDS = new Set(['id', 'requiredCapabilityIds', 'required', 'evidenceRefIds', 'freshnessPolicy', 'message']);
const ALLOWED_EVIDENCE_REF_FIELDS = new Set(['id', 'capability', 'artifactRef', 'sha256', 'generatedAt', 'sourceFiles']);
const ALLOWED_EVIDENCE_SOURCE_FIELDS = new Set(['path', 'sha256']);

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

  const packetVersion = packet.packetVersion;
  const requiredPacketFields = packetVersion === PACKET_VERSION_WITH_EVIDENCE_GATES ? REQUIRED_PACKET_FIELDS_V5 : REQUIRED_PACKET_FIELDS_V4;
  const allowedPacketFields = packetVersion === PACKET_VERSION_WITH_EVIDENCE_GATES ? ALLOWED_PACKET_FIELDS_V5 : ALLOWED_PACKET_FIELDS_V4;

  validateAllowedFields(packet, allowedPacketFields, 'packet', errors);

  for (const field of requiredPacketFields) {
    if (!(field in packet)) {
      errors.push(`packet.${field} is required`);
    }
  }

  if (packet.kind !== 'bmad-work-packet') {
    errors.push('packet.kind must be bmad-work-packet');
  }
  if (![4, PACKET_VERSION_WITH_EVIDENCE_GATES].includes(packet.packetVersion)) {
    errors.push(`packet.packetVersion must be 4 or ${PACKET_VERSION_WITH_EVIDENCE_GATES}`);
  }
  requireNonEmptyString(packet, 'sessionId', errors);
  requireNonEmptyString(packet, 'bmadWorkflow', errors);
  requireNonEmptyString(packet, 'goal', errors);
  if ('repoIntakeRefs' in packet) {
    requireNonEmptyArray(packet, 'repoIntakeRefs', errors);
  }
  requireNonEmptyArray(packet, 'constraints', errors);
  requireNonEmptyArray(packet, 'grants', errors);
  requireNonEmptyArray(packet, 'acceptanceCriteria', errors);
  requireNonEmptyString(packet, 'capabilityContractRef', errors);
  requireNonEmptyString(packet, 'renderedPromptRef', errors);
  requireNonEmptyString(packet, 'executorContractRef', errors);
  if (
    typeof packet.executorContractRef === 'string' &&
    (packet.executorContractRef.includes('\\') ||
      packet.executorContractRef.split('/').includes('..') ||
      packet.executorContractRef.startsWith('/'))
  ) {
    errors.push('packet.executorContractRef must be a safe session-relative POSIX path');
  }
  validateRoutingDecision(packet.routing, errors);
  if (packet.routing?.selectedWorkflow && packet.bmadWorkflow !== packet.routing.selectedWorkflow) {
    errors.push('packet.bmadWorkflow must equal packet.routing.selectedWorkflow');
  }
  validateSessionSetup(packet.sessionSetup, errors);
  if (packetVersion === PACKET_VERSION_WITH_EVIDENCE_GATES) {
    validateEvidenceGateContract(packet, errors);
  }

  return result(errors);
}

function validateAllowedFields(object, allowedFields, label, errors) {
  for (const field of Object.keys(object)) {
    if (!allowedFields.has(field)) {
      errors.push(`${label}.${field} is not allowed by current Workspace contract`);
    }
  }
}

function validateEvidenceGateContract(packet, errors) {
  const refs = packet.evidenceRefs;
  const gates = packet.evidenceGates;

  if (!Array.isArray(gates) || gates.length === 0) {
    errors.push('packet.evidenceGates must be a non-empty array');
  }
  if (!Array.isArray(refs) || refs.length === 0) {
    errors.push('packet.evidenceRefs must be a non-empty array');
  }

  if (!Array.isArray(gates) || !Array.isArray(refs)) {
    return;
  }

  const evidenceRefIds = new Set();
  for (const [index, ref] of refs.entries()) {
    validateEvidenceRef(ref, index, errors);
    if (isObject(ref) && typeof ref.id === 'string') {
      if (evidenceRefIds.has(ref.id)) {
        errors.push(`packet.evidenceRefs[${index}].id must be unique`);
      }
      evidenceRefIds.add(ref.id);
    }
  }

  for (const [index, gate] of gates.entries()) {
    validateEvidenceGate(gate, index, refs, evidenceRefIds, errors);
  }

  if ('repoIntakeRefs' in packet) {
    validateEvidenceAliasCompatibility(packet, errors);
  }
}

function validateEvidenceGate(gate, index, refs, evidenceRefIds, errors) {
  const label = `packet.evidenceGates[${index}]`;
  if (!isObject(gate)) {
    errors.push(`${label} must be an object`);
    return;
  }

  validateAllowedFields(gate, ALLOWED_EVIDENCE_GATE_FIELDS, label, errors);
  for (const field of ['id', 'message']) {
    requireNonEmptyString(gate, field, errors, label);
  }
  requireNonEmptyArray(gate, 'requiredCapabilityIds', errors, label);
  if (typeof gate.required !== 'boolean') {
    errors.push(`${label}.required must be boolean`);
  }
  if (!VALID_FRESHNESS_POLICIES.has(gate.freshnessPolicy)) {
    errors.push(`${label}.freshnessPolicy must be source-hash, mtime, or none`);
  }
  if ('evidenceRefIds' in gate) {
    requireNonEmptyArray(gate, 'evidenceRefIds', errors, label);
    if (Array.isArray(gate.evidenceRefIds)) {
      for (const [refIndex, refId] of gate.evidenceRefIds.entries()) {
        if (typeof refId !== 'string' || refId.trim() === '') {
          errors.push(`${label}.evidenceRefIds[${refIndex}] must be a non-empty string`);
          continue;
        }
        if (!evidenceRefIds.has(refId)) {
          errors.push(`${label}.evidenceRefIds[${refIndex}] must reference packet.evidenceRefs.id`);
        }
      }
    }
  }

  if (Array.isArray(gate.requiredCapabilityIds)) {
    for (const [capabilityIndex, capability] of gate.requiredCapabilityIds.entries()) {
      if (typeof capability !== 'string' || capability.trim() === '') {
        errors.push(`${label}.requiredCapabilityIds[${capabilityIndex}] must be a non-empty string`);
        continue;
      }
      const matchingRef = refs.some(
        (ref) => ref.capability === capability && (!Array.isArray(gate.evidenceRefIds) || gate.evidenceRefIds.includes(ref.id)),
      );
      if (!matchingRef) {
        errors.push(`${label}.requiredCapabilityIds[${capabilityIndex}] must have a matching packet.evidenceRefs.capability`);
      }
    }
  }
}

function validateEvidenceRef(ref, index, errors) {
  const label = `packet.evidenceRefs[${index}]`;
  if (!isObject(ref)) {
    errors.push(`${label} must be an object`);
    return;
  }

  validateAllowedFields(ref, ALLOWED_EVIDENCE_REF_FIELDS, label, errors);
  for (const field of ['id', 'capability', 'artifactRef', 'sha256', 'generatedAt']) {
    requireNonEmptyString(ref, field, errors, label);
  }
  if (typeof ref.sha256 === 'string' && !/^[a-f0-9]{64}$/i.test(ref.sha256)) {
    errors.push(`${label}.sha256 must be a 64-character hex string`);
  }
  if (typeof ref.generatedAt === 'string' && Number.isNaN(Date.parse(ref.generatedAt))) {
    errors.push(`${label}.generatedAt must be an ISO timestamp`);
  }
  requireNonEmptyArray(ref, 'sourceFiles', errors, label);
  if (Array.isArray(ref.sourceFiles)) {
    for (const [sourceIndex, source] of ref.sourceFiles.entries()) {
      validateEvidenceSource(source, sourceIndex, errors, label);
    }
  }
}

function validateEvidenceSource(source, index, errors, evidenceRefLabel) {
  const label = `${evidenceRefLabel}.sourceFiles[${index}]`;
  if (!isObject(source)) {
    errors.push(`${label} must be an object`);
    return;
  }
  validateAllowedFields(source, ALLOWED_EVIDENCE_SOURCE_FIELDS, label, errors);
  requireNonEmptyString(source, 'path', errors, label);
  if ('sha256' in source && (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(source.sha256))) {
    errors.push(`${label}.sha256 must be a 64-character hex string`);
  }
}

function validateEvidenceAliasCompatibility(packet, errors) {
  if (!Array.isArray(packet.repoIntakeRefs) || !Array.isArray(packet.evidenceRefs)) {
    return;
  }
  const legacyRefs = [...packet.repoIntakeRefs].sort();
  const evidenceArtifactRefs = [...new Set(packet.evidenceRefs.map((ref) => ref.artifactRef).filter(Boolean))].sort();
  if (JSON.stringify(legacyRefs) !== JSON.stringify(evidenceArtifactRefs)) {
    errors.push('packet.repoIntakeRefs and packet.evidenceRefs diverge');
  }
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

  if (capability.id === 'executor.codex.manual') {
    if (capability.group !== 'executor.codex') {
      errors.push(`${label}.group must be executor.codex for manual executor readiness`);
    }
    if (capability.provider !== 'codex') {
      errors.push(`${label}.provider must be codex for manual executor readiness`);
    }
    if (capability.interface !== 'manual-executor-contract') {
      errors.push(`${label}.interface must be manual-executor-contract`);
    }
    if (!arrayIncludes(capability.writes, 'workspace-session/packets')) {
      errors.push(`${label}.writes must include workspace-session/packets`);
    }
    if (!arrayIncludes(capability.forbiddenWrites, 'workspace-base')) {
      errors.push(`${label}.forbiddenWrites must include workspace-base`);
    }
    if (!arrayIncludes(capability.outputs, 'executor-contract.json')) {
      errors.push(`${label}.outputs must include executor-contract.json`);
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
