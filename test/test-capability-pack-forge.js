/**
 * Capability Pack Forge public behavior tests.
 *
 * Usage: node test/test-capability-pack-forge.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { verifyCapabilityRequest } = require('../tools/workspace/contracts');
const { WORKSPACE_COMMAND_NAMES } = require('../tools/workspace/command-registry');

const repoRoot = path.join(__dirname, '..');
const forgeCli = path.join(repoRoot, 'tools', 'capability-pack-forge.js');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'cpf', 'context7-minimal');
const schemaPath = path.join(repoRoot, 'tools', 'schemas', 'bmad-capability-pack.schema.json');
const declaredPackTemplates = [
  {
    slug: 'codex-manual-executor',
    id: 'executor.codex.manual',
    displayName: 'Codex Manual Executor',
    summary: 'Draft a BMAD capability pack for manual Codex executor readiness.',
    template: 'capability-request.codex-manual.example.json',
  },
  {
    slug: 'git-worktree-review',
    id: 'repo.git.worktree-review',
    displayName: 'Git Worktree Review',
    summary: 'Draft a BMAD capability pack for Git worktree review evidence.',
    template: 'capability-request.git-worktree-review.example.json',
  },
  {
    slug: 'git-local-mcp',
    id: 'host.mcp.git.local',
    displayName: 'Git Local MCP',
    summary: 'Draft a BMAD capability pack for local Git MCP repository tools.',
    template: 'capability-request.git-mcp-local.example.json',
  },
  {
    slug: 'docker-mcp-toolkit',
    id: 'host.mcp.docker.toolkit',
    displayName: 'Docker MCP Toolkit',
    summary: 'Draft a BMAD capability pack for Docker MCP Toolkit gateway-profile evidence.',
    template: 'capability-request.docker-mcp-toolkit.example.json',
  },
  {
    slug: 'zsh-shell-mcp',
    id: 'host.mcp.shell.zsh',
    displayName: 'Zsh Shell MCP',
    summary: 'Draft a BMAD capability pack for zsh shell MCP operator evidence.',
    template: 'capability-request.zsh-shell-mcp.example.json',
  },
  {
    slug: 'postgresql-readonly-mcp',
    id: 'host.mcp.postgresql.readonly',
    displayName: 'PostgreSQL Readonly MCP',
    summary: 'Draft a BMAD capability pack for PostgreSQL MCP read-only evidence.',
    template: 'capability-request.postgresql-mcp-readonly.example.json',
  },
  {
    slug: 'google-calendar-remote-mcp',
    id: 'host.mcp.google-calendar.remote',
    displayName: 'Google Calendar Remote MCP',
    summary: 'Draft a BMAD capability pack for Google Calendar remote MCP evidence.',
    template: 'capability-request.google-calendar-mcp.example.json',
  },
];
const expectedFiles = [
  'capability-pack.json',
  'capability-request.json',
  'codex-task-packet.md',
  'customization-draft.toml',
  'manifest.json',
  'operator-evidence-template.json',
  'readiness-checklist.md',
  'skill-outline.md',
];

function runForge(args, options = {}) {
  return spawnSync(process.execPath, [forgeCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listRelativeFiles(root) {
  return fs
    .readdirSync(root)
    .filter((entry) => fs.statSync(path.join(root, entry)).isFile())
    .sort();
}

function writeForgeFixture({
  capability,
  capabilityRequestTemplate,
  packMode = 'verifier-ready',
  evidenceSourceType = 'repo_template',
  requestPatch = {},
  evidencePatch = {},
}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `cpf-${capability.slug || 'fixture'}-`));
  const evidence = {
    kind: 'capability-pack-local-evidence',
    schemaVersion: 1,
    capabilityId: capability.id,
    evidenceSource: 'repo-local fixture',
    reviewedAt: '2026-05-07',
    notes: ['Local deterministic evidence only.', 'No live tools, network, credentials, or runtime state.'],
    ...evidencePatch,
  };
  fs.writeFileSync(path.join(tempDir, 'operator-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

  const request = {
    kind: 'bmad-capability-pack-forge-request',
    schemaVersion: 1,
    packMode,
    capability: {
      id: capability.id,
      displayName: capability.displayName,
      summary: capability.summary,
    },
    targetCustomizationSurface: 'bmad-agent-dev',
    primaryEvidenceRef: 'operator-evidence',
    evidenceRefs: [
      {
        id: 'operator-evidence',
        kind: 'capability-pack-local-evidence',
        path: 'operator-evidence.json',
        role: 'advisory-local-evidence',
        sourceType: evidenceSourceType,
      },
    ],
    acceptanceCriteria: [
      {
        id: 'AC-MCPF-TEST',
        statement: 'Forge emits deterministic draft artifacts from local evidence files.',
      },
    ],
    ...requestPatch,
  };

  if (capabilityRequestTemplate) {
    fs.copyFileSync(
      path.join(repoRoot, 'docs', 'workspace', 'templates', capabilityRequestTemplate),
      path.join(tempDir, 'capability-request.json'),
    );
    request.capabilityRequestRef = 'capability-request.json';
  }

  fs.writeFileSync(path.join(tempDir, 'forge-request.json'), `${JSON.stringify(request, null, 2)}\n`);
  return {
    inputPath: path.join(tempDir, 'forge-request.json'),
    outputDir: path.join(tempDir, 'out'),
  };
}

function assertNoSecretLookingValues(label, content) {
  const withoutAllowedContext7Placeholder = content.replaceAll('ctx7_test_placeholder_DO_NOT_USE', '');
  assert(!/ctx7_[A-Za-z0-9_-]{12,}/.test(withoutAllowedContext7Placeholder), `${label} omits real-looking Context7 keys`);
  assert(!/\bsk-[A-Za-z0-9_-]{8,}/.test(content), `${label} omits API-key-like values`);
  assert(!/postgres(?:ql)?:\/\/[^"'<\s)]+/i.test(content), `${label} omits PostgreSQL URLs`);
  assert(!/POSTGRES_URL\s*=\s*(?!set\b|unset\b)/.test(content), `${label} omits raw POSTGRES_URL values`);
  assert(!/DATABASE_URL\s*=\s*(?!set\b|unset\b)/.test(content), `${label} omits raw DATABASE_URL values`);
  assert(!/PGPASSWORD\s*=/.test(content), `${label} omits raw PGPASSWORD values`);
}

function assertSchemaSurface(schema) {
  assert.equal(schema.title, 'BMAD Capability Pack');
  assert.equal(schema.type, 'object');
  assert(schema.required.includes('kind'), 'schema requires kind');
  assert(schema.required.includes('schemaVersion'), 'schema requires schemaVersion');
  assert(schema.required.includes('metadata'), 'schema requires metadata');
  assert(schema.required.includes('capability'), 'schema requires capability');
  assert(schema.required.includes('artifacts'), 'schema requires artifacts');
  assert.equal(schema.properties.kind.const, 'bmad-capability-pack');
  assert.equal(schema.properties.schemaVersion.const, 1);
}

function testContext7MinimalPack() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-context7-'));
  const requestPath = path.join(fixtureRoot, 'forge-request.json');
  const beforeCommands = [...WORKSPACE_COMMAND_NAMES];

  const result = runForge(['--input', requestPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(WORKSPACE_COMMAND_NAMES, beforeCommands, 'Forge does not mutate Workspace command registry');
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const schema = readJson(schemaPath);
  assertSchemaSurface(schema);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.kind, 'bmad-capability-pack');
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.metadata.source, 'capability-pack-forge');
  assert.equal(pack.status.packMode, 'verifier-ready');
  assert.equal(pack.status.label, 'Ready');
  assert.equal(pack.capability.id, 'host.mcp.context7.docs');
  assert(pack.boundaries.includes('No live tool access.'), 'pack records no live tool boundary');
  assert(pack.boundaries.includes('No Workspace command is added.'), 'pack records Workspace command boundary');
  assert(pack.boundaries.includes('Generated artifacts are drafts until human review.'), 'pack records draft boundary');
  assert(
    pack.inputs.every((entry) => !/^[a-z][a-z0-9+.-]*:/i.test(entry.path)),
    'pack input refs are local paths',
  );
  assert(!JSON.stringify(pack).includes('liveToolInvocation'), 'pack omits live tool invocation fields');

  const capabilityRequest = readJson(path.join(outputDir, 'capability-request.json'));
  const verdict = verifyCapabilityRequest(capabilityRequest);
  assert.equal(verdict.ok, true, JSON.stringify(verdict, null, 2));

  const manifest = readJson(path.join(outputDir, 'manifest.json'));
  assert.equal(manifest.kind, 'bmad-capability-pack-manifest');
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(
    manifest.artifacts.map((artifact) => artifact.path).sort(),
    expectedFiles.filter((file) => file !== 'manifest.json').sort(),
  );
  for (const artifact of manifest.artifacts) {
    assert(/^[a-f0-9]{64}$/.test(artifact.sha256), `manifest records sha256 for ${artifact.path}`);
  }

  for (const file of expectedFiles) {
    assertNoSecretLookingValues(file, fs.readFileSync(path.join(outputDir, file), 'utf8'));
  }
  assert(fs.readFileSync(path.join(outputDir, 'customization-draft.toml'), 'utf8').includes('[workflow]'));
  assert(fs.readFileSync(path.join(outputDir, 'codex-task-packet.md'), 'utf8').includes('instruction draft'));

  const secondOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-context7-second-'));
  const secondResult = runForge(['--input', requestPath, '--output', secondOutputDir]);
  assert.equal(secondResult.status, 0, `${secondResult.stdout}\n${secondResult.stderr}`);
  for (const file of expectedFiles) {
    assert.equal(
      fs.readFileSync(path.join(outputDir, file), 'utf8'),
      fs.readFileSync(path.join(secondOutputDir, file), 'utf8'),
      `${file} is deterministic`,
    );
  }
}

function testV1JsonAuthorityDoesNotRequireV2CompilerState() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-v1-authority-'));
  assert(!fs.existsSync(path.join(tempDir, '.capability-forge')), 'fixture starts without v2 compiler config');
  const requestPath = path.join(fixtureRoot, 'forge-request.json');
  const outputDir = path.join(tempDir, 'out');
  const result = runForge(['--input', requestPath, '--output', outputDir], { cwd: tempDir });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);
  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.metadata.source, 'capability-pack-forge');
  assert(!fs.existsSync(path.join(tempDir, '.capability-forge')), 'v1 JSON path does not create v2 compiler state');
}

function testGenericEvidenceRefsWithoutContext7() {
  const { inputPath, outputDir } = writeForgeFixture({
    capability: declaredPackTemplates[0],
    capabilityRequestTemplate: declaredPackTemplates[0].template,
    evidenceSourceType: 'local_docs',
  });

  const request = readJson(inputPath);
  assert(!('context7EvidenceRef' in request), 'generic fixture omits deprecated Context7 evidence field');

  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.status.packMode, 'verifier-ready');
  const operatorInput = pack.inputs.find((input) => input.id === 'operator-evidence');
  assert.equal(operatorInput.sourceType, 'local_docs');

  const outputText = expectedFiles.map((file) => fs.readFileSync(path.join(outputDir, file), 'utf8')).join('\n');
  assert(!outputText.includes('context7EvidenceRef'), 'generated artifacts omit deprecated Context7 evidence field name');
  assert(!outputText.includes('Context7'), 'generic non-Context7 evidence does not render Context7 wording');
}

function testDeclaredCapabilityPacksGenerate() {
  for (const capability of declaredPackTemplates) {
    const { inputPath, outputDir } = writeForgeFixture({
      capability,
      capabilityRequestTemplate: capability.template,
      evidenceSourceType: 'repo_template',
    });

    const result = runForge(['--input', inputPath, '--output', outputDir]);
    assert.equal(result.status, 0, `${capability.slug}\n${result.stdout}\n${result.stderr}`);
    assert.deepEqual(listRelativeFiles(outputDir), expectedFiles, `${capability.slug} emits expected files`);

    const capabilityRequest = readJson(path.join(outputDir, 'capability-request.json'));
    const verdict = verifyCapabilityRequest(capabilityRequest);
    assert.equal(verdict.ok, true, `${capability.slug} capability request verifies\n${JSON.stringify(verdict, null, 2)}`);

    const pack = readJson(path.join(outputDir, 'capability-pack.json'));
    assert.equal(pack.capability.id, capability.id, `${capability.slug} records capability id`);
    assert.equal(pack.status.packMode, 'verifier-ready', `${capability.slug} records verifier-ready mode`);
    assert.equal(pack.status.verificationStatus, 'ready', `${capability.slug} records ready verification status`);
    assert.equal(pack.status.label, 'Ready', `${capability.slug} records Ready label`);

    const manifest = readJson(path.join(outputDir, 'manifest.json'));
    assert.deepEqual(
      manifest.artifacts.map((artifact) => artifact.path).sort(),
      expectedFiles.filter((file) => file !== 'manifest.json').sort(),
      `${capability.slug} manifest lists non-manifest artifacts`,
    );
  }
}

function testPostgresqlTomlForgeBoundary() {
  const capability = declaredPackTemplates.find((entry) => entry.slug === 'postgresql-readonly-mcp');
  const { inputPath, outputDir } = writeForgeFixture({
    capability,
    capabilityRequestTemplate: capability.template,
    evidenceSourceType: 'manual_contract',
    requestPatch: {
      capabilityDomain: 'postgresql',
      draftAuthoring: 'toml',
    },
    evidencePatch: {
      credentialEvidence: 'POSTGRES_URL=set',
      localEvidenceOnly: true,
    },
  });

  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.metadata.capabilityDomain, 'postgresql');
  assert.equal(pack.metadata.draftAuthoring, 'toml');
  assert(
    pack.inputs.every((entry) => entry.sourceType === 'manual_contract'),
    'PostgreSQL pack uses local evidence refs',
  );

  const operatorEvidence = readJson(path.join(outputDir, 'operator-evidence-template.json'));
  assert.equal(operatorEvidence.capabilityDomain, 'postgresql');
  assert.equal(operatorEvidence.draftAuthoring, 'toml');
  assert.equal(operatorEvidence.credentialEvidence, 'POSTGRES_URL=set|unset');

  const customizationDraft = fs.readFileSync(path.join(outputDir, 'customization-draft.toml'), 'utf8');
  assert(customizationDraft.includes('TOML authoring is draft-only'));
  assert(customizationDraft.includes('PostgreSQL capability packs use local evidence refs only'));

  const checklist = fs.readFileSync(path.join(outputDir, 'readiness-checklist.md'), 'utf8');
  assert(checklist.includes('POSTGRES_URL=set|unset'));
  assert(checklist.includes('Forge does not parse TOML input in v1'));

  const taskPacket = fs.readFileSync(path.join(outputDir, 'codex-task-packet.md'), 'utf8');
  assert(taskPacket.includes('Treat PostgreSQL as a generated capability domain only'));
  assert(taskPacket.includes('Treat TOML as generated authoring draft only'));

  const manifest = readJson(path.join(outputDir, 'manifest.json'));
  assert.equal(manifest.kind, 'bmad-capability-pack-manifest');
  const capabilityRequest = readJson(path.join(outputDir, 'capability-request.json'));
  assert.equal(verifyCapabilityRequest(capabilityRequest).ok, true, 'PostgreSQL generated request remains JSON verifier input');

  for (const file of expectedFiles) {
    assertNoSecretLookingValues(file, fs.readFileSync(path.join(outputDir, file), 'utf8'));
  }
}

function testForbiddenLivePostgresEvidenceFails() {
  const capability = declaredPackTemplates.find((entry) => entry.slug === 'postgresql-readonly-mcp');
  const cases = [
    { name: 'raw postgres url', evidencePatch: { connectionString: 'postgres://user:pass@example.test/db' } },
    { name: 'raw POSTGRES_URL', evidencePatch: { env: 'POSTGRES_URL=postgres://user:pass@example.test/db' } },
    { name: 'raw DATABASE_URL', evidencePatch: { env: 'DATABASE_URL=postgres://user:pass@example.test/db' } },
    { name: 'raw PGPASSWORD', evidencePatch: { env: 'PGPASSWORD=swordfish' } },
    { name: 'queryResults', evidencePatch: { queryResults: [{ id: 1 }] } },
    { name: 'liveMcp', evidencePatch: { liveMcp: true } },
    { name: 'postgres_live', evidencePatch: { postgres_live: true } },
    { name: 'dockerRuntime', evidencePatch: { dockerRuntime: { state: 'running' } } },
    { name: 'network', evidencePatch: { network: { reachable: true } } },
    { name: 'liveSchema', evidencePatch: { liveSchema: { tables: ['users'] } } },
    { name: 'sampleRows', evidencePatch: { sampleRows: [{ id: 1 }] } },
  ];

  for (const testCase of cases) {
    const { inputPath, outputDir } = writeForgeFixture({
      capability,
      capabilityRequestTemplate: capability.template,
      evidenceSourceType: 'manual_contract',
      requestPatch: { capabilityDomain: 'postgresql', draftAuthoring: 'toml' },
      evidencePatch: testCase.evidencePatch,
    });

    const result = runForge(['--input', inputPath, '--output', outputDir]);
    assert.notEqual(result.status, 0, `${testCase.name} should fail`);
    assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_SECRET_DETECTED'), `${testCase.name} reports a boundary violation`);
  }
}

function testDraftAuthoringTomlPack() {
  const { inputPath, outputDir } = writeForgeFixture({
    capability: {
      slug: 'toml-authoring-draft',
      id: 'authoring.toml.bmad-customize-draft',
      displayName: 'TOML Authoring Draft',
      summary: 'Draft a BMAD capability pack for TOML customization authoring guidance.',
    },
    packMode: 'draft-authoring',
    evidenceSourceType: 'local_docs',
  });

  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.status.packMode, 'draft-authoring');
  assert.equal(pack.status.verificationStatus, 'draft_no_contract');
  assert.equal(pack.status.label, 'Draft');

  const draftRequest = readJson(path.join(outputDir, 'capability-request.json'));
  assert.equal(draftRequest.kind, 'bmad-workspace-capability-request-draft');
  assert.equal(draftRequest.verificationStatus, 'draft_no_contract');
  assert.equal(verifyCapabilityRequest(draftRequest).ok, false, 'TOML draft is not verifier-compatible');

  const checklist = fs.readFileSync(path.join(outputDir, 'readiness-checklist.md'), 'utf8');
  assert(checklist.includes('not verifier-declared'), 'TOML checklist states non-verifier status');
  assert(!checklist.includes('verifies offline'), 'TOML draft checklist avoids verifier-ready claim');
}

function testVerifierReadyRequiresCapabilityRequest() {
  const { inputPath, outputDir } = writeForgeFixture({
    capability: {
      slug: 'toml-verifier-rejected',
      id: 'authoring.toml.bmad-customize-draft',
      displayName: 'TOML Verifier Rejected',
      summary: 'Attempt to forge TOML as verifier-ready without a capability request.',
    },
    packMode: 'verifier-ready',
    evidenceSourceType: 'local_docs',
  });

  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_REQUEST_INVALID'));
}

function testMissingInputFails() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-missing-input-'));
  const result = runForge(['--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(
    `${result.stdout}\n${result.stderr}`.includes('Usage: node tools/capability-pack-forge.js --input <forge-request.json> --output <dir>'),
  );
}

function testMalformedJsonFails() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-malformed-'));
  const inputPath = path.join(tempDir, 'forge-request.json');
  fs.writeFileSync(inputPath, '{not-json\n');
  const outputDir = path.join(tempDir, 'out');
  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_REQUEST_INVALID'));
}

function testRemoteEvidencePathFails() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-remote-ref-'));
  const request = readJson(path.join(fixtureRoot, 'forge-request.json'));
  request.context7EvidenceRef = 'https://context7.com/docs/installation';
  const inputPath = path.join(tempDir, 'forge-request.json');
  fs.writeFileSync(inputPath, `${JSON.stringify(request, null, 2)}\n`);
  const outputDir = path.join(tempDir, 'out');
  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_LOCAL_FILE_ONLY'));
}

function testSecretLikeValueFails() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-secret-'));
  const request = readJson(path.join(fixtureRoot, 'forge-request.json'));
  request.evidenceRefs.push({
    id: 'bad-secret',
    kind: 'operator-note',
    path: 'context7-docs-operator-evidence.json',
    role: 'ctx7_live_secret_ctx7_badSecretValue123456789',
  });
  fs.copyFileSync(
    path.join(fixtureRoot, 'context7-docs-operator-evidence.json'),
    path.join(tempDir, 'context7-docs-operator-evidence.json'),
  );
  fs.copyFileSync(path.join(fixtureRoot, 'capability-request.json'), path.join(tempDir, 'capability-request.json'));
  const inputPath = path.join(tempDir, 'forge-request.json');
  fs.writeFileSync(inputPath, `${JSON.stringify(request, null, 2)}\n`);
  const outputDir = path.join(tempDir, 'out');
  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_SECRET_DETECTED'));
}

function testExistingOutputDirWithFilesFails() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-output-exists-'));
  const outputDir = path.join(tempDir, 'out');
  fs.mkdirSync(outputDir);
  fs.writeFileSync(path.join(outputDir, 'leftover.txt'), 'do not overwrite\n');
  const result = runForge(['--input', path.join(fixtureRoot, 'forge-request.json'), '--output', outputDir]);
  assert.notEqual(result.status, 0);
  assert(`${result.stdout}\n${result.stderr}`.includes('FORGE_OUTPUT_EXISTS'));
  assert.equal(fs.readFileSync(path.join(outputDir, 'leftover.txt'), 'utf8'), 'do not overwrite\n');
}

testContext7MinimalPack();
testV1JsonAuthorityDoesNotRequireV2CompilerState();
testGenericEvidenceRefsWithoutContext7();
testDeclaredCapabilityPacksGenerate();
testPostgresqlTomlForgeBoundary();
testForbiddenLivePostgresEvidenceFails();
testDraftAuthoringTomlPack();
testVerifierReadyRequiresCapabilityRequest();
testMissingInputFails();
testMalformedJsonFails();
testRemoteEvidencePathFails();
testSecretLikeValueFails();
testExistingOutputDirWithFilesFails();

console.log('Capability Pack Forge tests passed');
