const fs = require('node:fs');
const path = require('node:path');
const { DRAFT_STATES } = require('./constants');
const { forgeError } = require('./errors');
const { assertSafeRelativePath, resolveUnderRoot } = require('./paths');
const { parseToml } = require('./toml');

const TOML_TOP_LEVEL_FIELDS = Object.freeze([
  'artifacts',
  'bmad',
  'capabilities',
  'description',
  'evidence_refs',
  'pack_id',
  'provenance',
  'schema_version',
  'slug',
  'status',
  'title',
  'workspace_runtime_change',
]);
const TOML_BMAD_FIELDS = Object.freeze(['export_mode', 'module_code', 'parent_module']);
const TOML_PROVENANCE_FIELDS = Object.freeze(['forge_run_id', 'generated_at', 'source']);
const TOML_EVIDENCE_REF_FIELDS = Object.freeze(['id', 'line_end', 'line_start', 'purpose', 'purposes', 'sha256', 'uri']);
const TOML_CAPABILITY_FIELDS = Object.freeze(['acceptance', 'evidence_refs', 'id', 'intent', 'menu_code', 'status', 'title']);
const TOML_ARTIFACT_FIELDS = Object.freeze(['kind', 'path', 'status']);

async function validateDraft({ config, store, slug, writeReport = true }) {
  const graph = await store.getPackGraph(slug);
  const tomlPath = resolveUnderRoot(config.project_root, `.capability-forge/drafts/${slug}/pack-draft.toml`, 'pack-draft.toml');
  if (!fs.existsSync(tomlPath)) {
    throw forgeError('FORGE_DRAFT_TOML_MISSING', `pack-draft.toml missing: ${tomlPath}`);
  }
  const parsed = parseToml(fs.readFileSync(tomlPath, 'utf8'), tomlPath);
  const issues = [];
  rejectUnsupportedFields(parsed, TOML_TOP_LEVEL_FIELDS, 'top-level', issues);
  rejectUnsupportedFields(parsed.bmad, TOML_BMAD_FIELDS, 'bmad', issues);
  rejectUnsupportedFields(parsed.provenance, TOML_PROVENANCE_FIELDS, 'provenance', issues);

  if (parsed.schema_version !== 'capability-pack-draft.v2') {
    issues.push('schema_version must be capability-pack-draft.v2');
  }
  if (parsed.slug !== slug || parsed.slug !== graph.pack.slug) {
    issues.push('slug must match requested pack draft');
  }
  if (parsed.pack_id !== graph.pack.pack_id) {
    issues.push('pack_id must match database draft');
  }
  if (parsed.title !== graph.pack.title) {
    issues.push('title must match database draft');
  }
  if ((parsed.description || '') !== (graph.pack.description || '')) {
    issues.push('description must match database draft');
  }
  if (parsed.workspace_runtime_change !== false) {
    issues.push('workspace_runtime_change must be false');
  }
  if (parsed.bmad?.module_code !== graph.pack.bmad_module_code) {
    issues.push('bmad.module_code must match database draft');
  }
  if (parsed.bmad?.parent_module !== graph.pack.bmad_parent_module) {
    issues.push('bmad.parent_module must match database draft');
  }
  if (parsed.bmad?.export_mode !== 'draft_only') {
    issues.push('bmad.export_mode must be draft_only');
  }
  if (!DRAFT_STATES.includes(parsed.status)) {
    issues.push(`status must be one of ${DRAFT_STATES.join(', ')}`);
  }
  if (Number(parsed.provenance?.forge_run_id) !== Number(graph.pack.created_by_run_id || 0)) {
    issues.push('provenance.forge_run_id must match database draft');
  }
  if ((parsed.provenance?.generated_at || '') !== new Date(0).toISOString()) {
    issues.push('provenance.generated_at must be the deterministic forge draft marker');
  }
  if (parsed.provenance?.source !== 'capability-pack-forge-v2') {
    issues.push('provenance.source must be capability-pack-forge-v2');
  }
  const artifactsByKey = new Map(graph.artifacts.map((artifact) => [`${artifact.kind}:${artifact.relative_path}`, artifact]));
  const parsedArtifacts = Array.isArray(parsed.artifacts) ? parsed.artifacts : [];
  if (!Array.isArray(parsed.artifacts)) {
    issues.push('artifacts must be an array');
  }
  const parsedArtifactKeys = new Set();
  for (const artifact of parsedArtifacts) {
    rejectUnsupportedFields(artifact, TOML_ARTIFACT_FIELDS, 'artifacts', issues);
    try {
      assertSafeRelativePath(artifact.path, 'artifact.path');
      const artifactKey = `${artifact.kind}:${artifact.path}`;
      if (parsedArtifactKeys.has(artifactKey)) {
        issues.push(`duplicate artifact in TOML draft: ${artifactKey}`);
      }
      parsedArtifactKeys.add(artifactKey);
      if (!isAllowedArtifactPath(slug, artifact.kind, artifact.path)) {
        issues.push(`artifact path is outside draft/report roots: ${artifact.path}`);
      }
      const databaseArtifact = artifactsByKey.get(artifactKey);
      if (!databaseArtifact) {
        issues.push(`artifact does not match database draft: ${artifact.kind}:${artifact.path}`);
      } else if (artifact.status !== 'draft') {
        issues.push(`artifact status must remain draft in TOML review contract for ${artifactKey}`);
      }
    } catch (error) {
      issues.push(error.message);
    }
  }
  for (const artifact of graph.artifacts) {
    const artifactKey = `${artifact.kind}:${artifact.relative_path}`;
    if (!parsedArtifactKeys.has(artifactKey)) {
      issues.push(`artifact missing from TOML draft: ${artifactKey}`);
    }
  }
  const evidenceRefs = Array.isArray(graph.evidenceRefs) ? graph.evidenceRefs : [];
  const knownRefs = new Set(evidenceRefs.map((entry) => entry.ref));
  const evidenceRefsByRef = aggregateEvidenceRefsByRef(evidenceRefs);
  const expectedEvidenceRefsByCapabilityId = evidenceRefsByCapabilityId(evidenceRefs);
  const parsedEvidenceRefs = Array.isArray(parsed.evidence_refs) ? parsed.evidence_refs : [];
  if (!Array.isArray(parsed.evidence_refs)) {
    issues.push('evidence_refs must be an array');
  }
  const parsedEvidenceRefsById = new Map();
  for (const evidenceRef of parsedEvidenceRefs) {
    rejectUnsupportedFields(evidenceRef, TOML_EVIDENCE_REF_FIELDS, 'evidence_refs', issues);
    if (parsedEvidenceRefsById.has(evidenceRef.id)) {
      issues.push(`duplicate evidence ref in TOML draft: ${evidenceRef.id}`);
      continue;
    }
    parsedEvidenceRefsById.set(evidenceRef.id, evidenceRef);
    const databaseEvidenceRef = evidenceRefsByRef.get(evidenceRef.id);
    if (!databaseEvidenceRef) {
      issues.push(`evidence ref does not match database draft: ${evidenceRef.id}`);
      continue;
    }
    if (evidenceRef.uri !== databaseEvidenceRef.uri) {
      issues.push(`evidence uri must match database draft for ${evidenceRef.id}`);
    }
    if (evidenceRef.sha256 !== databaseEvidenceRef.sha256) {
      issues.push(`evidence sha256 must match database draft for ${evidenceRef.id}`);
    }
    if (!Number.isInteger(evidenceRef.line_start) || evidenceRef.line_start !== Number(databaseEvidenceRef.line_start)) {
      issues.push(`evidence line_start must match database draft for ${evidenceRef.id}`);
    }
    if (!Number.isInteger(evidenceRef.line_end) || evidenceRef.line_end !== Number(databaseEvidenceRef.line_end)) {
      issues.push(`evidence line_end must match database draft for ${evidenceRef.id}`);
    }
    const parsedPurposes = evidenceRefPurposes(evidenceRef);
    for (const issue of parsedPurposes.issues) {
      issues.push(`${issue} for ${evidenceRef.id}`);
    }
    if (parsedPurposes.values.length > 0 && !sameStringSet(parsedPurposes.values, databaseEvidenceRef.purposes)) {
      issues.push(`evidence purposes must match database draft for ${evidenceRef.id}`);
    }
  }
  const capabilitiesById = new Map(graph.capabilities.map((capability) => [capability.capability_id, capability]));
  const parsedCapabilities = Array.isArray(parsed.capabilities) ? parsed.capabilities : [];
  const parsedCapabilitiesById = new Map();
  const referencedCapabilityRefs = new Set();
  for (const capability of parsedCapabilities) {
    rejectUnsupportedFields(capability, TOML_CAPABILITY_FIELDS, 'capabilities', issues);
    if (parsedCapabilitiesById.has(capability.id)) {
      issues.push(`duplicate capability in TOML draft: ${capability.id}`);
      continue;
    }
    parsedCapabilitiesById.set(capability.id, capability);
    const databaseCapability = capabilitiesById.get(capability.id);
    if (!databaseCapability) {
      issues.push(`capability does not match database draft: ${capability.id}`);
      continue;
    }
    if (capability.menu_code !== databaseCapability.menu_code) {
      issues.push(`menu_code must match database draft for ${capability.id}`);
    }
    if (capability.title !== databaseCapability.title) {
      issues.push(`title must match database draft for ${capability.id}`);
    }
    if (capability.intent !== databaseCapability.intent) {
      issues.push(`intent must match database draft for ${capability.id}`);
    }
    if (capability.status !== databaseCapability.status) {
      issues.push(`status must match database draft for ${capability.id}`);
    }
    const capabilityEvidenceRefs = Array.isArray(capability.evidence_refs) ? capability.evidence_refs : [];
    if (!Array.isArray(capability.evidence_refs)) {
      issues.push(`evidence_refs must be an array for ${capability.id}`);
    }
    for (const duplicateRef of duplicateStrings(capabilityEvidenceRefs)) {
      issues.push(`duplicate evidence ref for ${capability.id}: ${duplicateRef}`);
    }
    if (!sameStringSet(capabilityEvidenceRefs, expectedEvidenceRefsByCapabilityId.get(capability.id) || [])) {
      issues.push(`evidence_refs must match database draft for ${capability.id}`);
    }
    for (const evidenceRef of capabilityEvidenceRefs) {
      referencedCapabilityRefs.add(evidenceRef);
      if (!knownRefs.has(evidenceRef)) {
        issues.push(`unknown evidence ref: ${evidenceRef}`);
        continue;
      }
      const databaseEvidenceRef = evidenceRefsByRef.get(evidenceRef);
      if (databaseEvidenceRef?.invalidStaleValue) {
        issues.push(`evidence stale must be boolean for ${evidenceRef}`);
      }
      if (!databaseEvidenceRef?.hasStaleState) {
        issues.push(`evidence stale state missing for ${evidenceRef}`);
      }
    }
  }
  for (const evidenceRef of referencedCapabilityRefs) {
    if (!parsedEvidenceRefsById.has(evidenceRef)) {
      issues.push(`evidence ref missing from TOML draft: ${evidenceRef}`);
    }
  }
  for (const databaseCapability of graph.capabilities) {
    if (!parsedCapabilitiesById.has(databaseCapability.capability_id)) {
      issues.push(`capability missing from TOML draft: ${databaseCapability.capability_id}`);
    }
  }

  if (issues.length > 0) {
    throw forgeError('FORGE_DRAFT_INVALID', issues.join('; '));
  }

  const staleRefs = staleReferencedEvidenceRefs(parsed, graph);
  if (staleRefs.length > 0) {
    throw forgeError(
      'FORGE_DRAFT_STALE_EVIDENCE',
      `pack-draft.toml references stale evidence: ${staleRefs.join(', ')}; re-run ingest and draft before review, export-bmad, or promote`,
    );
  }

  if (parsed.status !== graph.pack.status) {
    throw forgeError('FORGE_DRAFT_INVALID', 'status must match database draft; TOML status is review-only');
  }

  const reportPath = resolveUnderRoot(config.project_root, `.capability-forge/reports/validation-${slug}.md`, 'validation report');
  if (writeReport) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      [
        `# Validation Report: ${slug}`,
        '',
        '- Result: PASS',
        '- Boundary: draft/export validation only; no BMAD workflow executed.',
        '- TOML was parsed and matched against database-backed compiler state before export/promotion.',
        '',
      ].join('\n'),
    );
  }
  return {
    ok: true,
    reportPath,
    status: graph.pack.status,
  };
}

function rejectUnsupportedFields(value, allowedFields, scope, issues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }
  const allowed = new Set(allowedFields);
  for (const field of Object.keys(value).sort()) {
    if (!allowed.has(field)) {
      issues.push(`unsupported ${scope} field in TOML draft: ${field}`);
    }
  }
}

function sameStringSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function duplicateStrings(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function evidenceRefsByCapabilityId(evidenceRefs) {
  const refsByCapabilityId = new Map();
  for (const evidenceRef of evidenceRefs) {
    if (!evidenceRef.capability_id) {
      continue;
    }
    if (!refsByCapabilityId.has(evidenceRef.capability_id)) {
      refsByCapabilityId.set(evidenceRef.capability_id, []);
    }
    const refs = refsByCapabilityId.get(evidenceRef.capability_id);
    if (!refs.includes(evidenceRef.ref)) {
      refs.push(evidenceRef.ref);
    }
  }
  return refsByCapabilityId;
}

function aggregateEvidenceRefsByRef(evidenceRefs) {
  const refsById = new Map();
  for (const evidenceRef of evidenceRefs) {
    if (!refsById.has(evidenceRef.ref)) {
      refsById.set(evidenceRef.ref, {
        ...evidenceRef,
        hasStaleState: false,
        invalidStaleValue: false,
        purposes: [],
        stale: false,
      });
    }
    const aggregate = refsById.get(evidenceRef.ref);
    const purpose = evidenceRef.purpose || 'source';
    if (!aggregate.purposes.includes(purpose)) {
      aggregate.purposes.push(purpose);
      aggregate.purposes.sort();
    }
    if (typeof evidenceRef.stale === 'boolean') {
      aggregate.hasStaleState = true;
      aggregate.stale = aggregate.stale || evidenceRef.stale;
    } else if (evidenceRef.stale !== undefined) {
      aggregate.invalidStaleValue = true;
    }
  }
  return refsById;
}

function evidenceRefPurposes(evidenceRef) {
  if (Array.isArray(evidenceRef.purposes)) {
    const values = evidenceRef.purposes
      .map((purpose) => String(purpose).trim())
      .filter(Boolean)
      .sort();
    return {
      issues:
        values.length === evidenceRef.purposes.length && values.length > 0 ? [] : ['evidence purposes must be a non-empty string array'],
      values,
    };
  }
  if (typeof evidenceRef.purpose === 'string' && evidenceRef.purpose.trim()) {
    return { issues: [], values: [evidenceRef.purpose.trim()] };
  }
  return { issues: ['evidence purpose or purposes must be present'], values: [] };
}

function staleReferencedEvidenceRefs(parsed, graph) {
  const evidenceRefs = Array.isArray(graph.evidenceRefs) ? graph.evidenceRefs : [];
  const staleRefs = new Set(evidenceRefs.filter((entry) => entry.stale === true).map((entry) => entry.ref));
  const referencedRefs = new Set();
  for (const capability of parsed.capabilities || []) {
    for (const evidenceRef of capability.evidence_refs || []) {
      referencedRefs.add(evidenceRef);
    }
  }
  return [...referencedRefs].filter((evidenceRef) => staleRefs.has(evidenceRef)).sort();
}

function isAllowedArtifactPath(slug, kind, artifactPath) {
  if (kind === 'validation_report') {
    return artifactPath === `.capability-forge/reports/validation-${slug}.md`;
  }
  return artifactPath.startsWith(`.capability-forge/drafts/${slug}/`);
}

module.exports = {
  isAllowedArtifactPath,
  staleReferencedEvidenceRefs,
  validateDraft,
};
