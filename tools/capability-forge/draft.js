const fs = require('node:fs');
const path = require('node:path');
const { ARTIFACT_KINDS, BMAD_HANDOFF_PACKETS } = require('./constants');
const { forgeError } = require('./errors');
const { renderPackDraftToml } = require('./toml');
const { assertSafeRelativePath, resolveUnderRoot } = require('./paths');

function normalizeSlug(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
    throw forgeError('FORGE_DRAFT_INVALID', 'slug must match ^[a-z0-9][a-z0-9-]*[a-z0-9]$');
  }
  return value;
}

function normalizeModuleCode(value, slug) {
  const moduleCode = value || slug.replaceAll('-', '').slice(0, 8).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,12}$/.test(moduleCode)) {
    throw forgeError('FORGE_DRAFT_INVALID', 'module code must match ^[A-Z][A-Z0-9]{1,12}$');
  }
  return moduleCode;
}

function defaultMenuCode(slug) {
  return slug
    .split('-')
    .map((part) => part[0])
    .join('')
    .slice(0, 6)
    .toUpperCase()
    .padEnd(2, 'X');
}

function draftArtifacts(slug) {
  const root = `.capability-forge/drafts/${slug}`;
  return [
    { kind: 'pack_toml', relative_path: `${root}/pack-draft.toml` },
    { kind: 'skill_md', relative_path: `${root}/SKILL.md` },
    { kind: 'module_yaml', relative_path: `${root}/module.yaml` },
    { kind: 'module_help_csv', relative_path: `${root}/module-help.csv` },
    { kind: 'review_md', relative_path: `${root}/review.md` },
    { kind: 'validation_report', relative_path: `.capability-forge/reports/validation-${slug}.md` },
    ...BMAD_HANDOFF_PACKETS.map((packet) => ({ kind: packet.kind, relative_path: `${root}/${packet.path}` })),
  ];
}

async function createDraft({ config, store, options }) {
  const slug = normalizeSlug(options.slug);
  const title = options.title || titleFromSlug(slug);
  const moduleCode = normalizeModuleCode(options.moduleCode, slug);
  const capabilityId = options.capabilityId || `cap.${slug}`;
  const capabilityTitle = options.capabilityTitle || title;
  const intent = options.intent || `Create a repeatable BMAD capability pack for ${title}.`;
  const runId = await store.createRun(`capability-forge draft ${slug}`);
  try {
    const result = await store.withTransaction(async (client) => {
      const evidenceResult = await client.query(
        `
          SELECT evidence_span.id, evidence_ref.ref
          FROM ${store.qualify('evidence_span')} AS evidence_span
          JOIN ${store.qualify('evidence_ref')} AS evidence_ref
            ON evidence_ref.evidence_span_id = evidence_span.id
          WHERE evidence_ref.stale = false
          ORDER BY evidence_ref.uri ASC, evidence_ref.line_start ASC
          LIMIT 25
        `,
      );
      if (evidenceResult.rowCount === 0) {
        throw forgeError('FORGE_DRAFT_NO_EVIDENCE', 'ingest evidence before drafting a pack');
      }

      const packResult = await client.query(
        `
          INSERT INTO ${store.qualify(
            'pack_draft',
          )} (slug, pack_id, title, description, status, bmad_module_code, bmad_parent_module, created_by_run_id)
          VALUES ($1, $2, $3, $4, 'review_pending', $5, $6, $7)
          ON CONFLICT (slug)
          DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = CASE
              WHEN ${store.qualify('pack_draft')}.status IN ('promoted') THEN ${store.qualify('pack_draft')}.status
              ELSE 'review_pending'
            END,
            bmad_module_code = EXCLUDED.bmad_module_code,
            bmad_parent_module = EXCLUDED.bmad_parent_module,
            updated_at = now()
          RETURNING *
        `,
        [slug, `capability-pack.${slug}`, title, options.description || '', moduleCode, config.bmad.default_parent_module, runId],
      );
      const pack = packResult.rows[0];
      if (pack.status === 'promoted') {
        throw forgeError('FORGE_DRAFT_PROMOTED', `cannot overwrite promoted pack draft: ${slug}`);
      }

      await client.query(`DELETE FROM ${store.qualify('capability_draft')} WHERE pack_draft_id = $1`, [pack.id]);
      const capabilityResult = await client.query(
        `
          INSERT INTO ${store.qualify(
            'capability_draft',
          )} (pack_draft_id, capability_id, menu_code, title, intent, body_md, status, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, 'needs_review', 0)
          RETURNING *
        `,
        [pack.id, capabilityId, options.menuCode || defaultMenuCode(slug), capabilityTitle, intent, options.bodyMd || ''],
      );
      const capability = capabilityResult.rows[0];
      for (const evidence of evidenceResult.rows) {
        await client.query(
          `
            INSERT INTO ${store.qualify('capability_evidence_ref')} (capability_draft_id, evidence_span_id, purpose)
            VALUES ($1, $2, 'source')
            ON CONFLICT DO NOTHING
          `,
          [capability.id, evidence.id],
        );
      }

      await client.query(`DELETE FROM ${store.qualify('artifact_draft')} WHERE pack_draft_id = $1`, [pack.id]);
      for (const artifact of draftArtifacts(slug)) {
        assertSafeRelativePath(artifact.relative_path, 'artifact.relative_path');
        if (!ARTIFACT_KINDS.includes(artifact.kind)) {
          throw forgeError('FORGE_ARTIFACT_INVALID', `unsupported artifact kind: ${artifact.kind}`);
        }
        await client.query(
          `
            INSERT INTO ${store.qualify('artifact_draft')} (pack_draft_id, kind, relative_path, status, generated_by_run_id)
            VALUES ($1, $2, $3, 'draft', $4)
          `,
          [pack.id, artifact.kind, artifact.relative_path, runId],
        );
      }
      await client.query(
        `
          INSERT INTO ${store.qualify('review_event')} (pack_draft_id, capability_draft_id, actor, event_type, comment_md)
          VALUES ($1, $2, 'capability-forge', 'created', 'Draft generated as review handoff; no BMAD workflow was executed.')
        `,
        [pack.id, capability.id],
      );
      return { pack };
    });

    const graph = await store.getPackGraph(slug);
    const toml = renderPackDraftToml({
      artifacts: graph.artifacts,
      capabilities: graph.capabilities.map((capability) => ({
        ...capability,
        acceptance: [
          'Capability references at least one local evidence span.',
          'Capability has a stable menu code.',
          'Capability can export BMAD draft artifacts without writing runtime folders.',
        ],
        evidence_refs: graph.evidenceRefs
          .filter((evidenceRef) => evidenceRef.capability_id === capability.capability_id)
          .map((evidenceRef) => evidenceRef.ref)
          .filter((evidenceRef, index, refs) => refs.indexOf(evidenceRef) === index),
      })),
      evidenceRefs: graph.evidenceRefs,
      pack: {
        ...graph.pack,
        generated_at: new Date(0).toISOString(),
      },
    });
    const tomlPath = resolveUnderRoot(config.project_root, `.capability-forge/drafts/${slug}/pack-draft.toml`, 'pack-draft.toml');
    fs.mkdirSync(path.dirname(tomlPath), { recursive: true });
    fs.writeFileSync(tomlPath, toml);
    await store.finishRun(runId, 'succeeded', `drafted ${slug}`);
    return {
      pack: result.pack.slug,
      runId,
      tomlPath,
    };
  } catch (error) {
    await store.finishRun(runId, 'failed', error.message);
    throw error;
  }
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

module.exports = {
  createDraft,
  draftArtifacts,
  normalizeSlug,
};
