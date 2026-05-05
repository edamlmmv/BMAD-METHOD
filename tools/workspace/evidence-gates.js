const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PACKET_VERSION_WITH_EVIDENCE_GATES = 5;
const EVIDENCE_GATE_FAILED = 'EVIDENCE_GATE_FAILED';
const REPO_INTAKE_GRAPH_CAPABILITY = 'evidence.graph.repo-intake';
const VALID_FRESHNESS_POLICIES = new Set(['source-hash', 'mtime', 'none']);
const VALID_FAILURE_REASONS = new Set(['missing', 'invalid', 'stale']);

function createEvidenceGateFailure({ gateId, capability, reason, evidenceRefId, packetVersion = PACKET_VERSION_WITH_EVIDENCE_GATES }) {
  const payload = {
    code: EVIDENCE_GATE_FAILED,
    gateId,
    capability,
    reason: VALID_FAILURE_REASONS.has(reason) ? reason : 'invalid',
    packetVersion,
  };
  if (evidenceRefId) {
    payload.evidenceRefId = evidenceRefId;
  }
  return payload;
}

function evaluateEvidenceGates({ packet, sessionRoot }) {
  const gates = Array.isArray(packet?.evidenceGates) ? packet.evidenceGates : [];
  const refs = normalizeEvidenceRefs(packet);
  const gateResults = gates.map((gate) => evaluateGate({ gate, refs, sessionRoot, packetVersion: packet.packetVersion }));
  const requiredFailures = gateResults.filter((gate) => gate.required && gate.state === 'failed');
  const optionalFailures = gateResults.filter((gate) => !gate.required && gate.state === 'failed');

  return {
    state: requiredFailures.length > 0 ? 'failed' : optionalFailures.length > 0 ? 'warning' : 'passed',
    gates: gateResults,
    failures: requiredFailures.flatMap((gate) => gate.failures),
    warnings: optionalFailures.flatMap((gate) => gate.failures),
  };
}

function normalizeEvidenceRefs(packet) {
  if (Array.isArray(packet?.evidenceRefs)) {
    return packet.evidenceRefs;
  }
  if (!Array.isArray(packet?.repoIntakeRefs)) {
    return [];
  }
  return packet.repoIntakeRefs.map((artifactRef, index) => ({
    id: `legacy-repo-intake-${index + 1}`,
    capability: REPO_INTAKE_GRAPH_CAPABILITY,
    artifactRef,
    generatedAt: null,
    sha256: null,
    sourceFiles: [],
    legacy: true,
  }));
}

function evaluateGate({ gate, refs, sessionRoot, packetVersion }) {
  const failures = [];
  const capabilities = Array.isArray(gate.requiredCapabilityIds) ? gate.requiredCapabilityIds : [];
  for (const capability of capabilities) {
    const candidates = refs.filter((ref) => ref.capability === capability && evidenceRefAllowed(gate, ref));
    if (candidates.length === 0) {
      failures.push(
        createEvidenceGateFailure({
          gateId: gate.id,
          capability,
          reason: 'missing',
          packetVersion,
        }),
      );
      continue;
    }

    const candidateResults = candidates.map((ref) => validateEvidenceRef({ ref, freshnessPolicy: gate.freshnessPolicy, sessionRoot }));
    if (candidateResults.some((result) => result.ok)) {
      continue;
    }

    const selected = selectFailure(candidateResults);
    failures.push(
      createEvidenceGateFailure({
        gateId: gate.id,
        capability,
        reason: selected.reason,
        evidenceRefId: selected.evidenceRefId,
        packetVersion,
      }),
    );
  }

  return {
    id: gate.id,
    required: gate.required === true,
    requiredCapabilityIds: capabilities,
    freshnessPolicy: gate.freshnessPolicy,
    message: gate.message,
    state: failures.length > 0 ? 'failed' : 'passed',
    failures,
  };
}

function evidenceRefAllowed(gate, ref) {
  return !Array.isArray(gate.evidenceRefIds) || gate.evidenceRefIds.includes(ref.id);
}

function validateEvidenceRef({ ref, freshnessPolicy, sessionRoot }) {
  if (ref.legacy) {
    return { ok: true };
  }
  if (!isSafeSessionRef(ref.artifactRef)) {
    return failure('invalid', ref.id);
  }

  const artifactPath = path.join(sessionRoot, ref.artifactRef);
  if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
    return failure('missing', ref.id);
  }

  const artifactSha = sha256File(artifactPath);
  if (artifactSha !== ref.sha256) {
    return failure('invalid', ref.id);
  }

  const schemaResult = validateArtifactSchema({ ref, artifactPath });
  if (!schemaResult.ok) {
    return failure(schemaResult.reason, ref.id);
  }

  const sourceResult = validateSources({ ref, artifactPath, freshnessPolicy, sessionRoot });
  if (!sourceResult.ok) {
    return failure(sourceResult.reason, ref.id);
  }

  return { ok: true };
}

function validateArtifactSchema({ ref, artifactPath }) {
  if (ref.capability !== REPO_INTAKE_GRAPH_CAPABILITY) {
    return { ok: true };
  }

  let artifact;
  try {
    artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (!artifact || artifact.kind !== 'bmad-workspace-graph-evidence' || artifact.schemaVersion !== 1) {
    return { ok: false, reason: 'invalid' };
  }
  if (!artifact.summary || typeof artifact.summary !== 'object') {
    return { ok: false, reason: 'invalid' };
  }
  if (artifact.summary.state === 'missing') {
    return { ok: false, reason: 'missing' };
  }
  if ((artifact.repos || []).some((repo) => repo.state === 'missing')) {
    return { ok: false, reason: 'missing' };
  }

  for (const repo of artifact.repos || []) {
    for (const graphArtifact of repo.artifacts || []) {
      if (graphArtifact.validationState === 'missing') {
        return { ok: false, reason: 'missing' };
      }
      if (graphArtifact.validationState === 'warning' && (graphArtifact.sourcePathMissing || []).length > 0) {
        return { ok: false, reason: 'missing' };
      }
      if (graphArtifact.validationState && graphArtifact.validationState !== 'valid') {
        return { ok: false, reason: 'invalid' };
      }
    }
  }

  if (artifact.summary.state !== 'valid') {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true };
}

function validateSources({ ref, artifactPath, freshnessPolicy, sessionRoot }) {
  const artifactStat = fs.statSync(artifactPath);
  for (const source of ref.sourceFiles || []) {
    if (!source || !isSafeSessionRef(source.path)) {
      return { ok: false, reason: 'invalid' };
    }
    const sourcePath = path.join(sessionRoot, source.path);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      return { ok: false, reason: 'missing' };
    }
    if (freshnessPolicy === 'source-hash' && !source.sha256) {
      return { ok: false, reason: 'invalid' };
    }
    if (source.sha256 && sha256File(sourcePath) !== source.sha256) {
      return { ok: false, reason: 'invalid' };
    }
    if (freshnessPolicy === 'mtime' && fs.statSync(sourcePath).mtimeMs > artifactStat.mtimeMs) {
      return { ok: false, reason: 'stale' };
    }
  }
  return { ok: true };
}

function selectFailure(results) {
  for (const reason of ['invalid', 'stale', 'missing']) {
    const match = results.find((result) => result.reason === reason);
    if (match) {
      return match;
    }
  }
  return results[0] || { reason: 'invalid' };
}

function failure(reason, evidenceRefId) {
  return { ok: false, reason, evidenceRefId };
}

function isSafeSessionRef(ref) {
  return typeof ref === 'string' && ref.trim() !== '' && !ref.includes('\\') && !path.isAbsolute(ref) && !ref.split('/').includes('..');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

module.exports = {
  EVIDENCE_GATE_FAILED,
  PACKET_VERSION_WITH_EVIDENCE_GATES,
  REPO_INTAKE_GRAPH_CAPABILITY,
  VALID_FRESHNESS_POLICIES,
  createEvidenceGateFailure,
  evaluateEvidenceGates,
  normalizeEvidenceRefs,
};
