/**
 * Capability Forge v2 deterministic contract tests.
 *
 * Usage: node test/test-capability-forge-v2.js
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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
const { createDraft, draftArtifacts } = require('../tools/capability-forge/draft');
const { createPostgresStore, createPostgresStoreFromPool } = require('../tools/capability-forge/store-postgres');
const { parseToml, renderPackDraftToml, stringifyReviewPacket } = require('../tools/capability-forge/toml');
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

async function testV2ConfigFailureDoesNotReadDatabaseEnv() {
  const root = makeTempProject();
  const poisonEnv = new Proxy(
    {},
    {
      get() {
        throw new Error('database env must not be read after config failure');
      },
    },
  );

  await assert.rejects(() => runCapabilityForgeV2Cli(['migrate', '--config', '.capability-forge/missing.toml'], root, poisonEnv), {
    code: 'FORGE_CONFIG_MISSING',
  });

  writeConfig(root);
  fs.writeFileSync(
    path.join(root, '.capability-forge', 'forge.toml'),
    fs.readFileSync(path.join(root, '.capability-forge', 'forge.toml'), 'utf8').replace('draft_only', 'runtime'),
  );
  await assert.rejects(() => runCapabilityForgeV2Cli(['migrate', '--config', '.capability-forge/forge.toml'], root, poisonEnv), {
    code: 'FORGE_CONFIG_INVALID',
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
        capability_id: 'cap.offline-sync',
        line_end: 2,
        line_start: 1,
        purpose: 'source',
        ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        stale: false,
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
  assert(
    first.includes('# Review-only artifact: v1 JSON remains canonical; Workspace verify-capability does not read this TOML.'),
    'pack-draft.toml warns that TOML is review-only and not Workspace verifier input',
  );
  const parsed = parseToml(first, 'draft');
  assert.equal(parsed.schema_version, 'capability-pack-draft.v2');
  assert.equal(parsed.workspace_runtime_change, false);
}

function testTomlDraftContractStableForEquivalentRowOrderNoise() {
  const artifacts = draftArtifacts('offline-sync').map((artifact) => ({
    ...artifact,
    status: 'draft',
  }));
  const capabilities = [
    {
      acceptance: ['Second capability remains deterministic.', 'Evidence refs resolve.'],
      capability_id: 'cap.review',
      evidence_refs: [
        'ev:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb#L4-L6',
        'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
      ],
      intent: 'Review offline sync handoff.',
      menu_code: 'RV',
      sort_order: 2,
      status: 'needs_review',
      title: 'Review Handoff',
    },
    {
      acceptance: ['Evidence refs resolve.', 'Draft is byte stable.'],
      capability_id: 'cap.offline-sync',
      evidence_refs: ['ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2'],
      intent: 'Review offline sync capability.',
      menu_code: 'OS',
      sort_order: 1,
      status: 'needs_review',
      title: 'Offline Sync',
    },
  ];
  const evidenceRefs = [
    {
      capability_id: 'cap.review',
      line_end: 6,
      line_start: 4,
      purpose: 'constraint',
      ref: 'ev:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb#L4-L6',
      sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      stale: false,
      uri: 'evidence/review.md',
    },
    {
      capability_id: 'cap.review',
      line_end: 2,
      line_start: 1,
      purpose: 'constraint',
      ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      stale: false,
      uri: 'evidence/notes.md',
    },
    {
      capability_id: 'cap.offline-sync',
      line_end: 2,
      line_start: 1,
      purpose: 'source',
      ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      stale: false,
      uri: 'evidence/notes.md',
    },
  ];
  const pack = {
    bmad_module_code: 'OSYNC',
    bmad_parent_module: 'bmm',
    created_by_run_id: 1,
    description: '',
    generated_at: '1970-01-01T00:00:00.000Z',
    pack_id: 'capability-pack.offline-sync',
    slug: 'offline-sync',
    status: 'review_pending',
    title: 'Offline Sync',
  };
  const first = renderPackDraftToml({
    artifacts,
    capabilities,
    evidenceRefs,
    pack,
  });
  const second = renderPackDraftToml({
    artifacts: artifacts.toReversed(),
    capabilities: capabilities.toReversed().map((capability) => ({
      ...capability,
      evidence_refs: capability.evidence_refs.toReversed(),
    })),
    evidenceRefs: evidenceRefs.toReversed(),
    pack,
  });
  assert.equal(first, second, 'equivalent compiler state renders byte-identical TOML despite row-order noise');
  const parsed = parseToml(first, 'row-order stable draft');
  assert.equal(parsed.evidence_refs[0].id, 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2');
  assert.equal(parsed.capabilities[0].id, 'cap.offline-sync');
  assert.equal(parsed.artifacts[0].kind, 'pack_toml');
}

async function testCreateDraftParsesGeneratedTomlBeforeWrite() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const slug = 'offline-sync';
  const pack = {
    bmad_module_code: 'OSYNC',
    bmad_parent_module: 'bmm',
    created_by_run_id: 1,
    description: '',
    id: 1,
    pack_id: 'capability-pack.offline-sync',
    slug,
    status: 'review_pending',
    title: 'Offline Sync',
  };
  const capability = {
    capability_id: 'cap.offline-sync',
    id: 7,
    intent: 'Review offline sync capability.',
    menu_code: 'OS',
    status: 'needs_review',
    title: 'Offline Sync',
  };
  const finishedRuns = [];
  const store = {
    async createRun() {
      return 1;
    },
    async finishRun(runId, status, message) {
      finishedRuns.push({ message, runId, status });
    },
    async getPackGraph() {
      return {
        artifacts: draftArtifacts(slug).map((artifact) => ({
          ...artifact,
          status: 'draft',
        })),
        capabilities: [capability],
        evidenceRefs: [
          {
            capability_id: capability.capability_id,
            line_end: 2,
            line_start: undefined,
            purpose: 'source',
            ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
            sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            stale: false,
            uri: 'evidence/notes.md',
          },
        ],
        pack,
      };
    },
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async withTransaction(callback) {
      return callback({
        async query(sql) {
          if (/SELECT evidence_span\.id/.test(sql)) {
            return {
              rowCount: 1,
              rows: [{ id: 42, ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2' }],
            };
          }
          if (/INSERT INTO capability_forge_test\.pack_draft/.test(sql)) {
            return { rowCount: 1, rows: [pack] };
          }
          if (/INSERT INTO capability_forge_test\.capability_draft/.test(sql)) {
            return { rowCount: 1, rows: [capability] };
          }
          return { rowCount: 1, rows: [] };
        },
      });
    },
  };
  await assert.rejects(() => createDraft({ config, options: { slug }, store }), { code: 'FORGE_TOML_INVALID' });
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'drafts', slug, 'pack-draft.toml')));
  assert.equal(finishedRuns.at(-1).status, 'failed');
}

function makeApprovedPackGraph(root, slug = 'offline-sync') {
  const graph = {
    artifacts: draftArtifacts(slug).map((artifact) => ({
      ...artifact,
      status: 'draft',
    })),
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
        capability_id: `cap.${slug}`,
        line_end: 2,
        line_start: 1,
        purpose: 'source',
        ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        stale: false,
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

function writeDraftToml(root, graph, slug = 'offline-sync') {
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', slug, 'pack-draft.toml'), renderPackDraftToml(graph));
}

function removeTomlArtifactBlock(toml, artifact) {
  const block = ['', '[[artifacts]]', `kind = "${artifact.kind}"`, `path = "${artifact.relative_path}"`, 'status = "draft"', ''].join('\n');
  const updated = toml.replace(block, '\n');
  assert.notEqual(updated, toml, `removed TOML artifact block for ${artifact.kind}:${artifact.relative_path}`);
  return updated;
}

function runGit(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result;
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
          if (/UPDATE capability_forge_test\.artifact_draft/.test(sql)) {
            const artifact = graph.artifacts.find((entry) => entry.relative_path === params[1]);
            if (artifact) {
              artifact.status = 'exported';
              artifact.sha256 = params[2];
            }
            return { rows: [], rowCount: artifact ? 1 : 0 };
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
    transactions: 0,
  };
  const store = {
    async getPackGraph() {
      return graph;
    },
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async withTransaction(callback) {
      state.transactions += 1;
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

function makeExportStore(graph, { missingUpdatePath = null } = {}) {
  const { state, store } = makeValidationStore(graph);
  state.queries = [];
  function recordExpectedQuery(sql, params = []) {
    if (!/UPDATE capability_forge_test\.artifact_draft/.test(sql) && !/INSERT INTO capability_forge_test\.review_event/.test(sql)) {
      throw new Error(`unexpected export side-effect SQL: ${sql}`);
    }
    state.queries.push({ params, sql });
    if (/UPDATE capability_forge_test\.artifact_draft/.test(sql)) {
      const artifactExists = graph.artifacts.some((artifact) => artifact.relative_path === params[1]);
      return { rows: [], rowCount: artifactExists && params[1] !== missingUpdatePath ? 1 : 0 };
    }
    return { rows: [], rowCount: 1 };
  }
  return {
    state,
    store: {
      ...store,
      async createRun() {
        return 7;
      },
      async finishRun() {},
      async query(sql, params = []) {
        return recordExpectedQuery(sql, params);
      },
      async withTransaction(callback) {
        state.transactions += 1;
        return callback({
          async query(sql, params = []) {
            return recordExpectedQuery(sql, params);
          },
        });
      },
    },
  };
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

function makeIngestTrackingStore() {
  const state = {
    finishRuns: [],
    replacements: 0,
    staleUpdates: 0,
    transactions: 0,
    upserts: 0,
  };
  const store = {
    async createRun() {
      return 1;
    },
    async finishRun(runId, status, message = '') {
      state.finishRuns.push({ message, runId, status });
    },
    qualify(name) {
      return `capability_forge_test.${name}`;
    },
    async replaceEvidenceSpans() {
      state.replacements += 1;
    },
    async upsertEvidenceFile() {
      state.upserts += 1;
      return state.upserts;
    },
    async withTransaction(callback) {
      state.transactions += 1;
      await callback({
        async query(sql) {
          if (/UPDATE capability_forge_test\.evidence_file SET stale = true/.test(sql)) {
            state.staleUpdates += 1;
          }
          return { rows: [], rowCount: 0 };
        },
      });
    },
  };
  return { state, store };
}

async function testIngestRejectsRawPostgresUrlBeforeStoringSpans() {
  const root = makeTempProject();
  writeConfig(root);
  fs.writeFileSync(path.join(root, 'evidence', 'secret.md'), 'POSTGRES_URL=postgresql://user:pass@example.test/db\n');
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const { state, store } = makeIngestTrackingStore();

  await assert.rejects(() => ingestEvidence({ config, store }), { code: 'FORGE_SECRET_DETECTED' });
  assert.equal(state.transactions, 0, 'secret-positive evidence fails before opening ingest transaction');
  assert.equal(state.upserts, 0, 'secret-positive evidence is not upserted into compiler state');
  assert.equal(state.replacements, 0, 'secret-positive evidence spans are not stored');
  assert.equal(state.staleUpdates, 0, 'secret-positive evidence does not mark existing evidence stale');
  assert.equal(state.finishRuns.at(-1).status, 'failed');
  assert(!state.finishRuns.at(-1).message.includes('postgresql://'), 'failed run note does not echo raw connection string');
}

async function testIngestRejectsDatabaseUrlStateEvidenceBeforeStoringSpans() {
  for (const content of ['DATABASE_URL=set\n', 'DATABASE_URL=unset\n']) {
    const root = makeTempProject();
    writeConfig(root);
    fs.writeFileSync(path.join(root, 'evidence', 'database-url.md'), content);
    const config = loadForgeConfig('.capability-forge/forge.toml', root);
    const { state, store } = makeIngestTrackingStore();

    await assert.rejects(() => ingestEvidence({ config, store }), { code: 'FORGE_SECRET_DETECTED' });
    assert.equal(state.transactions, 0, 'DATABASE_URL state evidence fails before opening ingest transaction');
    assert.equal(state.upserts, 0, 'DATABASE_URL state evidence is not upserted into compiler state');
    assert.equal(state.replacements, 0, 'DATABASE_URL state evidence spans are not stored');
    assert.equal(state.finishRuns.at(-1).status, 'failed');
  }
}

async function testIngestAllowsPostgresUrlSetUnsetEvidence() {
  const root = makeTempProject();
  writeConfig(root);
  fs.writeFileSync(path.join(root, 'evidence', 'credential-state.md'), 'POSTGRES_URL=set\nPOSTGRES_URL=unset\nPOSTGRES_URL=set|unset\n');
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const { state, store } = makeIngestTrackingStore();

  await ingestEvidence({ config, store });
  assert.equal(state.transactions, 1, 'safe credential-state evidence is ingested in one transaction');
  assert(state.upserts > 0, 'safe credential-state evidence can be upserted');
  assert.equal(state.replacements, state.upserts, 'safe credential-state evidence spans are stored');
  assert.equal(state.finishRuns.at(-1).status, 'succeeded');
}

async function testIngestRejectsForbiddenLiveEvidenceFieldsBeforeStoringSpans() {
  const cases = [
    ['queryResults', '{"queryResults":[{"id":1}]}'],
    ['liveSchema', '{"liveSchema":{"tables":["users"]}}'],
    ['sampleRows', '{"sampleRows":[{"id":1}]}'],
    ['dockerRuntime', '{"dockerRuntime":{"state":"running"}}'],
    ['liveMcp', '{"liveMcp":true}'],
    ['postgres_live', '{"postgres_live":true}'],
    ['network', '{"network":{"reachable":true}}'],
    ['yamlQueryResults', 'queryResults: unsafe'],
  ];

  for (const [field, content] of cases) {
    const root = makeTempProject();
    writeConfig(root);
    fs.writeFileSync(path.join(root, 'evidence', `${field}.md`), `${content}\n`);
    const config = loadForgeConfig('.capability-forge/forge.toml', root);
    const { state, store } = makeIngestTrackingStore();

    await assert.rejects(() => ingestEvidence({ config, store }), { code: 'FORGE_SECRET_DETECTED' });
    assert.equal(state.transactions, 0, `${field} fails before opening ingest transaction`);
    assert.equal(state.upserts, 0, `${field} is not upserted into compiler state`);
    assert.equal(state.replacements, 0, `${field} spans are not stored`);
    assert.equal(state.finishRuns.at(-1).status, 'failed');
  }
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

function readMigrationChecksums() {
  const migrationDir = path.join(repoRoot, 'tools', 'capability-forge', 'migrations');
  return fs
    .readdirSync(migrationDir)
    .filter((entry) => /^\d+_.*\.sql$/.test(entry))
    .sort()
    .map((fileName) => {
      const rawSql = fs.readFileSync(path.join(migrationDir, fileName), 'utf8');
      return {
        checksum: sha256(rawSql),
        version: fileName.replace(/\.sql$/, ''),
      };
    });
}

function makeMigrationPool(existingChecksums = new Map()) {
  const state = {
    connections: 0,
    inserts: [],
    releases: 0,
    topLevelQueries: [],
    transactionQueries: [],
  };

  async function handleQuery(sql, params = []) {
    if (/SELECT checksum FROM "capability_forge_test"\.schema_migration WHERE version = \$1/.test(sql)) {
      const checksum = existingChecksums.get(params[0]);
      return checksum ? { rows: [{ checksum }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO "capability_forge_test"\.schema_migration \(version, checksum\)/.test(sql)) {
      state.inserts.push({ checksum: params[1], version: params[0] });
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  return {
    pool: {
      async connect() {
        state.connections += 1;
        return {
          async query(sql, params = []) {
            state.transactionQueries.push({ params, sql });
            return handleQuery(sql, params);
          },
          release() {
            state.releases += 1;
          },
        };
      },
      async end() {},
      async query(sql, params = []) {
        state.topLevelQueries.push({ params, sql });
        return handleQuery(sql, params);
      },
    },
    state,
  };
}

async function testMigrationRecordsVersionsAndChecksumsWithoutLiveDatabase() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const expected = readMigrationChecksums();
  const { pool, state } = makeMigrationPool();
  const store = createPostgresStoreFromPool(config, pool);

  const migrations = await store.migrate();

  assert.deepEqual(
    migrations,
    expected.map(({ version }) => ({ status: 'applied', version })),
    'new checked migrations are applied in sorted order',
  );
  assert.deepEqual(state.inserts, expected, 'migration ids and raw-file SHA-256 checksums are recorded');
  assert.equal(state.connections, expected.length, 'new migrations apply inside one transaction each');
  assert.equal(state.releases, expected.length, 'migration transaction clients are released');
  for (const { checksum } of state.inserts) {
    assert.match(checksum, /^[a-f0-9]{64}$/, 'recorded checksum is lowercase SHA-256');
  }
}

async function testMigrationSkipsAlreadyAppliedMatchingChecksumsWithoutLiveDatabase() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const expected = readMigrationChecksums();
  const existingChecksums = new Map(expected.map(({ checksum, version }) => [version, checksum]));
  const { pool, state } = makeMigrationPool(existingChecksums);
  const store = createPostgresStoreFromPool(config, pool);

  const migrations = await store.migrate();

  assert.deepEqual(
    migrations,
    expected.map(({ version }) => ({ status: 'already_applied', version })),
    'matching migration checksums are treated as already applied',
  );
  assert.deepEqual(state.inserts, [], 'matching migrations do not write replacement checksum records');
  assert.equal(state.connections, 0, 'matching migrations do not open application transactions');
}

async function testMigrationChecksumDriftFailsClosedWithoutLiveDatabase() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const [firstMigration] = readMigrationChecksums();
  const { pool, state } = makeMigrationPool(new Map([[firstMigration.version, '0'.repeat(64)]]));
  const store = createPostgresStoreFromPool(config, pool);

  await assert.rejects(() => store.migrate(), { code: 'FORGE_MIGRATION_CHECKSUM' });
  assert.deepEqual(state.inserts, [], 'checksum drift does not write replacement checksum records');
  assert.equal(state.connections, 0, 'checksum drift fails before opening an application transaction');
  assert.equal(state.transactionQueries.length, 0, 'checksum drift fails before applying migration SQL or committing side effects');
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

async function testPostgresStorePackGraphHydratesEvidenceShape() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const pack = {
    id: 1,
    pack_id: 'capability-pack.offline-sync',
    slug: 'offline-sync',
    status: 'review_pending',
    title: 'Offline Sync',
  };
  const capability = {
    id: 7,
    capability_id: 'cap.offline-sync',
    pack_draft_id: 1,
    sort_order: 1,
    status: 'needs_review',
    title: 'Offline Sync',
  };
  const evidenceSource = {
    'capability_draft.capability_id': ['capability_id', 'cap.offline-sync'],
    'capability_evidence_ref.purpose': ['purpose', 'constraint'],
    'evidence_ref.heading': ['heading', 'Notes'],
    'evidence_ref.line_end': ['line_end', 2],
    'evidence_ref.line_start': ['line_start', 1],
    'evidence_ref.ref': ['ref', 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2'],
    'evidence_ref.sha256': ['sha256', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    'evidence_ref.stale': ['stale', true],
    'evidence_ref.uri': ['uri', 'evidence/notes.md'],
  };
  const pool = {
    async connect() {
      throw new Error('getPackGraph should not open a transaction');
    },
    async end() {},
    async query(sql, params = []) {
      if (/FROM "capability_forge_test"\.pack_draft/.test(sql)) {
        assert.deepEqual(params, ['offline-sync']);
        return { rows: [pack], rowCount: 1 };
      }
      if (/FROM "capability_forge_test"\.capability_draft WHERE pack_draft_id/.test(sql)) {
        assert.deepEqual(params, [1]);
        return { rows: [capability], rowCount: 1 };
      }
      if (/FROM "capability_forge_test"\.capability_draft AS capability_draft/.test(sql)) {
        assert.deepEqual(params, [1]);
        const row = {};
        for (const [needle, [field, value]] of Object.entries(evidenceSource)) {
          if (sql.includes(needle)) {
            row[field] = value;
          }
        }
        return { rows: [row], rowCount: 1 };
      }
      if (/FROM "capability_forge_test"\.artifact_draft/.test(sql)) {
        assert.deepEqual(params, [1]);
        return {
          rows: [{ kind: 'pack_toml', relative_path: '.capability-forge/drafts/offline-sync/pack-draft.toml', status: 'draft' }],
          rowCount: 1,
        };
      }
      throw new Error(`unexpected getPackGraph SQL: ${sql}`);
    },
  };
  const store = createPostgresStoreFromPool(config, pool);
  const graph = await store.getPackGraph('offline-sync');
  assert.equal(graph.capabilities[0].evidence_refs, undefined, 'live graph does not rely on mock-only capability evidence_refs');
  assert.deepEqual(graph.evidenceRefs[0], {
    capability_id: 'cap.offline-sync',
    heading: 'Notes',
    line_end: 2,
    line_start: 1,
    purpose: 'constraint',
    ref: 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    stale: true,
    uri: 'evidence/notes.md',
  });
  await store.close();
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
  const plainPacket = stringifyReviewPacket({
    boundary: 'Boundary only.',
    pack: { slug: 'offline-sync', status: 'review_pending' },
    skill: 'bmad-help',
    title: 'Plain Handoff',
  });
  assert(plainPacket.includes('Forge must not invoke, satisfy, approve, or mark complete this BMAD workflow.'));
  assert(!plainPacket.includes('TOML/PostgreSQL/BMAD Integration Notes'), 'advisory sections stay opt-in');
}

async function testExportedReviewPacketsIncludeIntegrationNotes() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { store } = makeExportStore(graph);

  const result = await exportBmadArtifacts({ config, slug: 'offline-sync', store });
  assert(result.files.includes('.capability-forge/drafts/offline-sync/review-packets/tool-leverage-review.md'));

  const packet = fs.readFileSync(
    path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'review-packets', 'tool-leverage-review.md'),
    'utf8',
  );
  assert(packet.includes('TOML/PostgreSQL/BMAD Integration Notes'), 'exported review packets include stable integration notes');
  assert(packet.includes('Forge must not invoke, satisfy, approve, or mark complete this BMAD workflow.'));
  assert(!/PostgreSQL MCP (is|becomes) Forge infrastructure/i.test(packet), 'review packet does not promote PostgreSQL MCP');
  assert(!/Graphify.*(verifier|promotion) authority/i.test(packet), 'review packet does not promote Graphify authority');
}

async function testExportStoreFakeRejectsUnexpectedSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const graph = makeApprovedPackGraph(root);
  const { store } = makeExportStore(graph);
  await assert.rejects(() => store.query('DELETE FROM capability_forge_test.pack_draft WHERE id = $1', [graph.pack.id]), {
    message: /unexpected export side-effect SQL/,
  });
  await assert.rejects(
    () => store.withTransaction((client) => client.query('DELETE FROM capability_forge_test.pack_draft WHERE id = $1', [graph.pack.id])),
    {
      message: /unexpected export side-effect SQL/,
    },
  );
}

async function testExportRequiresDeclaredArtifactsBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const omittedArtifact = graph.artifacts.find((artifact) => artifact.kind === 'module_yaml');
  graph.artifacts = graph.artifacts.filter((artifact) => artifact !== omittedArtifact);
  writeDraftToml(root, graph);
  const modulePath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'module.yaml');
  fs.writeFileSync(modulePath, 'original module yaml\n');
  const { store } = makeValidationStore(graph);
  store.createRun = async () => {
    throw new Error('export-bmad must not create a run without declared artifacts');
  };
  await assert.rejects(
    () => exportBmadArtifacts({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_EXPORT_ARTIFACT_MISSING');
      assert(error.message.includes('module_yaml:.capability-forge/drafts/offline-sync/module.yaml'));
      return true;
    },
  );
  assert.equal(fs.readFileSync(modulePath, 'utf8'), 'original module yaml\n');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'review.md')));
}

async function testExportRejectsMissingArtifactUpdateBeforeFileWrite() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const skillPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'SKILL.md');
  fs.writeFileSync(skillPath, 'original skill\n');
  const missingUpdatePath = '.capability-forge/drafts/offline-sync/SKILL.md';
  const { store } = makeExportStore(graph, { missingUpdatePath });
  await assert.rejects(
    () => exportBmadArtifacts({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_EXPORT_ARTIFACT_MISSING');
      assert(error.message.includes(`artifact draft row missing during export: ${missingUpdatePath}`));
      return true;
    },
  );
  assert.equal(fs.readFileSync(skillPath, 'utf8'), 'original skill\n');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'review.md')));
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
    () => validateDraft({ config, slug: 'offline-sync', store }),
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

async function testValidateBlocksInvalidTomlBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml'), 'schema_version = "broken"\n[');
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(() => validateDraft({ config, slug: 'offline-sync', store }), {
    code: 'FORGE_TOML_INVALID',
  });
  assert.equal(state.reconciled, false, 'invalid TOML fails before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateUsesLiveGraphEvidenceRefsShape() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  delete graph.capabilities[0].evidence_refs;
  const { state, store } = makeValidationStore(graph);
  const result = await validateDraft({ config, slug: 'offline-sync', store });
  assert.equal(result.ok, true);
  assert.equal(state.reconciled, false, 'validation does not require mock-only capabilities[].evidence_refs');
}

async function testValidateUsesDeterministicGeneratedAtMarkerForLiveGraphShape() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  delete graph.pack.generated_at;
  graph.pack.created_at = new Date().toISOString();
  const { state, store } = makeValidationStore(graph);
  const result = await validateDraft({ config, slug: 'offline-sync', store });
  assert.equal(result.ok, true);
  assert.equal(state.reconciled, false, 'validation does not require a mock-only pack.generated_at field');
}

async function testValidateRejectsTamperedTopLevelEvidenceMetadata() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace('uri = "evidence/notes.md"', 'uri = "evidence/tampered.md"'));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('evidence uri must match database draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'tampered evidence metadata fails before database writes');
}

async function testValidateRejectsDuplicateTopLevelEvidenceRefs() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  const draft = fs.readFileSync(draftPath, 'utf8');
  const evidenceBlock = draft.match(/\[\[evidence_refs\]\][\s\S]*?purpose = "source"\n/)?.[0];
  assert(evidenceBlock, 'test fixture includes top-level evidence ref block');
  fs.writeFileSync(draftPath, draft.replace(`${evidenceBlock}\n`, `${evidenceBlock}\n${evidenceBlock}\n`));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('duplicate evidence ref in TOML draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'duplicate top-level evidence refs fail before database writes');
}

async function testValidateAndRenderDeduplicateMultipurposeEvidenceRefs() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs.push({
    ...graph.evidenceRefs[0],
    purpose: 'constraint',
    stale: false,
  });
  const toml = renderPackDraftToml({
    artifacts: graph.artifacts,
    capabilities: graph.capabilities.map((capability) => ({
      ...capability,
      acceptance: ['Capability references at least one local evidence span.'],
      evidence_refs: graph.evidenceRefs
        .filter((evidenceRef) => evidenceRef.capability_id === capability.capability_id)
        .map((evidenceRef) => evidenceRef.ref)
        .filter((evidenceRef, index, refs) => refs.indexOf(evidenceRef) === index),
    })),
    evidenceRefs: graph.evidenceRefs,
    pack: graph.pack,
  });
  const ref = graph.evidenceRefs[0].ref;
  assert.equal(toml.match(new RegExp(`id = "${ref}"`, 'g')).length, 1, 'top-level TOML evidence refs are unique by ref');
  assert(toml.includes('purposes = ["constraint", "source"]'), 'top-level TOML preserves multi-purpose evidence relationships');
  assert.equal(toml.match(new RegExp(ref, 'g')).length, 2, 'capability refs include each evidence ref once');
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml'), toml);
  const { store } = makeValidationStore(graph);
  const result = await validateDraft({ config, slug: 'offline-sync', store });
  assert.equal(result.ok, true);
}

async function testValidateRejectsUnsupportedTomlFieldsBeforeSideEffects() {
  const cases = [
    {
      name: 'top-level',
      patch: (toml) => toml.replace('workspace_runtime_change = false\n', 'workspace_runtime_change = false\nunsupported_top = "boom"\n'),
      expected: 'unsupported top-level field in TOML draft: unsupported_top',
    },
    {
      name: 'bmad',
      patch: (toml) => toml.replace('export_mode = "draft_only"\n', 'export_mode = "draft_only"\nunsupported_bmad = "boom"\n'),
      expected: 'unsupported bmad field in TOML draft: unsupported_bmad',
    },
    {
      name: 'provenance',
      patch: (toml) =>
        toml.replace('source = "capability-pack-forge-v2"\n', 'source = "capability-pack-forge-v2"\nunsupported_provenance = "boom"\n'),
      expected: 'unsupported provenance field in TOML draft: unsupported_provenance',
    },
    {
      name: 'evidence ref',
      patch: (toml) => toml.replace('purpose = "source"\n', 'purpose = "source"\nunsupported_evidence = "boom"\n'),
      expected: 'unsupported evidence_refs field in TOML draft: unsupported_evidence',
    },
    {
      name: 'capability',
      patch: (toml) => toml.replace('status = "needs_review"\n', 'status = "needs_review"\nunsupported_capability = "boom"\n'),
      expected: 'unsupported capabilities field in TOML draft: unsupported_capability',
    },
    {
      name: 'artifact',
      patch: (toml) => toml.replace('status = "draft"\n', 'status = "draft"\nunsupported_artifact = "boom"\n'),
      expected: 'unsupported artifacts field in TOML draft: unsupported_artifact',
    },
  ];
  for (const testCase of cases) {
    const root = makeTempProject();
    writeConfig(root);
    const config = loadForgeConfig('.capability-forge/forge.toml', root);
    const graph = makeApprovedPackGraph(root);
    const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
    fs.writeFileSync(draftPath, testCase.patch(fs.readFileSync(draftPath, 'utf8')));
    const { state, store } = makeValidationStore(graph);
    await assert.rejects(
      () => validateDraft({ config, slug: 'offline-sync', store }),
      (error) => {
        assert.equal(error.code, 'FORGE_DRAFT_INVALID', testCase.name);
        assert(error.message.includes(testCase.expected), error.message);
        return true;
      },
    );
    assert.equal(state.reconciled, false, `${testCase.name} unsupported field fails before database writes`);
    assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
  }
}

async function testValidateRejectsMissingArtifactsBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const missingArtifact = graph.artifacts.find((artifact) => artifact.kind === 'skill_md');
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, removeTomlArtifactBlock(fs.readFileSync(draftPath, 'utf8'), missingArtifact));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('artifact missing from TOML draft: skill_md:.capability-forge/drafts/offline-sync/SKILL.md'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'missing artifact rows fail before database writes');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsTamperedArtifactStatusBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace('status = "draft"', 'status = "promoted"'));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(
        error.message.includes(
          'artifact status must remain draft in TOML review contract for pack_toml:.capability-forge/drafts/offline-sync/pack-draft.toml',
        ),
      );
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'tampered artifact status fails before database writes');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsMalformedEvidenceLineTypes() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace('line_start = 1', 'line_start = "1"'));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('evidence line_start must match database draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'malformed evidence line metadata fails before database writes');
}

async function testValidateRejectsMissingReferencedStaleState() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  delete graph.evidenceRefs[0].stale;
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('evidence stale state missing'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'missing stale state fails before database writes');
}

async function testValidateRejectsMalformedReferencedStaleState() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs[0].stale = 'true';
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('evidence stale must be boolean'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'malformed stale state fails before database writes');
}

async function testValidateRejectsMissingCapabilityEvidenceRefsBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs[0].stale = true;
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(
    draftPath,
    fs
      .readFileSync(draftPath, 'utf8')
      .replace('evidence_refs = ["ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2"]', 'evidence_refs = []'),
  );
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('evidence_refs must match database draft for cap.offline-sync'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'missing evidence refs fail before TOML status reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsTomlApprovedStatusImportBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.pack.status = 'review_pending';
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('status must match database draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'approved status from TOML fails before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsTomlRejectedStatusImportBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace(/^status = "approved"$/m, 'status = "rejected"'));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('status must match database draft'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'rejected status from TOML fails before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsTamperedCapabilityStatusBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace('status = "needs_review"', 'status = "approved"'));
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes('status must match database draft for cap.offline-sync'));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'tampered capability status fails before database writes');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testValidateRejectsDuplicateCapabilityEvidenceRefs() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  const ref = 'ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2';
  fs.writeFileSync(
    draftPath,
    fs.readFileSync(draftPath, 'utf8').replace(`evidence_refs = ["${ref}"]`, `evidence_refs = ["${ref}", "${ref}"]`),
  );
  const { state, store } = makeValidationStore(graph);
  await assert.rejects(
    () => validateDraft({ config, slug: 'offline-sync', store }),
    (error) => {
      assert.equal(error.code, 'FORGE_DRAFT_INVALID');
      assert(error.message.includes(`duplicate evidence ref for cap.offline-sync: ${ref}`));
      return true;
    },
  );
  assert.equal(state.reconciled, false, 'duplicate evidence refs fail before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
}

async function testExportBlocksReferencedStaleEvidenceBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.evidenceRefs[0].stale = true;
  const { state, store } = makeValidationStore(graph);
  store.createRun = async () => {
    throw new Error('export-bmad must not create a run after stale evidence');
  };
  await assert.rejects(() => exportBmadArtifacts({ config, slug: 'offline-sync', store }), {
    code: 'FORGE_DRAFT_STALE_EVIDENCE',
  });
  assert.equal(state.reconciled, false, 'stale export fails before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
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
        approved: true,
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

async function testPromoteRequiresDeclaredArtifactRowsBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const omittedArtifact = graph.artifacts.find((artifact) => artifact.kind === 'module_help_csv');
  graph.artifacts = graph.artifacts.filter((artifact) => artifact !== omittedArtifact);
  writeDraftToml(root, graph);
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    (error) => {
      assert.equal(error.code, 'FORGE_PROMOTE_MISSING_ARTIFACT');
      assert(error.message.includes('module_help_csv:.capability-forge/drafts/offline-sync/module-help.csv'));
      return true;
    },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testPromoteRequiresExplicitApprovalBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
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
    { code: 'FORGE_PROMOTE_REQUIRES_APPROVED' },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testPromotionRejectsSymlinkTargetBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const linkedTarget = path.join(root, 'linked-target');
  fs.mkdirSync(linkedTarget, { recursive: true });
  fs.symlinkSync(linkedTarget, path.join(root, '.agents', 'skills', 'offline-sync'), 'dir');
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PATH_UNSAFE' },
  );
  assert.equal(state.promotion, null);
  assert.deepEqual(fs.readdirSync(linkedTarget), [], 'symlink target is not mutated');
}

async function testPromotionRejectsDanglingSymlinkTargetBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.symlinkSync(path.join(root, 'missing-linked-target'), path.join(root, '.agents', 'skills', 'offline-sync'), 'dir');
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PATH_UNSAFE' },
  );
  assert.equal(state.promotion, null);
  assert(fs.lstatSync(path.join(root, '.agents', 'skills', 'offline-sync')).isSymbolicLink(), 'dangling symlink target is not replaced');
}

async function testPromotionRequiresDirtyOverrideBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  runGit(root, ['init']);
  fs.writeFileSync(path.join(root, 'dirty-worktree.txt'), 'dirty\n');
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_DIRTY' },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));

  const { state: overrideState, store: overrideStore } = makePromotionStore(graph);
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    slug: 'offline-sync',
    store: overrideStore,
    target: '.agents/skills/offline-sync',
  });
  assert.equal(overrideState.promotion.status, 'promoted');
  assert(fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync', 'SKILL.md')));
}

async function testPromoteRejectsReviewPendingDatabaseStateBeforeSideEffects() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  graph.pack.status = 'review_pending';
  const draftPath = path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml');
  fs.writeFileSync(draftPath, fs.readFileSync(draftPath, 'utf8').replace(/^status = "approved"$/m, 'status = "review_pending"'));
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    (error) => {
      assert.equal(error.code, 'FORGE_PROMOTE_NOT_APPROVED');
      assert(error.message.includes('approved database-backed draft state'));
      assert(!error.message.includes('pack-draft.toml status'));
      return true;
    },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testExportThenPromoteAllowsExportedArtifactLifecycleState() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  store.createRun = async () => 7;
  store.finishRun = async () => {};
  store.query = async (sql, params = []) => {
    if (/UPDATE capability_forge_test\.artifact_draft/.test(sql)) {
      const artifact = graph.artifacts.find((entry) => entry.relative_path === params[1]);
      if (artifact) {
        artifact.status = 'exported';
        artifact.sha256 = params[2];
      }
      return { rows: [], rowCount: artifact ? 1 : 0 };
    }
    if (/INSERT INTO capability_forge_test\.review_event/.test(sql)) {
      state.reviewEvents.push(params);
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`unexpected export/promote SQL: ${sql}`);
  };

  await exportBmadArtifacts({ config, slug: 'offline-sync', store });
  assert.equal(graph.artifacts.find((entry) => entry.kind === 'skill_md').status, 'exported');
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert(fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync', 'SKILL.md')));
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
  const result = await validateDraft({ config, slug: 'offline-sync', store });
  assert.equal(result.ok, true);
}

async function testPromotionRollbackMarksFailed() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const targetRoot = path.join(root, '.agents', 'skills', 'offline-sync');
  let copied = 0;
  const failingFs = Object.create(fs);
  failingFs.copyFileSync = (...args) => {
    assert(!fs.existsSync(targetRoot), 'target is not visible while staged files are copied');
    assert.equal(findSkillEntrypoints(path.join(root, '.agents', 'skills')).length, 0, 'staging is outside scanned skills root');
    fs.copyFileSync(...args);
    copied += 1;
    if (copied === 2) {
      throw new Error('disk full');
    }
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
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
  assert.equal(
    findSkillEntrypoints(path.join(root, '.agents', 'skills')).length,
    0,
    'no partial skill entrypoint is visible after failure',
  );
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.lock')).length, 0);
}

async function testPromotionRenameFailureMarksFailedAndCleansTemp() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const targetRoot = path.join(root, '.agents', 'skills', 'offline-sync');
  const failingFs = Object.create(fs);
  failingFs.renameNoReplaceSync = () => {
    const error = new Error('rename denied');
    error.code = 'EACCES';
    throw error;
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        fileSystem: failingFs,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    (error) => {
      assert.equal(error.code, 'FORGE_PROMOTE_COPY_FAILED');
      assert(error.message.includes('rename denied'));
      return true;
    },
  );
  assert.equal(state.promotion.status, 'failed');
  assert(!fs.existsSync(targetRoot));
  assert(!fs.existsSync(path.join(root, '.agents', '.forge-promotion-tmp')));
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.lock')).length, 0);
  assert.equal(findSkillEntrypoints(path.join(root, '.agents', 'skills')).length, 0, 'rename failure exposes no skill entrypoint');
}

async function testPromotionNestedTargetStagesOutsideRuntimeRoot() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const skillsRoot = path.join(root, '.agents', 'skills');
  const checkingFs = Object.create(fs);
  checkingFs.copyFileSync = (...args) => {
    assert.equal(findSkillEntrypoints(skillsRoot).length, 0, 'nested target staging is outside scanned skills root');
    fs.copyFileSync(...args);
  };
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    fileSystem: checkingFs,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/team/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert(fs.existsSync(path.join(root, '.agents', 'skills', 'team', 'offline-sync', 'SKILL.md')));
}

async function testPromotionNestedTargetStagesOutsideOverlappingRuntimeRoots() {
  const root = makeTempProject();
  writeConfig(root);
  const configPath = path.join(root, '.capability-forge', 'forge.toml');
  fs.writeFileSync(
    configPath,
    fs.readFileSync(configPath, 'utf8').replace('runtime_roots = [".agents/skills"]', 'runtime_roots = [".agents/skills", ".agents"]'),
  );
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const checkingFs = Object.create(fs);
  checkingFs.copyFileSync = (...args) => {
    assert.equal(findSkillEntrypoints(path.join(root, '.agents')).length, 0, 'staging is outside every configured runtime root');
    fs.copyFileSync(...args);
  };
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    fileSystem: checkingFs,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/team/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert(fs.existsSync(path.join(root, '.agents', 'skills', 'team', 'offline-sync', 'SKILL.md')));
}

async function testPromotionRejectsSymlinkedStagingRootInsideRuntimeRoots() {
  const root = makeTempProject();
  writeConfig(root);
  const configPath = path.join(root, '.capability-forge', 'forge.toml');
  fs.writeFileSync(
    configPath,
    fs.readFileSync(configPath, 'utf8').replace('runtime_roots = [".agents/skills"]', 'runtime_roots = [".agents/skills", ".agents"]'),
  );
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  fs.symlinkSync(path.join(root, '.agents'), path.join(root, '.forge-promotion-tmp'), 'dir');
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/team/offline-sync',
      }),
    (error) => {
      assert.equal(error.code, 'FORGE_PROMOTE_CONFLICT');
      assert(error.message.includes('promotion staging root resolves inside runtime root'));
      return true;
    },
  );
  assert.equal(state.promotion.status, 'prepared');
  assert.equal(findSkillEntrypoints(path.join(root, '.agents')).length, 0, 'symlinked staging root did not expose skill entrypoints');
}

async function testPromotionTargetRaceLeavesPreparedRowAndDoesNotOverwrite() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const targetRoot = path.join(root, '.agents', 'skills', 'offline-sync');
  let copied = 0;
  let targetCreatedDuringCopy = false;
  const racingFs = Object.create(fs);
  racingFs.copyFileSync = (...args) => {
    fs.copyFileSync(...args);
    copied += 1;
    if (copied === 3) {
      fs.mkdirSync(targetRoot, { recursive: true });
      targetCreatedDuringCopy = true;
    }
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        fileSystem: racingFs,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_CONFLICT' },
  );
  assert.equal(targetCreatedDuringCopy, true, 'test creates target after prepare but before final publish');
  assert.equal(state.promotion.status, 'prepared');
  assert.deepEqual(fs.readdirSync(targetRoot), [], 'concurrent empty target is not replaced with promoted artifacts');
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.tmp-')).length, 0);
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.lock')).length, 0);
}

async function testPromotionFinalNoOverwriteRace() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph);
  const targetRoot = path.join(root, '.agents', 'skills', 'offline-sync');
  let targetCreatedDuringPublish = false;
  const racingFs = Object.create(fs);
  racingFs.renameNoReplaceSync = () => {
    fs.mkdirSync(targetRoot, { recursive: true });
    targetCreatedDuringPublish = true;
    const error = new Error('target exists');
    error.code = 'EEXIST';
    throw error;
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        fileSystem: racingFs,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_CONFLICT' },
  );
  assert.equal(targetCreatedDuringPublish, true, 'test creates target between final check and no-overwrite publish');
  assert.equal(state.promotion.status, 'prepared');
  assert.deepEqual(fs.readdirSync(targetRoot), [], 'concurrent empty target is not replaced during final publish');
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.tmp-')).length, 0);
  assert.equal(fs.readdirSync(path.join(root, '.agents', 'skills')).filter((entry) => entry.includes('.lock')).length, 0);
}

async function testPromotionCreatesMissingTargetParentBeforeReservation() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.rmSync(path.join(root, '.agents', 'skills'), { force: true, recursive: true });
  const { state, store } = makePromotionStore(graph);
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert(fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync', 'SKILL.md')));
}

async function testPromotionStaleReservationLockCanRecover() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const staleLock = path.join(root, '.agents', 'skills', 'offline-sync.lock');
  fs.mkdirSync(staleLock, { recursive: true });
  fs.writeFileSync(
    path.join(staleLock, 'forge-promotion-lock.json'),
    JSON.stringify({
      kind: 'capability-forge-promotion-lock',
      nonce: 'stale-lock',
    }),
  );
  const oldDate = new Date(Date.now() - 20 * 60 * 1000);
  fs.utimesSync(staleLock, oldDate, oldDate);
  const { state, store } = makePromotionStore(graph);
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    slug: 'offline-sync',
    store,
    target: '.agents/skills/offline-sync',
  });
  assert.equal(state.promotion.status, 'promoted');
  assert(!fs.existsSync(staleLock));
}

async function testPromotionUnmarkedReservationLockIsConflict() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const staleLock = path.join(root, '.agents', 'skills', 'offline-sync.lock');
  fs.mkdirSync(staleLock, { recursive: true });
  fs.writeFileSync(path.join(staleLock, 'owner.txt'), 'not capability forge\n');
  const oldDate = new Date(Date.now() - 20 * 60 * 1000);
  fs.utimesSync(staleLock, oldDate, oldDate);
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_CONFLICT' },
  );
  assert.equal(state.promotion.status, 'prepared');
  assert.equal(fs.readFileSync(path.join(staleLock, 'owner.txt'), 'utf8'), 'not capability forge\n');
}

async function testPreparedPromotionMismatchFailsBeforeCopy() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  const { state, store } = makePromotionStore(graph, {
    promotion: {
      artifact_snapshot_sha256: 'different-prepared-snapshot',
      status: 'prepared',
      target_path: '.agents/skills/offline-sync',
    },
  });
  let copied = false;
  const noCopyFs = Object.create(fs);
  noCopyFs.copyFileSync = () => {
    copied = true;
    throw new Error('prepared mismatch must not copy');
  };
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        fileSystem: noCopyFs,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_RECONCILE_REQUIRED' },
  );
  assert.equal(copied, false);
  assert.equal(state.promotion.status, 'prepared');
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
}

async function testPreparedPromotionReservationConflictDoesNotMarkFailed() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.mkdirSync(path.join(root, '.agents', 'skills', 'offline-sync.lock'), { recursive: true });
  const { state, store } = makePromotionStore(graph, {
    promotion: {
      artifact_snapshot_sha256: promotionSnapshot(root),
      status: 'prepared',
      target_path: '.agents/skills/offline-sync',
    },
  });
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_PROMOTE_CONFLICT' },
  );
  assert.equal(state.promotion.status, 'prepared');
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
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
  const noCopyFs = Object.create(fs);
  noCopyFs.copyFileSync = () => {
    throw new Error('prepared retry should finalize without copying');
  };
  await promoteDraft({
    allowDirty: true,
    approved: true,
    config,
    fileSystem: noCopyFs,
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
        approved: true,
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
  const { state, store } = makePromotionStore(graph);
  await assert.rejects(
    () =>
      promoteDraft({
        allowDirty: true,
        approved: true,
        config,
        slug: 'offline-sync',
        store,
        target: '.agents/skills/offline-sync',
      }),
    { code: 'FORGE_TOML_INVALID' },
  );
  assert.equal(state.promotion, null);
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync')));
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'offline-sync.lock')));
  assert(!fs.existsSync(path.join(root, '.agents', '.forge-promotion-tmp')));
}

async function testInvalidTomlBlocksExport() {
  const root = makeTempProject();
  writeConfig(root);
  const config = loadForgeConfig('.capability-forge/forge.toml', root);
  const graph = makeApprovedPackGraph(root);
  fs.writeFileSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'pack-draft.toml'), 'schema_version = "broken"\n[');
  const { state, store } = makeValidationStore(graph);
  store.createRun = async () => {
    throw new Error('export-bmad must not create a run after invalid TOML');
  };
  await assert.rejects(() => exportBmadArtifacts({ config, slug: 'offline-sync', store }), {
    code: 'FORGE_TOML_INVALID',
  });
  assert.equal(state.reconciled, false, 'invalid TOML export fails before database reconciliation');
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'reports', 'validation-offline-sync.md')));
  assert(!fs.existsSync(path.join(root, '.capability-forge', 'drafts', 'offline-sync', 'review.md')));
}

function findSkillEntrypoints(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      entries.push(...findSkillEntrypoints(fullPath));
      continue;
    }
    if (entry.name === 'SKILL.md') {
      entries.push(fullPath);
    }
  }
  return entries.sort();
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
  await testV2ConfigFailureDoesNotReadDatabaseEnv();
  testCliFlagParsing();
  testEvidenceSpans();
  await testIngestMarksMissingEvidenceStale();
  await testIngestRejectsRawPostgresUrlBeforeStoringSpans();
  await testIngestRejectsDatabaseUrlStateEvidenceBeforeStoringSpans();
  await testIngestAllowsPostgresUrlSetUnsetEvidence();
  await testIngestRejectsForbiddenLiveEvidenceFieldsBeforeStoringSpans();
  testTomlDraftContract();
  testTomlDraftContractStableForEquivalentRowOrderNoise();
  await testCreateDraftParsesGeneratedTomlBeforeWrite();
  testPathSafety();
  testMigrationContract();
  await testMigrationRecordsVersionsAndChecksumsWithoutLiveDatabase();
  await testMigrationSkipsAlreadyAppliedMatchingChecksumsWithoutLiveDatabase();
  await testMigrationChecksumDriftFailsClosedWithoutLiveDatabase();
  testPostgresqlMcpNotRuntimeDependency();
  await testPostgresStorePackGraphHydratesEvidenceShape();
  testBmadExportsAreHandoffs();
  await testExportedReviewPacketsIncludeIntegrationNotes();
  await testExportStoreFakeRejectsUnexpectedSideEffects();
  await testExportRequiresDeclaredArtifactsBeforeSideEffects();
  await testExportRejectsMissingArtifactUpdateBeforeFileWrite();
  await testValidateBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testValidateBlocksInvalidTomlBeforeSideEffects();
  await testValidateUsesLiveGraphEvidenceRefsShape();
  await testValidateUsesDeterministicGeneratedAtMarkerForLiveGraphShape();
  await testValidateRejectsTamperedTopLevelEvidenceMetadata();
  await testValidateRejectsDuplicateTopLevelEvidenceRefs();
  await testValidateAndRenderDeduplicateMultipurposeEvidenceRefs();
  await testValidateRejectsUnsupportedTomlFieldsBeforeSideEffects();
  await testValidateRejectsMissingArtifactsBeforeSideEffects();
  await testValidateRejectsTamperedArtifactStatusBeforeSideEffects();
  await testValidateRejectsMalformedEvidenceLineTypes();
  await testValidateRejectsMissingReferencedStaleState();
  await testValidateRejectsMalformedReferencedStaleState();
  await testValidateRejectsMissingCapabilityEvidenceRefsBeforeSideEffects();
  await testValidateRejectsTomlApprovedStatusImportBeforeSideEffects();
  await testValidateRejectsTomlRejectedStatusImportBeforeSideEffects();
  await testValidateRejectsTamperedCapabilityStatusBeforeSideEffects();
  await testValidateRejectsDuplicateCapabilityEvidenceRefs();
  await testExportBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testPromoteBlocksReferencedStaleEvidenceBeforeSideEffects();
  await testPromoteRequiresDeclaredArtifactRowsBeforeSideEffects();
  await testPromoteRequiresExplicitApprovalBeforeSideEffects();
  await testPromotionRejectsSymlinkTargetBeforeSideEffects();
  await testPromotionRejectsDanglingSymlinkTargetBeforeSideEffects();
  await testPromotionRequiresDirtyOverrideBeforeSideEffects();
  await testPromoteRejectsReviewPendingDatabaseStateBeforeSideEffects();
  await testExportThenPromoteAllowsExportedArtifactLifecycleState();
  await testValidateAllowsUnreferencedStaleEvidence();
  await testPromotionRollbackMarksFailed();
  await testPromotionRenameFailureMarksFailedAndCleansTemp();
  await testPromotionNestedTargetStagesOutsideRuntimeRoot();
  await testPromotionNestedTargetStagesOutsideOverlappingRuntimeRoots();
  await testPromotionRejectsSymlinkedStagingRootInsideRuntimeRoots();
  await testPromotionTargetRaceLeavesPreparedRowAndDoesNotOverwrite();
  await testPromotionFinalNoOverwriteRace();
  await testPromotionCreatesMissingTargetParentBeforeReservation();
  await testPromotionStaleReservationLockCanRecover();
  await testPromotionUnmarkedReservationLockIsConflict();
  await testPreparedPromotionMismatchFailsBeforeCopy();
  await testPreparedPromotionReservationConflictDoesNotMarkFailed();
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
