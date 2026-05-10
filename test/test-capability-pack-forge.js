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
const appsScriptFixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'cpf', 'context7-google-apps-script');
const webglFixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'cpf', 'context7-webgl-fundamentals');
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
    slug: 'context7-docs-mcp',
    id: 'host.mcp.context7.docs',
    displayName: 'Context7 Docs MCP',
    summary: 'Draft a BMAD capability pack for Context7 docs evidence.',
    template: 'capability-request.context7-docs.example.json',
  },
  {
    slug: 'context7-google-apps-script-docs',
    id: 'host.mcp.context7.google-apps-script.docs',
    displayName: 'Google Apps Script Context7 Docs',
    summary: 'Draft a BMAD capability pack for Google Apps Script docs evidence through Context7.',
    template: 'capability-request.context7-google-apps-script.example.json',
  },
  {
    slug: 'context7-webgl-fundamentals-docs',
    id: 'host.mcp.context7.webgl-fundamentals.docs',
    displayName: 'Context7 WebGL Fundamentals Docs',
    summary: 'Draft a BMAD capability pack for WebGL Fundamentals docs evidence through Context7.',
    template: 'capability-request.context7-webgl-fundamentals.example.json',
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
  const env = { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1', ...options.env };
  for (const key of options.unsetEnv || []) {
    delete env[key];
  }
  return spawnSync(process.execPath, [forgeCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env,
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
  assert(!/DATABASE_URL\s*=/.test(content), `${label} omits DATABASE_URL values`);
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
  assert.equal(pack.capability.displayName, 'Context7 Docs MCP');
  assert(!JSON.stringify(pack).includes('host.mcp.context7.google-apps-script.docs'), 'generic Context7 pack keeps generic id');
  assert(
    !JSON.stringify(pack).includes('context7-google-apps-script-operator-evidence.json'),
    'generic Context7 pack keeps generic output',
  );
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

function testContext7GoogleAppsScriptPack() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-context7-apps-script-'));
  const requestPath = path.join(appsScriptFixtureRoot, 'forge-request.json');
  const beforeCommands = [...WORKSPACE_COMMAND_NAMES];

  const result = runForge(['--input', requestPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(WORKSPACE_COMMAND_NAMES, beforeCommands, 'Apps Script Forge fixture does not mutate Workspace command registry');
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.kind, 'bmad-capability-pack');
  assert.equal(pack.capability.id, 'host.mcp.context7.google-apps-script.docs');
  assert.equal(pack.capability.displayName, 'Google Apps Script Context7 Docs');
  assert.equal(pack.status.packMode, 'verifier-ready');
  assert.equal(pack.status.verificationStatus, 'ready');
  assert(pack.boundaries.includes('No live tool access.'), 'Apps Script pack records no live tool boundary');
  assert(pack.boundaries.includes('No Workspace command is added.'), 'Apps Script pack records Workspace command boundary');
  assert(pack.boundaries.includes('No runtime authority is granted.'), 'Apps Script pack records runtime boundary');

  const capabilityRequest = readJson(path.join(outputDir, 'capability-request.json'));
  const verdict = verifyCapabilityRequest(capabilityRequest);
  assert.equal(verdict.ok, true, JSON.stringify(verdict, null, 2));
  assert.equal(verdict.request.id, 'host.mcp.context7.google-apps-script.docs');
  assert.deepEqual(verdict.matchedDeclaration.outputs, ['context7-google-apps-script-operator-evidence.json']);

  const outputText = expectedFiles.map((file) => fs.readFileSync(path.join(outputDir, file), 'utf8')).join('\n');
  for (const text of [
    'Google Apps Script Context7 Docs',
    'host.mcp.context7.google-apps-script.docs',
    'context7-google-apps-script-operator-evidence.json',
    'apps-script-guide',
    'apps-script-reference',
    'apps-script-samples',
    '/websites/developers_google_apps-script',
    '/websites/developers_google_apps-script_reference',
    '/googleworkspace/apps-script-samples',
    'No live tools',
    'No Workspace command changes',
  ]) {
    assert(outputText.includes(text), `Apps Script generated artifacts include ${text}`);
  }
  assert(!outputText.includes('mcp_servers.context7'), 'Apps Script generated artifacts do not configure MCP');
  assert(!outputText.includes('liveToolInvocation'), 'Apps Script generated artifacts omit live tool invocation fields');

  for (const file of expectedFiles) {
    assertNoSecretLookingValues(file, fs.readFileSync(path.join(outputDir, file), 'utf8'));
  }
}

function testContext7WebglFundamentalsPack() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-context7-webgl-'));
  const requestPath = path.join(webglFixtureRoot, 'forge-request.json');
  const beforeCommands = [...WORKSPACE_COMMAND_NAMES];

  const result = runForge(['--input', requestPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(WORKSPACE_COMMAND_NAMES, beforeCommands, 'WebGL Fundamentals Forge fixture does not mutate Workspace command registry');
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.kind, 'bmad-capability-pack');
  assert.equal(pack.capability.id, 'host.mcp.context7.webgl-fundamentals.docs');
  assert.equal(pack.capability.displayName, 'Context7 WebGL Fundamentals Docs');
  assert.equal(pack.status.packMode, 'verifier-ready');
  assert.equal(pack.status.verificationStatus, 'ready');
  assert(pack.boundaries.includes('No live tool access.'), 'WebGL Fundamentals pack records no live tool boundary');
  assert(pack.boundaries.includes('No Workspace command is added.'), 'WebGL Fundamentals pack records Workspace command boundary');
  assert(pack.boundaries.includes('No runtime authority is granted.'), 'WebGL Fundamentals pack records runtime boundary');

  const capabilityRequest = readJson(path.join(outputDir, 'capability-request.json'));
  const verdict = verifyCapabilityRequest(capabilityRequest);
  assert.equal(verdict.ok, true, JSON.stringify(verdict, null, 2));
  assert.equal(verdict.request.id, 'host.mcp.context7.webgl-fundamentals.docs');
  assert.deepEqual(verdict.matchedDeclaration.outputs, ['context7-webgl-fundamentals-operator-evidence.json']);
  assert.deepEqual(verdict.matchedDeclaration.writes, []);

  const outputText = expectedFiles.map((file) => fs.readFileSync(path.join(outputDir, file), 'utf8')).join('\n');
  for (const text of [
    'Context7 WebGL Fundamentals Docs',
    'host.mcp.context7.webgl-fundamentals.docs',
    'context7-webgl-fundamentals-operator-evidence.json',
    'webgl-fundamentals',
    '/websites/webglfundamentals',
    'https://context7.com/websites/webglfundamentals',
    'https://webglfundamentals.org',
    'https://webgl2fundamentals.org',
    'no separate Context7 source',
    'No live tools',
    'No Workspace command changes',
  ]) {
    assert(outputText.includes(text), `WebGL Fundamentals generated artifacts include ${text}`);
  }
  assert(
    !outputText.includes('host.mcp.context7.webgl2-fundamentals.docs'),
    'WebGL Fundamentals artifacts do not declare WebGL2 capability',
  );
  assert(!outputText.includes('/websites/webgl2fundamentals'), 'WebGL Fundamentals artifacts do not declare WebGL2 Context7 source');
  assert(!outputText.includes('mcp_servers.context7'), 'WebGL Fundamentals generated artifacts do not configure MCP');
  assert(!outputText.includes('liveToolInvocation'), 'WebGL Fundamentals generated artifacts omit live tool invocation fields');

  for (const file of expectedFiles) {
    assertNoSecretLookingValues(file, fs.readFileSync(path.join(outputDir, file), 'utf8'));
  }
}

function testV1JsonAuthorityDoesNotRequireV2CompilerState() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-v1-authority-'));
  assert(!fs.existsSync(path.join(tempDir, '.capability-forge')), 'fixture starts without v2 compiler config');
  const requestPath = path.join(fixtureRoot, 'forge-request.json');
  const outputDir = path.join(tempDir, 'out');
  const result = runForge(['--input', requestPath, '--output', outputDir], {
    cwd: tempDir,
    unsetEnv: ['CAPABILITY_FORGE_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL', 'PGPASSWORD'],
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(listRelativeFiles(outputDir), expectedFiles);
  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.metadata.source, 'capability-pack-forge');
  assert(!fs.existsSync(path.join(tempDir, '.capability-forge')), 'v1 JSON path does not create v2 compiler state');
}

function testV1JsonPathIgnoresV2CompilerStateAndKeepsCanonicalOutputs() {
  const poisonSentinels = [
    'BMAD_POISON_CAPABILITY_FORGE_DB_SENTINEL',
    'BMAD_POISON_DATABASE_URL_SENTINEL',
    'BMAD_POISON_DOT_GRAPHIFY_SENTINEL',
    'BMAD_POISON_FORGE_CONFIG_SENTINEL',
    'BMAD_POISON_GRAPHIFY_SENTINEL',
    'BMAD_POISON_MCP_SENTINEL',
    'BMAD_POISON_PACK_DRAFT_SENTINEL',
    'BMAD_POISON_PGPASSWORD_SENTINEL',
    'BMAD_POISON_POSTGRES_URL_SENTINEL',
    'BMAD_POISON_CODEX_CONFIG_SENTINEL',
    'BMAD_POISON_CUSTOM_SURFACE_SENTINEL',
    'BMAD_POISON_WORKSPACE_RUNTIME_SENTINEL',
  ];
  const capability = declaredPackTemplates.find((entry) => entry.slug === 'postgresql-readonly-mcp');
  const clean = writeForgeFixture({
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
  const noisy = writeForgeFixture({
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
  const noisyRoot = path.dirname(noisy.inputPath);
  fs.mkdirSync(path.join(noisyRoot, '.capability-forge', 'drafts', 'ignored-pack'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, '.capability-forge', 'forge.toml'),
    [
      'schema_version = "capability-forge.v2"',
      '',
      '[database]',
      'url_env = "CAPABILITY_FORGE_DATABASE_URL"',
      'schema = "BMAD_POISON_FORGE_CONFIG_SENTINEL"',
      '',
      '[workspace]',
      'write_mode = "draft_only"',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(noisyRoot, '.capability-forge', 'drafts', 'ignored-pack', 'pack-draft.toml'),
    [
      'schema_version = "capability-pack-draft.v2"',
      'slug = "ignored-pack"',
      'pack_id = "capability-pack.ignored-pack"',
      'title = "Ignored Pack"',
      'description = "BMAD_POISON_PACK_DRAFT_SENTINEL"',
      'status = "approved"',
      'workspace_runtime_change = false',
      '',
    ].join('\n'),
  );
  fs.mkdirSync(path.join(noisyRoot, 'graph'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, 'graph', 'ignored.graph.json'),
    `${JSON.stringify({ nodes: [{ id: 'BMAD_POISON_GRAPHIFY_SENTINEL' }], links: [] }, null, 2)}\n`,
  );
  fs.mkdirSync(path.join(noisyRoot, '.graphify'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, '.graphify', 'ignored.graph.json'),
    `${JSON.stringify({ nodes: [{ id: 'BMAD_POISON_DOT_GRAPHIFY_SENTINEL' }], links: [] }, null, 2)}\n`,
  );
  fs.mkdirSync(path.join(noisyRoot, 'mcp'), { recursive: true });
  fs.writeFileSync(path.join(noisyRoot, 'mcp', 'state.json'), '{"poison":"BMAD_POISON_MCP_SENTINEL","tool":"context7",\n');
  fs.mkdirSync(path.join(noisyRoot, '.codex'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, '.codex', 'config.toml'),
    ['[features]', 'goals = true', 'poison = "BMAD_POISON_CODEX_CONFIG_SENTINEL"', '[broken', ''].join('\n'),
  );
  fs.mkdirSync(path.join(noisyRoot, '_bmad', 'custom'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, '_bmad', 'custom', 'bmad-workspace.toml'),
    ['poison = "BMAD_POISON_CUSTOM_SURFACE_SENTINEL"', 'capability_forge = "must-not-drive-v1"', '[broken', ''].join('\n'),
  );
  fs.mkdirSync(path.join(noisyRoot, '_bmad-output', 'workspace-runtime', 'sessions', 'poison-session'), { recursive: true });
  fs.writeFileSync(
    path.join(noisyRoot, '_bmad-output', 'workspace-runtime', 'sessions', 'poison-session', 'instance.json'),
    '{"poison":"BMAD_POISON_WORKSPACE_RUNTIME_SENTINEL","sessionType":"normal",\n',
  );

  const poisonedEnv = {
    CAPABILITY_FORGE_DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/BMAD_POISON_CAPABILITY_FORGE_DB_SENTINEL',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/BMAD_POISON_DATABASE_URL_SENTINEL',
    GRAPHIFY_LIVE_STATE: 'BMAD_POISON_GRAPHIFY_SENTINEL',
    PGPASSWORD: 'BMAD_POISON_PGPASSWORD_SENTINEL',
    POSTGRES_URL: 'postgres://user:pass@127.0.0.1:1/BMAD_POISON_POSTGRES_URL_SENTINEL',
  };
  const cleanResult = runForge(['--input', clean.inputPath, '--output', clean.outputDir], {
    env: poisonedEnv,
  });
  const noisyResult = runForge(['--input', noisy.inputPath, '--output', noisy.outputDir], {
    cwd: noisyRoot,
    env: poisonedEnv,
  });
  assert.equal(cleanResult.status, 0, `${cleanResult.stdout}\n${cleanResult.stderr}`);
  assert.equal(noisyResult.status, 0, `${noisyResult.stdout}\n${noisyResult.stderr}`);
  assert.deepEqual(listRelativeFiles(noisy.outputDir), expectedFiles);
  assert.deepEqual(listRelativeFiles(clean.outputDir), expectedFiles);

  for (const file of expectedFiles) {
    assert.equal(
      fs.readFileSync(path.join(noisy.outputDir, file), 'utf8'),
      fs.readFileSync(path.join(clean.outputDir, file), 'utf8'),
      `${file} stays canonical with adjacent v2 compiler state`,
    );
  }

  const capabilityRequest = readJson(path.join(noisy.outputDir, 'capability-request.json'));
  assert.equal(verifyCapabilityRequest(capabilityRequest).ok, true, 'v1 output remains self-contained verifier JSON');
  const outputText = expectedFiles.map((file) => fs.readFileSync(path.join(noisy.outputDir, file), 'utf8')).join('\n');
  const commandText = `${cleanResult.stdout}\n${cleanResult.stderr}\n${noisyResult.stdout}\n${noisyResult.stderr}`;
  assert(!outputText.includes('ignored-pack'), 'v1 output ignores adjacent pack-draft.toml');
  for (const sentinel of poisonSentinels) {
    assert(!outputText.includes(sentinel), `v1 output ignores ambient sentinel ${sentinel}`);
    assert(!commandText.includes(sentinel), `v1 stdout/stderr ignore ambient sentinel ${sentinel}`);
  }
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
    { name: 'DATABASE_URL set state', evidencePatch: { env: 'DATABASE_URL=set' } },
    { name: 'DATABASE_URL unset state', evidencePatch: { env: 'DATABASE_URL=unset' } },
    { name: 'raw PGPASSWORD', evidencePatch: { env: 'PGPASSWORD=swordfish' } },
    { name: 'queryResults', evidencePatch: { queryResults: [{ id: 1 }] } },
    { name: 'liveMcp', evidencePatch: { liveMcp: true } },
    { name: 'postgres_live', evidencePatch: { postgres_live: true } },
    { name: 'dockerRuntime', evidencePatch: { dockerRuntime: { state: 'running' } } },
    { name: 'network', evidencePatch: { network: { reachable: true } } },
    { name: 'liveSchema', evidencePatch: { liveSchema: { tables: ['users'] } } },
    { name: 'sampleRows', evidencePatch: { sampleRows: [{ id: 1 }] } },
    { name: 'yaml queryResults', evidencePatch: { notes: ['queryResults: unsafe'] } },
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

function createAgenticSearchToolClasses() {
  return [
    ['file-search', 'File Search'],
    ['skill-loading', 'Skill Loading'],
    ['database-query', 'Database Query'],
    ['web-search', 'Web Search'],
    ['memory', 'Memory'],
    ['shell', 'Shell'],
  ].map(([classId, toolName]) => ({
    class: classId,
    toolName,
    corePurpose: `${toolName} retrieves context for Agentic Search decisions.`,
    triggerCondition: `Use ${toolName} when that context source is likely authoritative for the user request.`,
    negativeTriggerCondition: `Do not use ${toolName} when another context source is the declared authority.`,
    parameterComplexity: classId === 'shell' || classId === 'database-query' ? 'high' : 'low',
    authorityBoundary: 'Retrieved context is advisory only; it is not verifier input, not grant authority, and not Workspace authority.',
    evidenceBoundary:
      'Record source refs and set/unset credential signals only; do not store secrets, raw query results, or live runtime proof.',
  }));
}

function testAgenticSearchToolStackMetadata() {
  const toolClasses = createAgenticSearchToolClasses();
  const { inputPath, outputDir } = writeForgeFixture({
    capability: declaredPackTemplates.find((entry) => entry.slug === 'codex-manual-executor'),
    capabilityRequestTemplate: 'capability-request.codex-manual.example.json',
    requestPatch: {
      agenticSearch: {
        domain: 'Agentic Search for Context Engineering',
        toolClasses,
      },
    },
  });

  const result = runForge(['--input', inputPath, '--output', outputDir]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const pack = readJson(path.join(outputDir, 'capability-pack.json'));
  assert.equal(pack.agenticSearch.domain, 'Agentic Search for Context Engineering');
  assert.deepEqual(
    pack.agenticSearch.toolClasses.map((toolClass) => toolClass.class),
    ['file-search', 'skill-loading', 'database-query', 'web-search', 'memory', 'shell'],
  );
  assert(
    pack.agenticSearch.toolClasses.every(
      (toolClass) =>
        toolClass.authorityBoundary.includes('not verifier input') && toolClass.authorityBoundary.includes('not Workspace authority'),
    ),
    'Agentic Search tool classes preserve authority boundary',
  );

  const operatorEvidence = readJson(path.join(outputDir, 'operator-evidence-template.json'));
  assert.equal(operatorEvidence.agenticSearch.domain, 'Agentic Search for Context Engineering');
  assert.equal(operatorEvidence.agenticSearch.toolClasses.length, 6);

  const checklist = fs.readFileSync(path.join(outputDir, 'readiness-checklist.md'), 'utf8');
  for (const text of [
    'Agentic Search for Context Engineering',
    'file-search',
    'skill-loading',
    'database-query',
    'web-search',
    'memory',
    'shell',
  ]) {
    assert(checklist.includes(text), `readiness checklist includes ${text}`);
  }
  assert(checklist.includes('trigger condition') && checklist.includes('negative trigger condition'), 'checklist requires trigger review');

  const skillOutline = fs.readFileSync(path.join(outputDir, 'skill-outline.md'), 'utf8');
  assert(skillOutline.includes('Agentic Search Tool Classes'), 'skill outline names Agentic Search tool classes');

  const taskPacket = fs.readFileSync(path.join(outputDir, 'codex-task-packet.md'), 'utf8');
  assert(taskPacket.includes('Do not call live Agentic Search tools'), 'task packet blocks live tool calls');
}

function testAgenticSearchToolStackMetadataRejectsInvalidDefinitions() {
  const cases = [
    {
      name: 'missing canonical tool class',
      toolClasses: createAgenticSearchToolClasses().filter((toolClass) => toolClass.class !== 'shell'),
      expected: 'shell',
    },
    {
      name: 'unsafe authority boundary',
      toolClasses: createAgenticSearchToolClasses().map((toolClass) =>
        toolClass.class === 'web-search' ? { ...toolClass, authorityBoundary: 'Retrieved context is useful.' } : toolClass,
      ),
      expected: 'authorityBoundary',
    },
  ];
  for (const testCase of cases) {
    const { inputPath, outputDir } = writeForgeFixture({
      capability: declaredPackTemplates.find((entry) => entry.slug === 'codex-manual-executor'),
      capabilityRequestTemplate: 'capability-request.codex-manual.example.json',
      requestPatch: {
        agenticSearch: {
          domain: 'Agentic Search for Context Engineering',
          toolClasses: testCase.toolClasses,
        },
      },
    });

    const result = runForge(['--input', inputPath, '--output', outputDir]);
    assert.notEqual(result.status, 0, `${testCase.name} should fail`);
    const output = `${result.stdout}\n${result.stderr}`;
    assert(output.includes('FORGE_REQUEST_INVALID'), `${testCase.name} reports invalid request`);
    assert(output.includes(testCase.expected), `${testCase.name} reports ${testCase.expected}`);
  }
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
testContext7GoogleAppsScriptPack();
testContext7WebglFundamentalsPack();
testV1JsonAuthorityDoesNotRequireV2CompilerState();
testV1JsonPathIgnoresV2CompilerStateAndKeepsCanonicalOutputs();
testGenericEvidenceRefsWithoutContext7();
testDeclaredCapabilityPacksGenerate();
testPostgresqlTomlForgeBoundary();
testForbiddenLivePostgresEvidenceFails();
testDraftAuthoringTomlPack();
testAgenticSearchToolStackMetadata();
testAgenticSearchToolStackMetadataRejectsInvalidDefinitions();
testVerifierReadyRequiresCapabilityRequest();
testMissingInputFails();
testMalformedJsonFails();
testRemoteEvidencePathFails();
testSecretLikeValueFails();
testExistingOutputDirWithFilesFails();

console.log('Capability Pack Forge tests passed');
