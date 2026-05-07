const { forgeError } = require('./errors');

let tomlLibrary;

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

  for (const evidenceRef of evidenceRefs) {
    lines.push(
      '[[evidence_refs]]',
      `id = ${quoteTomlString(evidenceRef.ref)}`,
      `uri = ${quoteTomlString(evidenceRef.uri)}`,
      `sha256 = ${quoteTomlString(evidenceRef.sha256)}`,
      `line_start = ${Number(evidenceRef.line_start)}`,
      `line_end = ${Number(evidenceRef.line_end)}`,
      `purpose = ${quoteTomlString(evidenceRef.purpose || 'source')}`,
      '',
    );
  }

  for (const capability of capabilities) {
    lines.push(
      '[[capabilities]]',
      `id = ${quoteTomlString(capability.capability_id)}`,
      `menu_code = ${quoteTomlString(capability.menu_code)}`,
      `title = ${quoteTomlString(capability.title)}`,
      `intent = ${quoteTomlString(capability.intent)}`,
      `status = ${quoteTomlString(capability.status)}`,
      `evidence_refs = ${renderArray(capability.evidence_refs || [])}`,
      'acceptance = [',
    );
    for (const acceptance of capability.acceptance || []) {
      lines.push(`  ${quoteTomlString(acceptance)},`);
    }
    lines.push(']', '');
  }

  for (const artifact of artifacts) {
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

function stringifyReviewPacket({ title, skill, pack, boundary }) {
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
    'Forge must not invoke, satisfy, approve, or mark complete this BMAD workflow.',
    '',
  ].join('\n');
}

module.exports = {
  parseToml,
  renderPackDraftToml,
  stringifyReviewPacket,
};
