/**
 * Capability Forge v2 deterministic contract tests.
 *
 * Usage: node test/test-capability-forge-v2.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const migrationPath = path.join(repoRoot, 'tools', 'capability-forge', 'migrations', '001_init.sql');

const { loadForgeConfig } = require('../tools/capability-forge/config');
const { getCapabilityForgeV2Help, parseFlags, runCapabilityForgeV2Cli } = require('../tools/capability-forge/cli');
const { ingestEvidence, splitIntoSpans } = require('../tools/capability-forge/ingest');
const { promoteDraft } = require('../tools/capability-forge/promote');
const { resolvePromotionTarget, resolveUnderRoot } = require('../tools/capability-forge/paths');
const { createPostgresStore } = require('../tools/capability-forge/store-postgres');
const { parseToml, renderPackDraftToml } = require('../tools/capability-forge/toml');
const { exportBmadArtifacts, renderModuleHelpCsv, renderModuleYaml, renderSkillMd } = require('../tools/capability-forge/export-bmad');
const { sha256, stripMigrationTransaction } = require('../tools/capability-forge/store-postgres');
const { validateDraft } = require('../tools/capability-forge/validate');

function makeTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capability-forge-v2-'));
  fs.mkdirSync(path.join(root, '.capability-forge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(root, '.agents', 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, 'evidence', 'notes.md'), '# Notes\n\nEvidence text.\n');
  return root;
}

function writeConfig(root, patch = '') {
  const content = [
    'schema_version = "capability-forge.v2"',
    '',
    '[database]',
    'url_env = "CAPABILITY_FORGE_DATABASE_URL"',
    'schema = "capability_forge_test"',
    'statement_timeout_ms = 5000',
    '',
    '[evidence]',
    'roots = ["evidence"]',
    'include = ["**/*.md", "**/*.txt", "**/*.csv", "**/*.toml"]',
    'exclude = ["**/node_modules/**", "**/.git/**", ".capability-forge/**"]',
    '',
    '[output]',
    'draft_root = ".capability-forge/drafts"',
    'report_root = ".capability-forge/reports"',
    '',
    '[workspace]',
    'write_mode = "draft_only"',
    'runtime_roots = [".agents/skills"]',
    '',
    '[bmad]',
    'default_parent_module = "bmm"',
    '',
    patch,
  ].join('\n');
  fs.writeFileSync(path.join(root, '.capability-forge', 'forge.toml'), content);
}

function testConfigContracts() {
  const root = makeTempProject();
  assert.throws(() => loadForgeConfig('.capability-forge/missing.toml', root), { code: 'FORGE_CONFIG_MISSING' });
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  assert.equal(config.schema_version, 'capability-forge.v2');
  assert.equal(config.workspace.write_mode, 'draft_only');
  assert.equal(config.project_root, root);

  fs.writeFileSync(
    path.join(root, '.capability-forge', 'forge.toml'),
    fs.readFileSync(path.join(root, '.capability-forge', 'forge.toml'), 'utf8').replace('draft_only', 'runtime'),
  );
  assert.throws(() => loadForgeConfig('.capability-forge/forge.toml', root), /workspace.write_mode must be "draft_only"/);
}

async function testV2CommandMissingConfigFailsBeforeDatabase() {
  const root = makeTempProject();
  await assert.rejects(() => runCapabilityForgeV2Cli(['ingest', '--config', '.capability-forge/missing.toml'], root, {}), {
    code: 'FORGE_CONFIG_MISSING',
  });
}

function testCliFlagParsing() {
  assert.deepEqual(parseFlags(['--slug', 'offline-sync', '--approved', '--allow-dirty']), {
    allowDirty: true,
    approved: true,
    slug: 'offline-sync',
  });
}

function testEvidenceSpans() {
  const spans = splitIntoSpans('# One\nalpha\n\n## Two\nbeta\n');
  assert.equal(spans.length, 2);
  assert.equal(spans[0].heading, 'One');
  assert.equal(spans[1].heading, 'Two');
}

function testTomlDraftContract() {
  const input = {
    artifacts: [{ kind: 'pack_toml', relative_path: '.capability-forge/drafts/offline-sync/pack-draft.toml', status: 'draft' }],
    capabilities: [
      {
        acceptance: ['Evidence refs resolve.'],
        capability_id: 'cap.offline-sync',
        evidence_refs: ['ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2'],
        intent: 'Review offline sync capability.',
        menu_code: 'OS',
        status: 'needs_review',
        title: 'Offline Sync',
      },
    ],
    evidenceRefs: [
      {
        line_end: 2,
        line_start: 1,
        purpose: 'source',
        ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        uri: 'evidence/notes.md',
      },
    ],
    pack: {
      bmad_module_code: 'OSYNC',
      bmad_parent_module: 'bmm',
      created_by_run_id: 1,
      description: '',
      generated_at: '1970-01-01T00:00:00.000Z',
      pack_id: 'capability-pack.offline-sync',
      slug: 'offline-sync',
      status: 'review_pending',
      title: 'Offline Sync',
    },
  };
  const first = renderPackDraftToml(input);
  const second = renderPackDraftToml(input);
  assert.equal(first, second, 'pack-draft.toml is deterministic');
  const parsed = parseToml(first, 'draft');
  assert.equal(parsed.schema_version, 'capability-pack-draft.v2');
  assert.equal(parsed.workspace_runtime_change, false);
}

function makeApprovedPackGraph(root, slug = 'offline-sync') {
  const graph = {
    artifacts: [{ kind: 'pack_toml', relative_path: `.capability-forge/drafts/${slug}/pack-draft.toml`, status: 'draft' }],
    capabilities: [
      {
        acceptance: ['Evidence refs resolve.'],
        capability_id: `cap.${slug}`,
        evidence_refs: ['ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2'],
        intent: 'Review offline sync capability.',
        menu_code: 'OS',
        status: 'needs_review',
        title: 'Offline Sync',
      },
    ],
    evidenceRefs: [
      {
        line_end: 2,
        line_start: 1,
        purpose: 'source',
        ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        uri: 'evidence/notes.md',
      },
    ],
    pack: {
      bmad_module_code: 'OSYNC',
      bmad_parent_module: 'bmm',
      created_by_run_id: 1,
      description: '',
      generated_at: '1970-01-01T00:00:00.000Z',
      id: 1,
      pack_id: `capability-pack.${slug}`,
      slug,
      status: 'approved',
      title: 'Offline Sync',
    },
  };
  const draftRoot = path.join(root, '.capability-forge', 'drafts', slug);
  fs.mkdirSync(draftRoot, { recursive: true });
  fs.writeFileSync(path.join(draftRoot, 'SKILL.md'), '# Offline Sync\n');
  fs.writeFileSync(path.join(draftRoot, 'module.yaml'), 'code: OSYNC\n');
  fs.writeFileSync(path.join(draftRoot, 'module-help.csv'), 'module,skill\n');
  fs.writeFileSync(path.join(draftRoot, 'pack-draft.toml'), renderPackDraftToml(graph));
  return graph;
}

function promotionSnapshot(root, slug = 'offline-sync') {
  const draftRoot = path.join(root, '.capability-forge', 'drafts', slug);
  return sha256(
    ['SKILL.md', 'module.yaml', 'module-help.csv']
      .map((fileName) => fs.readFileSync(path.join(draftRoot, fileName), 'utf8'))
      .join('\n---\n'),
  );
}

function makePromotionStore(graph, { locked = true, promotion = null } = {}) {
  const state = {
    locked,
    packStatus: graph.pack.status,
    promotion,
    reviewEvents: [],
  };
  const store = {
    async getPackGraph() {
      return {
        ...graph,
        pack: {
          ...graph.pack,
          status: state.packStatus,
        },
      };
    },
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async withTransaction(callback) {
      return callback({
        async query(sql, params = []) {
          if (/pg_try_advisory_xact_lock/.test(sql)) {
            return { rows: [{ locked: state.locked }], rowCount: 1 };
          }
          if (/SELECT status, artifact_snapshot_sha256/.test(sql)) {
            return { rows: state.promotion ? [state.promotion] : [], rowCount: state.promotion ? 1 : 0 };
          }
          if (/INSERT INTO capability_forge_test\.promotion/.test(sql)) {
            state.promotion = {
              artifact_snapshot_sha256: params[3],
              status: 'prepared',
              target_path: params[1],
            };
            return { rows: [], rowCount: 1 };
          }
          if (/UPDATE capability_forge_test\.pack_draft/.test(sql)) {
            state.packStatus = 'promoted';
            return { rows: [], rowCount: 1 };
          }
          if (/SET status = 'promoted'/.test(sql)) {
            state.promotion.status = 'promoted';
            return { rows: [], rowCount: 1 };
          }
          if (/SET status = 'failed'/.test(sql)) {
            state.promotion.status = 'failed';
            return { rows: [], rowCount: 1 };
          }
          if (/SET approved_by =/.test(sql)) {
            state.promotion = {
              artifact_snapshot_sha256: params[3],
              status: 'prepared',
              target_path: params[1],
            };
            return { rows: [], rowCount: 1 };
          }
          if (/INSERT INTO capability_forge_test\.review_event/.test(sql)) {
            state.reviewEvents.push(params);
            return { rows: [], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        },
      });
    },
  };
  return { state, store };
}

function makeValidationStore(graph) {
  const state = {
    reconciled: false,
  };
  const store = {
    async getPackGraph() {
      return graph;
    },
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async withTransaction(callback) {
      state.reconciled = true;
      return callback({
        async query() {
          return { rows: [], rowCount: 0 };
        },
      });
    },
  };
  return { state, store };
}

function testPathSafety() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  assert.throws(() => resolveUnderRoot(root, '../escape.md'), { code: 'FORGE_PATH_UNSAFE' });
  assert.throws(() =>
    resolvePromotionTarget({
      allowedRoots: config.workspace.runtime_roots,
      projectRoot: root,
      target: path.join(root, '.agents', 'skills', 'offline-sync'),
    }),
  );
  assert.throws(() => resolvePromotionTarget({ allowedRoots: config.workspace.runtime_roots, projectRoot: root, target: 'outside/pack' }));
  assert(
    resolvePromotionTarget({ allowedRoots: config.workspace.runtime_roots, projectRoot: root, target: '.agents/skills/offline-sync' }),
  );
}

async function testIngestMarksMissingEvidenceStale() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  let staleMarked = false;
  const store = {
    async createRun() {
      return 1;
    },
    async finishRun() {},
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async replaceEvidenceSpans() {},
    async upsertEvidenceFile() {
      return 1;
    },
    async withTransaction(callback) {
      await callback({
        async query(sql) {
          if (/UPDATE capability_forge_test\.evidence_file SET stale = true/.test(sql)) {
            staleMarked = true;
          }
          return { rows: [], rowCount: 0 };
        },
      });
    },
  };
  await ingestEvidence({ config, store });
  assert.equal(staleMarked, true, 'ingest marks missing evidence stale before refreshing seen files');
}

function testMigrationContract() {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const supportIndexSql = fs.readFileSync(
    path.join(repoRoot, 'tools', 'capability-forge', 'migrations', '002_support_indexes.sql'),
    'utf8',
  );
  assert(!/^\s*BEGIN;/i.test(stripMigrationTransaction(sql)), 'runner strips outer BEGIN before transactional apply');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS capability_forge.schema_migration'), 'migration tracks applied versions');
  assert(sql.includes("CHECK (checksum ~ '^[a-f0-9]{64}$')"), 'migration stores checksums');
  assert(sql.includes('workspace_runtime_change BOOLEAN NOT NULL DEFAULT false CHECK (workspace_runtime_change = false)'));
  assert(sql.includes("status IN ('ingested', 'drafted', 'review_pending', 'approved', 'rejected', 'promoted', 'superseded')"));
  assert(sql.includes('USING GIN (search_vector)'), 'migration creates full-text index');
  assert(sql.includes('REFERENCES capability_forge.evidence_span'), 'migration uses foreign keys');
  assert(supportIndexSql.includes('pack_draft_status_idx'), 'support migration indexes pack status');
  assert(supportIndexSql.includes('promotion_pack_status_idx'), 'support migration indexes promotion status');
  assert(supportIndexSql.includes('evidence_file_stale_seen_idx'), 'support migration indexes stale evidence scans');
  assert(supportIndexSql.includes('evidence_span_file_idx'), 'support migration indexes evidence span FK lookups');
  assert(supportIndexSql.includes('capability_evidence_ref_evidence_idx'), 'support migration indexes capability evidence FK lookups');
}

function testPostgresqlMcpNotRuntimeDependency() {
  const runtimeDir = path.join(repoRoot, 'tools', 'capability-forge');
  const files = fs
    .readdirSync(runtimeDir)
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => path.join(runtimeDir, entry));
  const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert(!/server-postgres|readonly-postgresql-mcp/.test(text), 'runtime code does not use PostgreSQL MCP package/interface as infra');
}

function testBmadExportsAreHandoffs() {
  const graph = {
    capabilities: [{ intent: 'Review evidence.', menu_code: 'OS', title: 'Offline Sync' }],
    evidenceRefs: [{ ref: 'ev:aaaa#L1-L2', uri: 'evidence/notes.md' }],
    pack: {
      bmad_module_code: 'OSYNC',
      bmad_parent_module: 'bmm',
      description: 'Offline sync draft.',
      slug: 'offline-sync',
      title: 'Offline Sync',
    },
  };
  assert(renderSkillMd(graph).includes('not runtime authority'));
  assert(renderModuleYaml(graph).includes('status: draft'));
  assert(renderModuleHelpCsv(graph).includes('anytime'));
}

async function testValidateBlocksReferencedStaleEvidenceBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.pack.status = 'review_pending';
  graph.evidenceRefs[0].stale = true;
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, reconcile: true, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_STALE_EVIDENCE');
      assert(error.message.includes(graph.evidenceRefs[0].ref));
      assert(error.message.includes('re-run ingest and draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'stale evidence fails before TOML status reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testExportBlocksReferencedStaleEvidenceBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs[0].stale = true;
  const { store } = makeValidationStore(graph);
  store.createRun = async () => {
    throw new Error('export-bmad must not create a run after stale evidence');
  };
  await assert.rejects(() => exportBmadArtifacts({ config, slug: 'offline-sync', store }), {
    code: 'FORGE_DRAFT_STALE_EVIDENCE',
  });
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'review.md')));
}

async function testPromoteBlocksReferencedStaleEvidenceBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs[0].stale = true;
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_DRAFT_STALE_EVIDENCE' },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testValidateAllowsUnreferencedStaleEvidence() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs.push({
    line_end: 4,
    line_start: 3,
    purpose: 'source',
    ref: 'ev:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb#L3-L4',
    sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    stale: true,
    uri: 'evidence/old-notes.md',
  });
  const { store } = makeValidationStore(graph);
  const result = await validateDraft({ config, reconcile: true, slug: 'offline-sync', store });
  assert.equal(result.ok, true);
}

async function testPromotionRollbackMarksFailed() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const failingFs = Object.create(fs);
  failingFs.copyFileSync = () => {
    throw new Error('disk full');
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        config,
        fileSystem: failingFs,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_COPY_FAILED' },
  );
  assert.equal(state.promotion.status, 'failed');
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.tmp-')).length, 0);
}

async function testPreparedPromotionRetryFinalizes() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const targetRoot = path.join(root, '.agents', 'skills', 'offline-sync');
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const fileName of ['SKILL.md', 'module.yaml', 'module-help.csv']) {
    fs.copyFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', fileName), path.join(targetRoot, fileName));
  }
  const { state, store } = makePromotionStore(graph, {
    promotion: {
      artifact_snapshot_sha256: promotionSnapshot(root),
      status: 'prepared',
      target_path: '.agents/skills/offline-sync',
    },
  });
  await promoteDraft({
    allowDirty: true,
    config,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert.equal(state.packStatus, 'promoted');
}

async function testConcurrentPromotionConflict() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph, { locked: false });
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_CONFLICT' },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testInvalidTomlBlocksPromote() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml'), 'schema_version = "broken"\n[');
  const { store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_TOML_INVALID' },
  );
}

async function testInvalidTomlBlocksExport() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml'), 'schema_version = "broken"\n[');
  const { store } = makeValidationStore(graph);
  store.createRun = async () => {
    throw new Error('export-bmad must not create a run after invalid TOML');
  };
  await assert.rejects(() => exportBmadArtifacts({ config, slug: 'offline-sync', store }), {
    code: 'FORGE_TOML_INVALID',
  });
}

function testV2CliPublicErrorSurface() {
  const root = makeTempProject();
  const result = require('node:child_process').spawnSync(
    process.execPath,
    [path.join(repoRoot, 'tools', 'capability-pack-forge.js'), 'migrate', '--config', '.capability-forge/missing.toml'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
    },
  );
  assert.notEqual(result.status, 0);
  assert(result.stderr.includes('FORGE_CONFIG_MISSING'), result.stderr);
}

function testV2HelpDocumentsRuntimeModel() {
  const help = getCapabilityForgeV2Help();
  assert(help.includes('migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote'));
  assert(help.includes('CAPABILITY_FORGE_DATABASE_URL'));
  assert(help.includes('direct pg adapter'));
  assert(help.includes('not PostgreSQL MCP'));
  assert(help.includes('v1 JSON --input/--output remains the source authority'));
  assert(help.includes('Stale referenced evidence blocks validate/export-bmad/promote'));
  assert(help.includes('status=failed'));
  assert(help.includes('Authority matrix'));
  assert(help.includes('Workspace verify-capability remains declared-contract only'));
  assert(help.includes('migrate: apply checked migrations'));
  assert(help.includes('promote: approved-only artifact promotion'));
}

function testDocsDocumentAuthorityMatrixAndStateMachine() {
  const docs = [
    path.join(repoRoot, 'tools', 'capability-forge', 'README.md'),
    path.join(repoRoot, 'docs', 'workspace', 'capability-pack-forge.md'),
    path.join(repoRoot, 'src', 'core-skills', 'bmad-capability-pack-forge', 'SKILL.md'),
  ]
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n');
  for (const required of [
    'Authority Matrix',
    'v1 JSON',
    'direct `pg` PostgreSQL',
    'Workspace `verify-capability`',
    'PostgreSQL MCP',
    'State Machine',
    'migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote',
    'FORGE_DRAFT_STALE_EVIDENCE',
    'FORGE_PROMOTE_CONFLICT',
    'FORGE_PROMOTE_RECONCILE_REQUIRED',
  ]) {
    assert(docs.includes(required), `Forge v2 docs include ${required}`);
  }
}

async function testOptionalPostgresMigration() {
  if (!process.env.CAPABILITY_FORGE_DATABASE_URL) {
    console.log('Skipping live PostgreSQL migration test: CAPABILITY_FORGE_DATABASE_URL unset');
    return;
  }
  const root = makeTempProject();
  writeConfig(root);
  const configText = fs.readFileSync(path.join(root, '.capability-forge', 'forge.toml'), 'utf8');
  fs.writeFileSync(
    path.join(root, '.capability-forge', 'forge.toml'),
    configText.replace('schema = "capability_forge_test"', `schema = "capability_forge_test_${process.pid}"`),
  );
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const store = createPostgresStore(config);
  try {
    const migrations = await store.migrate();
    assert(migrations.some((migration) => migration.version === '001_init'));
    await store.resetDev();
  } finally {
    await store.close();
  }
}

async function main() {
  testConfigContracts();
  await testV2CommandMissingConfigFailsBeforeDatabase();
  testCliFlagParsing();
  testEvidenceSpans();
  await testIngestMarksMissingEvidenceStale();
  testTomlDraftContract();
  testPathSafety();
  testMigrationContract();
  testPostgresqlMcpNotRuntimeDependency();
  testBmadExportsAreHandoffs();
  await testValidateBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testExportBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testPromoteBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testValidateAllowsUnreferencedStaleEvidence();
  await testPromotionRollbackMarksFailed();
  await testPreparedPromotionRetryFinalizes();
  await testConcurrentPromotionConflict();
  await testInvalidTomlBlocksPromote();
  await testInvalidTomlBlocksExport();
  testV2CliPublicErrorSurface();
  testV2HelpDocumentsRuntimeModel();
  testDocsDocumentAuthorityMatrixAndStateMachine();
  await testOptionalPostgresMigration();
  console.log('Capability Forge v2 tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
