const fs = require('node:fs');
const path = require('node:path');
const { DRAFT_STATES } = require('./constants');
const { forgeError } = require('./errors');
const { assertSafeRelativePath, resolveUnderRoot } = require('./paths');
const { parseToml } = require('./toml');

async function validateDraft({ config, store, slug, reconcile = true }) {
  const graph = await store.getPackGraph(slug);
  const tomlPath = resolveUnderRoot(config.project_root, `.capability-forge/drafts/${slug}/pack-draft.toml`, 'pack-draft.toml');
  if (!fs.existsSync(tomlPath)) {
    throw forgeError('FORGE_DRAFT_TOML_MISSING', `pack-draft.toml missing: ${tomlPath}`);
  }
  const parsed = parseToml(fs.readFileSync(tomlPath, 'utf8'), tomlPath);
  const issues = [];

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
  const artifactKeys = new Set(graph.artifacts.map((artifact) => `${artifact.kind}:${artifact.relative_path}`));
  for (const artifact of parsed.artifacts || []) {
    try {
      assertSafeRelativePath(artifact.path, 'artifact.path');
      if (!isAllowedArtifactPath(slug, artifact.kind, artifact.path)) {
        issues.push(`artifact path is outside draft/report roots: ${artifact.path}`);
      }
      if (!artifactKeys.has(`${artifact.kind}:${artifact.path}`)) {
        issues.push(`artifact does not match database draft: ${artifact.kind}:${artifact.path}`);
      }
    } catch (error) {
      issues.push(error.message);
    }
  }
  const knownRefs = new Set(graph.evidenceRefs.map((entry) => entry.ref));
  const capabilitiesById = new Map(graph.capabilities.map((capability) => [capability.capability_id, capability]));
  for (const capability of parsed.capabilities || []) {
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
    for (const evidenceRef of capability.evidence_refs || []) {
      if (!knownRefs.has(evidenceRef)) {
        issues.push(`unknown evidence ref: ${evidenceRef}`);
      }
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

  if (reconcile && parsed.status !== graph.pack.status) {
    if (!['review_pending', 'approved', 'rejected'].includes(parsed.status)) {
      throw forgeError('FORGE_DRAFT_INVALID', `status ${parsed.status} cannot be imported from TOML`);
    }
    await store.withTransaction(async (client) => {
      await client.query(`UPDATE ${store.qualify('pack_draft')} SET status = $2, updated_at = now() WHERE id = $1`, [
        graph.pack.id,
        parsed.status,
      ]);
      await client.query(
        `
          INSERT INTO ${store.qualify('review_event')} (pack_draft_id, actor, event_type, comment_md)
          VALUES ($1, 'capability-forge', $2, 'Imported reviewed status from validated pack-draft.toml.')
        `,
        [graph.pack.id, parsed.status === 'approved' ? 'approved' : parsed.status === 'rejected' ? 'rejected' : 'commented'],
      );
    });
  }

  const reportPath = resolveUnderRoot(config.project_root, `.capability-forge/reports/validation-${slug}.md`, 'validation report');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      `# Validation Report: ${slug}`,
      '',
      '- Result: PASS',
      '- Boundary: draft/export validation only; no BMAD workflow executed.',
      '- TOML was parsed and reconciled before export/promotion.',
      '',
    ].join('\n'),
  );
  return {
    ok: true,
    reportPath,
    status: parsed.status,
  };
}

function staleReferencedEvidenceRefs(parsed, graph) {
  const staleRefs = new Set(graph.evidenceRefs.filter((entry) => entry.stale === true).map((entry) => entry.ref));
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
