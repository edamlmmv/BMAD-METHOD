const { forgeError } = require('./errors');
const { ARTIFACT_KINDS } = require('./constants');

let tomlLibrary;

const TOML_POSTGRESQL_BMAD_INTEGRATION_SECTION = Object.freeze({
  title: 'TOML/PostgreSQL/BMAD Integration Notes',
  bullets: Object.freeze([
    'TOML is review/authoring only, not verifier truth.',
    'Use connection pooling and connection limits for live compiler stores.',
    'Keep transactions short; do not hold locks across external work.',
    'Use advisory locks for promotion-like coordination.',
    'Index lookup, WHERE, and JOIN columns; use composite indexes for common multi-column lookups.',
    'Use partial indexes for common lifecycle-state filters.',
    'Configure idle timeouts for live PostgreSQL sessions.',
    'CAPABILITY_FORGE_DATABASE_URL gates optional live compiler work only.',
    'PostgreSQL MCP is advisory evidence only, not Forge infrastructure.',
    'BMAD export/promotion remains explicit human review and approval.',
  ]),
});

function getTomlLibrary() {
  if (!tomlLibrary) {
    // Keep the dependency behind this adapter so Forge v1 remains parser-free.
    tomlLibrary = require('smol-toml');
  }
  return tomlLibrary;
}

function parseToml(content, label = 'TOML') {
  try {
    return getTomlLibrary().parse(content);
  } catch (error) {
    throw forgeError('FORGE_TOML_INVALID', `${label} contains invalid TOML: ${error.message}`);
  }
}

function quoteTomlString(value) {
  return JSON.stringify(String(value));
}

function renderArray(values) {
  return `[${values.map((value) => quoteTomlString(value)).join(', ')}]`;
}

function renderPackDraftToml({ pack, capabilities, evidenceRefs, artifacts }) {
  const lines = [
    '# Review-only artifact: v1 JSON remains canonical; Workspace verify-capability does not read this TOML.',
    'schema_version = "capability-pack-draft.v2"',
    `slug = ${quoteTomlString(pack.slug)}`,
    `pack_id = ${quoteTomlString(pack.pack_id)}`,
    `title = ${quoteTomlString(pack.title)}`,
    `description = ${quoteTomlString(pack.description || '')}`,
    `status = ${quoteTomlString(pack.status)}`,
    'workspace_runtime_change = false',
    '',
    '[bmad]',
    `module_code = ${quoteTomlString(pack.bmad_module_code)}`,
    `parent_module = ${quoteTomlString(pack.bmad_parent_module)}`,
    'export_mode = "draft_only"',
    '',
    '[provenance]',
    `forge_run_id = ${Number(pack.created_by_run_id || 0)}`,
    `generated_at = ${quoteTomlString(pack.generated_at || new Date(0).toISOString())}`,
    'source = "capability-pack-forge-v2"',
    '',
  ];

  for (const evidenceRef of sortEvidenceRefs(aggregateEvidenceRefsByRef(evidenceRefs))) {
    lines.push(
      '[[evidence_refs]]',
      `id = ${quoteTomlString(evidenceRef.ref)}`,
      `uri = ${quoteTomlString(evidenceRef.uri)}`,
      `sha256 = ${quoteTomlString(evidenceRef.sha256)}`,
      `line_start = ${Number(evidenceRef.line_start)}`,
      `line_end = ${Number(evidenceRef.line_end)}`,
    );
    if (evidenceRef.purposes.length === 1) {
      lines.push(`purpose = ${quoteTomlString(evidenceRef.purposes[0])}`);
    } else {
      lines.push(`purposes = ${renderArray(evidenceRef.purposes)}`);
    }
    lines.push('');
  }

  for (const capability of sortCapabilities(capabilities)) {
    lines.push(
      '[[capabilities]]',
      `id = ${quoteTomlString(capability.capability_id)}`,
      `menu_code = ${quoteTomlString(capability.menu_code)}`,
      `title = ${quoteTomlString(capability.title)}`,
      `intent = ${quoteTomlString(capability.intent)}`,
      `status = ${quoteTomlString(capability.status)}`,
      `evidence_refs = ${renderArray(uniqueSortedStrings(capability.evidence_refs || []))}`,
      'acceptance = [',
    );
    for (const acceptance of capability.acceptance || []) {
      lines.push(`  ${quoteTomlString(acceptance)},`);
    }
    lines.push(']', '');
  }

  for (const artifact of sortArtifacts(artifacts)) {
    lines.push(
      '[[artifacts]]',
      `kind = ${quoteTomlString(artifact.kind)}`,
      `path = ${quoteTomlString(artifact.relative_path)}`,
      `status = ${quoteTomlString(artifact.status || 'draft')}`,
      '',
    );
  }

  const toml = `${lines.join('\n')}\n`;
  parseToml(toml, 'generated pack-draft.toml');
  return toml;
}

function compareStrings(left, right) {
  const leftText = String(left || '');
  const rightText = String(right || '');
  if (leftText < rightText) {
    return -1;
  }
  if (leftText > rightText) {
    return 1;
  }
  return 0;
}

function compareNumbers(left, right) {
  const leftNumber = Number.isFinite(Number(left)) ? Number(left) : Number.MAX_SAFE_INTEGER;
  const rightNumber = Number.isFinite(Number(right)) ? Number(right) : Number.MAX_SAFE_INTEGER;
  return leftNumber - rightNumber;
}

function uniqueSortedStrings(values) {
  return [...new Set(values.map(String))].sort(compareStrings);
}

function sortCapabilities(capabilities) {
  return [...capabilities].sort(
    (left, right) =>
      compareNumbers(left.sort_order, right.sort_order) ||
      compareStrings(left.capability_id, right.capability_id) ||
      compareStrings(left.menu_code, right.menu_code),
  );
}

function sortEvidenceRefs(evidenceRefs) {
  return [...evidenceRefs].sort(
    (left, right) =>
      compareStrings(left.uri, right.uri) ||
      compareNumbers(left.line_start, right.line_start) ||
      compareNumbers(left.line_end, right.line_end) ||
      compareStrings(left.ref, right.ref),
  );
}

function sortArtifacts(artifacts) {
  return [...artifacts].sort(
    (left, right) =>
      compareNumbers(ARTIFACT_KINDS.indexOf(left.kind), ARTIFACT_KINDS.indexOf(right.kind)) ||
      compareStrings(left.relative_path, right.relative_path),
  );
}

function aggregateEvidenceRefsByRef(evidenceRefs) {
  const refsById = new Map();
  for (const evidenceRef of evidenceRefs) {
    if (!refsById.has(evidenceRef.ref)) {
      refsById.set(evidenceRef.ref, {
        ...evidenceRef,
        purposes: [],
      });
    }
    const aggregate = refsById.get(evidenceRef.ref);
    const purpose = evidenceRef.purpose || 'source';
    if (!aggregate.purposes.includes(purpose)) {
      aggregate.purposes.push(purpose);
      aggregate.purposes.sort();
    }
  }
  return [...refsById.values()];
}

function getTomlPostgresqlBmadIntegrationSection() {
  return {
    title: TOML_POSTGRESQL_BMAD_INTEGRATION_SECTION.title,
    bullets: [...TOML_POSTGRESQL_BMAD_INTEGRATION_SECTION.bullets],
  };
}

function renderAdvisorySections(advisorySections = []) {
  const lines = [];
  for (const section of advisorySections) {
    if (!section || typeof section !== 'object') {
      continue;
    }
    const sectionTitle = String(section.title || 'Advisory Notes').trim();
    if (!sectionTitle) {
      continue;
    }
    const bullets = Array.isArray(section.bullets) ? section.bullets.map((bullet) => String(bullet).trim()).filter(Boolean) : [];
    lines.push(`## ${sectionTitle}`, '');
    for (const bullet of bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  }
  return lines;
}

function stringifyReviewPacket({ title, skill, pack, boundary, advisorySections = [] }) {
  return [
    `# ${title}`,
    '',
    'Handoff artifact only. Forge generated this packet for human review.',
    '',
    `- Skill: \`${skill}\``,
    `- Pack: \`${pack.slug}\``,
    `- Status: \`${pack.status}\``,
    '',
    '## Boundary',
    '',
    boundary,
    '',
    ...renderAdvisorySections(advisorySections),
    'Forge must not invoke, satisfy, approve, or mark complete this BMAD workflow.',
    '',
  ].join('\n');
}

module.exports = {
  getTomlPostgresqlBmadIntegrationSection,
  parseToml,
  renderPackDraftToml,
  stringifyReviewPacket,
};
