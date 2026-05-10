/**
 * BMAD Workspace CLI Tests
 *
 * Public behavior checks for the BMAD Workspace current CLI surface.
 * Usage: node test/test-workspace-cli.js
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

const { WORKSPACE_COMMANDS, WORKSPACE_COMMAND_NAMES } = require('../tools/workspace/command-registry');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

const repoRoot = path.join(__dirname, '..');
const cliPath = path.join(repoRoot, 'tools', 'installer', 'bmad-cli.js');

let passed = 0;
let failed = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}

function section(title) {
  console.log(`\n${colors.cyan}── ${title} ──${colors.reset}`);
}

function cleanGitEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra,
  };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX']) {
    delete env[key];
  }
  return env;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: cleanGitEnv({
      BMAD_DISABLE_UPDATE_CHECK: '1',
      NO_COLOR: '1',
      ...options.env,
    }),
  });
}

function runGraphify(args) {
  return spawnSync('uv', ['tool', 'run', '--from', 'graphifyy', 'graphify', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: cleanGitEnv({
      NO_COLOR: '1',
    }),
  });
}

function commandText(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}\n${result.error?.message || ''}`;
}

function parseCliStdoutJson(result, testName) {
  const text = commandText(result);
  try {
    const parsed = JSON.parse(result.stdout);
    assert(true, `${testName} stdout parses as JSON`, text);
    return parsed;
  } catch (error) {
    assert(false, `${testName} stdout parses as JSON`, `${text}\n${error.message}`);
    return null;
  }
}

function outputContainsAny(text, sentinels) {
  return sentinels.some((sentinel) => text.includes(sentinel));
}

function assertNoSentinelLeak(result, parsedOutput, sentinels, testName) {
  const rawText = commandText(result);
  const parsedText = JSON.stringify(parsedOutput || null);
  assert(!outputContainsAny(rawText, sentinels), `${testName} does not leak sentinels in stdout/stderr`, rawText);
  assert(!outputContainsAny(parsedText, sentinels), `${testName} does not leak sentinels in parsed verdict`, parsedText);
}

function staticValidPackDraftToml() {
  return [
    '# Review-only artifact: v1 JSON remains canonical; Workspace verify-capability does not read this TOML.',
    'schema_version = "capability-pack-draft.v2"',
    'slug = "poisoned-pack"',
    'pack_id = "capability-pack.poisoned-pack"',
    'title = "Poisoned Pack"',
    'description = "BMAD_POISON_PACK_DRAFT_SENTINEL"',
    'status = "review_pending"',
    'workspace_runtime_change = false',
    '',
    '[bmad]',
    'module_code = "POISON"',
    'parent_module = "bmm"',
    'export_mode = "draft_only"',
    '',
    '[provenance]',
    'forge_run_id = 1',
    'generated_at = "1970-01-01T00:00:00.000Z"',
    'source = "capability-pack-forge-v2"',
    '',
    '[[evidence_refs]]',
    'id = "ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2"',
    'uri = "evidence/BMAD_POISON_PACK_DRAFT_SENTINEL.md"',
    'sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
    'line_start = 1',
    'line_end = 2',
    'purpose = "source"',
    '',
    '[[capabilities]]',
    'id = "cap.poisoned-pack"',
    'menu_code = "PP"',
    'title = "Poisoned Pack"',
    'intent = "Preserve BMAD_POISON_PACK_DRAFT_SENTINEL as inert review-only TOML."',
    'status = "needs_review"',
    'evidence_refs = ["ev:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#L1-L2"]',
    'acceptance = [',
    '  "Workspace verifier must reject this TOML as non-JSON input.",',
    ']',
    '',
    '[[artifacts]]',
    'kind = "pack_toml"',
    'path = ".capability-forge/drafts/poisoned-pack/pack-draft.toml"',
    'status = "draft"',
    '',
  ].join('\n');
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function createGitRepo(parentDir, name) {
  const repoDir = path.join(parentDir, name);
  fs.mkdirSync(repoDir, { recursive: true });
  git(['init'], repoDir);
  git(['config', 'user.email', 'workspace-test@example.com'], repoDir);
  git(['config', 'user.name', 'Workspace Test'], repoDir);
  fs.writeFileSync(path.join(repoDir, 'README.md'), `# ${name}\n`);
  git(['add', 'README.md'], repoDir);
  git(['commit', '-m', 'initial commit'], repoDir);
  return {
    path: repoDir,
    head: git(['rev-parse', 'HEAD'], repoDir),
  };
}

function addMinimalGraphArtifact(repo) {
  const graphDir = path.join(repo.path, 'graph');
  fs.mkdirSync(graphDir, { recursive: true });
  const graph = {
    metadata: {
      generated_by: 'test',
      slice_id: 'repository-knowledge',
      namespace: 'test',
    },
    nodes: [
      {
        id: 'test:file:readme',
        type: 'file',
        label: 'README.md',
        namespace: 'test',
        source: { path: 'README.md' },
        slice_id: 'repository-knowledge',
      },
      {
        id: 'test:concept:repo',
        type: 'concept',
        label: 'Repo Context',
        namespace: 'test',
        source: { path: 'README.md' },
        slice_id: 'repository-knowledge',
      },
    ],
    edges: [
      {
        from: 'test:file:readme',
        to: 'test:concept:repo',
        relation: 'documents',
        evidence: [{ path: 'README.md' }],
        confidence: 'EXTRACTED',
        slice_id: 'repository-knowledge',
      },
    ],
  };
  fs.writeFileSync(path.join(graphDir, 'repository-knowledge.graph.json'), `${JSON.stringify(graph, null, 2)}\n`);
  git(['add', 'graph/repository-knowledge.graph.json'], repo.path);
  git(['commit', '-m', 'add graph evidence'], repo.path);
  repo.head = git(['rev-parse', 'HEAD'], repo.path);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function fingerprintTree(root) {
  if (!fs.existsSync(root)) {
    return 'missing';
  }

  const entries = [];
  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath).sort()) {
      const absolutePath = path.join(currentPath, entry);
      const relativePath = path.relative(root, absolutePath);
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        entries.push({ type: 'dir', path: relativePath });
        walk(absolutePath);
        continue;
      }
      if (stat.isFile()) {
        entries.push({
          type: 'file',
          path: relativePath,
          sha256: sha256File(absolutePath),
        });
      }
    }
  }

  walk(root);
  return JSON.stringify(entries);
}

function copyTree(sourceRoot, destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(destinationRoot, entry.name);
    if (entry.isDirectory()) {
      copyTree(sourcePath, destinationPath);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function rewriteArchiveChecksums(archiveRoot) {
  const manifestPath = path.join(archiveRoot, 'manifest.json');
  const manifest = readJson(manifestPath);
  for (const file of manifest.files) {
    const filePath = path.join(archiveRoot, file.path);
    file.sha256 = sha256File(filePath);
    file.bytes = fs.statSync(filePath).size;
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(archiveRoot, 'checksums.sha256'), renderArchiveChecksums(manifest.files));
}

function addArchiveFile(archiveRoot, relativePath, content) {
  const filePath = path.join(archiveRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  const manifestPath = path.join(archiveRoot, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.files = manifest.files.filter((file) => file.path !== relativePath);
  manifest.files.push({
    path: relativePath,
    sha256: sha256File(filePath),
    bytes: fs.statSync(filePath).size,
  });
  manifest.files.sort((left, right) => left.path.localeCompare(right.path));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(archiveRoot, 'checksums.sha256'), renderArchiveChecksums(manifest.files));
}

function renderArchiveChecksums(files) {
  return `${files.map((file) => `${file.sha256}  ${file.path}`).join('\n')}\n`;
}

function assertSessionOutput(output, testPrefix) {
  assert(
    typeof output.sessionId === 'string' && output.sessionId.length > 0,
    `${testPrefix} has sessionId`,
    JSON.stringify(output, null, 2),
  );
  assert(!hasRemovedWorkspaceKey(output), `${testPrefix} has no removed Workspace keys`, JSON.stringify(output, null, 2));
}

function hasRemovedWorkspaceKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasRemovedWorkspaceKey);
  }
  return Object.keys(value).some((key) => key.startsWith('miss' + 'ion')) || Object.values(value).some(hasRemovedWorkspaceKey);
}

function runTests() {
  section('Workspace CLI Help');

  const result = runCli(['workspace', '--help']);
  const output = `${result.stdout}\n${result.stderr}`;

  assert(result.status === 0, 'workspace help exits zero', output);
  assert(output.includes('BMAD Workspace'), 'workspace help names BMAD Workspace', output);
  assert(output.includes('Workspace Session'), 'workspace help uses session language', output);
  assert(output.includes('--session-id <id>'), 'workspace help lists --session-id', output);
  assert(output.includes('--workflow <skill[:action]>'), 'workspace help lists --workflow', output);
  assert(!output.includes('workspace run'), 'workspace help omits workspace run', output);
  for (const option of ['--zoom-out-ref', '--ubiquitous-language-ref', '--grill-decisions-ref', '--tdd-plan-ref', '--skip-setup']) {
    assert(output.includes(option), `workspace help lists ${option}`, output);
  }
  assert(output.includes('--output <path>'), 'workspace help lists --output', output);
  assert(output.includes('--input <path>'), 'workspace help lists --input', output);
  assert(output.includes('--left <archive-dir>'), 'workspace help lists --left', output);
  assert(output.includes('--right <archive-dir>'), 'workspace help lists --right', output);
  assert(output.includes('--result-id <id>'), 'workspace help lists --result-id', output);
  assert(output.includes('--closeout-id <id>'), 'workspace help lists --closeout-id', output);
  for (const subcommand of WORKSPACE_COMMAND_NAMES) {
    assert(output.includes(subcommand), `workspace help lists ${subcommand}`, output);
  }
  for (const command of WORKSPACE_COMMANDS) {
    assert(output.includes(command.class), `workspace help lists ${command.name} class ${command.class}`, output);
  }

  const commandContract = fs.readFileSync(path.join(repoRoot, 'docs', 'workspace', 'command-contract.md'), 'utf8');
  for (const subcommand of WORKSPACE_COMMAND_NAMES) {
    assert(commandContract.includes(`\`${subcommand}\``), `command contract lists ${subcommand}`, commandContract);
  }
  for (const command of WORKSPACE_COMMANDS) {
    assert(
      commandContract.includes(`| \`${command.name}\` | \`${command.class}\` |`),
      `command contract lists ${command.name} class ${command.class}`,
      commandContract,
    );
  }
  assert(commandContract.includes('handoff` writes Markdown'), 'command contract states handoff output type', commandContract);
  assert(commandContract.includes('every other command writes JSON'), 'command contract states JSON output type', commandContract);

  section('Graphify Command Evidence');

  {
    const graphifyFixturePath = path.join(repoRoot, 'test', 'fixtures', 'graphify', 'native-node-link.graph.json');

    const help = runGraphify(['--help']);
    const helpText = commandText(help);
    assert(help.status === 0, 'Graphify help exits zero through uv', helpText);
    assert(helpText.includes('Usage: graphify'), 'Graphify help prints usage', helpText);

    const hookStatus = runGraphify(['hook', 'status']);
    const hookStatusText = commandText(hookStatus);
    assert(hookStatus.status === 0, 'Graphify hook status exits zero through uv', hookStatusText);
    assert(hookStatusText.includes('post-commit:'), 'Graphify hook status reports post-commit state', hookStatusText);
    assert(hookStatusText.includes('post-checkout:'), 'Graphify hook status reports post-checkout state', hookStatusText);

    const query = runGraphify(['query', 'capability evidence', '--graph', graphifyFixturePath]);
    const queryText = commandText(query);
    assert(query.status === 0, 'Graphify query exits zero on native node-link fixture', queryText);
    assert(queryText.includes('Capability Evidence'), 'Graphify query includes stable fixture label', queryText);

    const explain = runGraphify(['explain', 'Capability Evidence', '--graph', graphifyFixturePath]);
    const explainText = commandText(explain);
    assert(explain.status === 0, 'Graphify explain exits zero on native node-link fixture', explainText);
    assert(explainText.includes('Capability Evidence'), 'Graphify explain includes target fixture label', explainText);
    assert(explainText.includes('Workspace Verifier'), 'Graphify explain includes neighbor fixture label', explainText);

    const pathResult = runGraphify(['path', 'Capability Evidence', 'Workspace Verifier', '--graph', graphifyFixturePath]);
    const graphPathText = commandText(pathResult);
    assert(pathResult.status === 0, 'Graphify path exits zero on native node-link fixture', graphPathText);
    assert(graphPathText.includes('Capability Evidence'), 'Graphify path includes source fixture label', graphPathText);
    assert(graphPathText.includes('Workspace Verifier'), 'Graphify path includes target fixture label', graphPathText);
  }

  section('Workspace Capability Verifier CLI');

  {
    const verifierTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-capability-verifier-cli-'));
    try {
      const validRequestPath = path.join(verifierTempRoot, 'valid-request.json');
      const missingRequestPath = path.join(verifierTempRoot, 'missing-request.json');
      const capability = {
        id: 'evidence.graph.repo-intake',
        group: 'evidence.graph',
        provider: 'graphify',
        interface: 'repo-intake',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['workspace-session/intake'],
        forbiddenWrites: ['workspace-base'],
        outputs: ['repo-intake.json', 'graph.json', 'provenance.json'],
        upstreamGapProofRequired: false,
      };
      fs.writeFileSync(
        validRequestPath,
        `${JSON.stringify(
          {
            kind: 'bmad-workspace-capability-request',
            schemaVersion: 1,
            request: {
              id: 'evidence.graph.repo-intake',
              sessionType: 'normal',
              group: 'evidence.graph',
              provider: 'graphify',
              interface: 'repo-intake',
              writes: ['workspace-session/intake'],
              outputs: ['graph.json'],
            },
            capabilities: [capability],
            observations: [
              {
                code: 'CODEX_DOCS_FIXTURE',
                message: 'Codex app-server docs reviewed for advisory tool awareness.',
                details: { sourceUrl: 'https://developers.openai.com/codex/app-server', reviewedAt: '2026-05-05' },
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      fs.writeFileSync(
        missingRequestPath,
        `${JSON.stringify(
          {
            kind: 'bmad-workspace-capability-request',
            schemaVersion: 1,
            request: { id: 'Evidence.Graph.Repo-Intake', sessionType: 'normal' },
            capabilities: [capability],
          },
          null,
          2,
        )}\n`,
      );
      const malformedDeclarationPath = path.join(verifierTempRoot, 'malformed-declaration-request.json');
      const malformedCapability = { ...capability };
      delete malformedCapability.outputs;
      fs.writeFileSync(
        malformedDeclarationPath,
        `${JSON.stringify(
          {
            kind: 'bmad-workspace-capability-request',
            schemaVersion: 1,
            request: {
              id: 'evidence.graph.repo-intake',
              sessionType: 'normal',
              group: 'evidence.graph',
              provider: 'graphify',
              interface: 'repo-intake',
              writes: ['workspace-session/intake'],
              outputs: ['graph.json'],
            },
            capabilities: [malformedCapability],
            observations: [
              {
                code: 'GRAPHIFY_DOCS_FIXTURE',
                message: 'Graphify docs reviewed for advisory tool awareness.',
                details: { sourceUrl: 'https://github.com/safishamsi/graphify#full-command-reference', reviewedAt: '2026-05-05' },
              },
            ],
          },
          null,
          2,
        )}\n`,
      );

      const beforeVerify = fingerprintTree(verifierTempRoot);
      const valid = runCli(['workspace', 'verify-capability', '--input', validRequestPath]);
      const validText = `${valid.stdout}\n${valid.stderr}`;
      const afterVerify = fingerprintTree(verifierTempRoot);
      assert(valid.status === 0, 'verify-capability valid request exits zero', validText);
      assert(beforeVerify === afterVerify, 'verify-capability valid request is read-only', validText);
      const validOutput = JSON.parse(valid.stdout);
      assert(validOutput.ok === true, 'verify-capability valid request returns ok true', validText);
      assert(validOutput.matchedDeclaration.id === 'evidence.graph.repo-intake', 'verify-capability records matched id', validText);
      assert(
        validOutput.observations.some((observation) => observation.code === 'CODEX_DOCS_FIXTURE'),
        'verify-capability preserves advisory Codex observations',
        validText,
      );

      const missing = runCli(['workspace', 'verify-capability', '--input', missingRequestPath]);
      const missingText = `${missing.stdout}\n${missing.stderr}`;
      assert(missing.status === 1, 'verify-capability denied request exits one', missingText);
      const missingOutput = JSON.parse(missing.stdout);
      assert(missingOutput.ok === false, 'verify-capability denied request returns ok false', missingText);
      assert(
        missingOutput.errors.some((error) => error.code === 'CAPABILITY_NOT_DECLARED'),
        'verify-capability denied request names CAPABILITY_NOT_DECLARED',
        missingText,
      );

      const beforeMalformedVerify = fingerprintTree(verifierTempRoot);
      const malformedDeclaration = runCli(['workspace', 'verify-capability', '--input', malformedDeclarationPath]);
      const malformedDeclarationText = `${malformedDeclaration.stdout}\n${malformedDeclaration.stderr}`;
      const afterMalformedVerify = fingerprintTree(verifierTempRoot);
      assert(malformedDeclaration.status === 1, 'verify-capability malformed declaration exits one', malformedDeclarationText);
      assert(
        beforeMalformedVerify === afterMalformedVerify,
        'verify-capability malformed declaration request is read-only',
        malformedDeclarationText,
      );
      const malformedDeclarationOutput = JSON.parse(malformedDeclaration.stdout);
      assert(malformedDeclarationOutput.ok === false, 'verify-capability malformed declaration returns ok false', malformedDeclarationText);
      assert(
        malformedDeclarationOutput.errors.some((error) => error.code === 'REQUEST_INVALID' && error.path === '$.capabilities[0].outputs'),
        'verify-capability malformed declaration names REQUEST_INVALID',
        malformedDeclarationText,
      );
      assert(
        malformedDeclarationOutput.observations.length === 0,
        'verify-capability malformed declaration observations do not change ok',
        malformedDeclarationText,
      );

      function testVerifyCapabilityInputRejectsTomlDraftsAndIgnoresAmbientForgeState() {
        const isolationSentinels = [
          'BMAD_POISON_FORGE_TOML_SENTINEL',
          'BMAD_POISON_PACK_DRAFT_SENTINEL',
          'BMAD_POISON_CUSTOMIZATION_SENTINEL',
          'BMAD_POISON_CUSTOM_SURFACE_SENTINEL',
          'BMAD_POISON_GRAPHIFY_SENTINEL',
          'BMAD_POISON_DOT_GRAPHIFY_SENTINEL',
          'BMAD_POISON_CAPABILITY_FORGE_DB_SENTINEL',
          'BMAD_POISON_POSTGRES_URL_SENTINEL',
          'BMAD_POISON_GRAPHIFY_LIVE_SENTINEL',
          'BMAD_POISON_MALFORMED_JSON_SENTINEL',
          'BMAD_POISON_CODEX_CONFIG_SENTINEL',
          'BMAD_POISON_WORKSPACE_SESSION_SENTINEL',
          'BMAD_POISON_MCP_SENTINEL',
        ];
        const poisonedEnv = {
          CAPABILITY_FORGE_DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/BMAD_POISON_CAPABILITY_FORGE_DB_SENTINEL',
          POSTGRES_URL: 'postgres://user:pass@127.0.0.1:1/BMAD_POISON_POSTGRES_URL_SENTINEL',
          GRAPHIFY_LIVE_STATE: 'BMAD_POISON_GRAPHIFY_LIVE_SENTINEL',
        };

        function writeVerifierIsolationWorkspace(root, poisoned) {
          fs.mkdirSync(root, { recursive: true });
          const requestPath = path.join(root, 'valid-request.json');
          fs.writeFileSync(
            requestPath,
            `${JSON.stringify(
              {
                kind: 'bmad-workspace-capability-request',
                schemaVersion: 1,
                request: {
                  id: 'evidence.graph.repo-intake',
                  sessionType: 'normal',
                  group: 'evidence.graph',
                  provider: 'graphify',
                  interface: 'repo-intake',
                  writes: ['workspace-session/intake'],
                  outputs: ['graph.json'],
                },
                capabilities: [capability],
                observations: [
                  {
                    code: 'VERIFIER_ISOLATION_FIXTURE',
                    message: 'Verifier isolation fixture preserves declared-contract behavior.',
                    details: { reviewedAt: '2026-05-08' },
                  },
                ],
              },
              null,
              2,
            )}\n`,
          );

          if (!poisoned) {
            return {
              requestPath,
              customizationDraftPath: null,
              packDraftPath: null,
              malformedJsonPath: null,
            };
          }

          const forgeDir = path.join(root, '.capability-forge');
          const draftDir = path.join(forgeDir, 'drafts', 'poisoned-pack');
          const customDir = path.join(root, '_bmad', 'custom');
          const graphDir = path.join(root, 'graph');
          const dotGraphifyDir = path.join(root, '.graphify');
          const codexDir = path.join(root, '.codex');
          const mcpDir = path.join(root, 'mcp');
          const workspaceSessionDir = path.join(root, '_bmad-output', 'workspace-runtime', 'sessions', 'poison-session');
          fs.mkdirSync(draftDir, { recursive: true });
          fs.mkdirSync(customDir, { recursive: true });
          fs.mkdirSync(graphDir, { recursive: true });
          fs.mkdirSync(dotGraphifyDir, { recursive: true });
          fs.mkdirSync(codexDir, { recursive: true });
          fs.mkdirSync(mcpDir, { recursive: true });
          fs.mkdirSync(workspaceSessionDir, { recursive: true });

          fs.writeFileSync(
            path.join(forgeDir, 'forge.toml'),
            ['workspace.write_mode = "runtime"', 'poison = "BMAD_POISON_FORGE_TOML_SENTINEL"', '[malformed', ''].join('\n'),
          );

          const packDraftPath = path.join(draftDir, 'pack-draft.toml');
          fs.writeFileSync(packDraftPath, staticValidPackDraftToml());

          const customizationDraftPath = path.join(root, 'customization-draft.toml');
          fs.writeFileSync(
            customizationDraftPath,
            ['kind = "not-verifier-input"', 'poison = "BMAD_POISON_CUSTOMIZATION_SENTINEL"', '[broken', ''].join('\n'),
          );

          fs.writeFileSync(
            path.join(customDir, 'bmad-workspace.toml'),
            ['poison = "BMAD_POISON_CUSTOM_SURFACE_SENTINEL"', 'verify_capability = "must-not-read-custom"', '[broken', ''].join('\n'),
          );

          fs.writeFileSync(path.join(graphDir, 'poison.graph.json'), '{"poison":"BMAD_POISON_GRAPHIFY_SENTINEL"; "valid": false}\n');
          fs.writeFileSync(
            path.join(dotGraphifyDir, 'poison.graph.json'),
            '{"poison":"BMAD_POISON_DOT_GRAPHIFY_SENTINEL"; "valid": false}\n',
          );
          fs.writeFileSync(
            path.join(codexDir, 'config.toml'),
            ['[features]', 'goals = true', 'poison = "BMAD_POISON_CODEX_CONFIG_SENTINEL"', '[broken', ''].join('\n'),
          );
          fs.writeFileSync(path.join(mcpDir, 'state.json'), '{"poison":"BMAD_POISON_MCP_SENTINEL","tool":"context7",\n');
          fs.writeFileSync(
            path.join(workspaceSessionDir, 'instance.json'),
            '{"poison":"BMAD_POISON_WORKSPACE_SESSION_SENTINEL","sessionType":"normal"}\n',
          );

          const malformedJsonPath = path.join(root, 'malformed-request.json');
          fs.writeFileSync(malformedJsonPath, '{"poison":"BMAD_POISON_MALFORMED_JSON_SENTINEL",\n');

          return { requestPath, customizationDraftPath, packDraftPath, malformedJsonPath };
        }

        const cleanIsolationRoot = path.join(verifierTempRoot, 'isolation-clean');
        const poisonedIsolationRoot = path.join(verifierTempRoot, 'isolation-poisoned');
        const cleanIsolation = writeVerifierIsolationWorkspace(cleanIsolationRoot, false);
        const poisonedIsolation = writeVerifierIsolationWorkspace(poisonedIsolationRoot, true);

        const beforeCleanIsolation = fingerprintTree(cleanIsolationRoot);
        const cleanIsolationResult = runCli(['workspace', 'verify-capability', '--input', cleanIsolation.requestPath], {
          cwd: cleanIsolationRoot,
        });
        const afterCleanIsolation = fingerprintTree(cleanIsolationRoot);
        const cleanIsolationText = commandText(cleanIsolationResult);
        assert(cleanIsolationResult.status === 0, 'verify-capability clean isolation request exits zero', cleanIsolationText);
        assert(cleanIsolationResult.stderr.trim() === '', 'verify-capability clean isolation request has empty stderr', cleanIsolationText);
        const cleanIsolationOutput = parseCliStdoutJson(cleanIsolationResult, 'verify-capability clean isolation request');
        assert(cleanIsolationOutput?.ok === true, 'verify-capability clean isolation request returns ok true', cleanIsolationText);
        assert(
          beforeCleanIsolation === afterCleanIsolation,
          'verify-capability clean isolation request makes no filesystem writes',
          cleanIsolationText,
        );
        assertNoSentinelLeak(cleanIsolationResult, cleanIsolationOutput, isolationSentinels, 'verify-capability clean isolation request');

        const beforePoisonedIsolation = fingerprintTree(poisonedIsolationRoot);
        const poisonedIsolationResult = runCli(['workspace', 'verify-capability', '--input', poisonedIsolation.requestPath], {
          cwd: poisonedIsolationRoot,
          env: poisonedEnv,
        });
        const afterPoisonedIsolation = fingerprintTree(poisonedIsolationRoot);
        const poisonedIsolationText = commandText(poisonedIsolationResult);
        assert(poisonedIsolationResult.status === 0, 'verify-capability poisoned isolation request exits zero', poisonedIsolationText);
        assert(
          poisonedIsolationResult.stderr.trim() === '',
          'verify-capability poisoned isolation request has empty stderr',
          poisonedIsolationText,
        );
        const poisonedIsolationOutput = parseCliStdoutJson(poisonedIsolationResult, 'verify-capability poisoned isolation request');
        assert(poisonedIsolationOutput?.ok === true, 'verify-capability poisoned isolation request returns ok true', poisonedIsolationText);
        assert(
          JSON.stringify(cleanIsolationOutput) === JSON.stringify(poisonedIsolationOutput),
          'verify-capability poisoned isolation request matches clean normalized verdict',
          poisonedIsolationText,
        );
        assert(
          beforePoisonedIsolation === afterPoisonedIsolation,
          'verify-capability poisoned isolation request makes no filesystem writes',
          poisonedIsolationText,
        );
        assertNoSentinelLeak(
          poisonedIsolationResult,
          poisonedIsolationOutput,
          isolationSentinels,
          'verify-capability poisoned isolation request',
        );

        function assertVerifierInvalidInput(inputPath, label) {
          const beforeInvalidInput = fingerprintTree(poisonedIsolationRoot);
          const result = runCli(['workspace', 'verify-capability', '--input', inputPath], {
            cwd: poisonedIsolationRoot,
            env: poisonedEnv,
          });
          const afterInvalidInput = fingerprintTree(poisonedIsolationRoot);
          const text = commandText(result);
          assert(result.status === 1, `${label} exits one`, text);
          assert(result.stderr.trim() === '', `${label} has empty stderr`, text);
          const output = parseCliStdoutJson(result, label);
          assert(output?.ok === false, `${label} returns ok false`, text);
          assert(
            output?.errors?.some((error) => error.code === 'REQUEST_INVALID'),
            `${label} reports REQUEST_INVALID`,
            text,
          );
          assert(
            output?.errors?.every((error) => !String(error.message).includes('BMAD_POISON')),
            `${label} redacts invalid input parse excerpts`,
            text,
          );
          assert(Array.isArray(output?.observations) && output.observations.length === 0, `${label} has empty observations`, text);
          assert(beforeInvalidInput === afterInvalidInput, `${label} makes no filesystem writes`, text);
          assertNoSentinelLeak(result, output, isolationSentinels, label);
        }

        assertVerifierInvalidInput(poisonedIsolation.customizationDraftPath, 'verify-capability rejects customization-draft.toml input');
        assertVerifierInvalidInput(poisonedIsolation.packDraftPath, 'verify-capability rejects pack-draft.toml input');
        assertVerifierInvalidInput(poisonedIsolation.malformedJsonPath, 'verify-capability rejects malformed JSON input');
      }

      testVerifyCapabilityInputRejectsTomlDraftsAndIgnoresAmbientForgeState();
    } finally {
      fs.rmSync(verifierTempRoot, { recursive: true, force: true });
    }
  }

  section('Workspace Launch');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-cli-'));
  const baseRepo = createGitRepo(tempRoot, 'workspace-base');
  const targetRepo = createGitRepo(tempRoot, 'target-repo');
  const secondTargetRepo = createGitRepo(tempRoot, 'second-target-repo');
  addMinimalGraphArtifact(targetRepo);
  const goalPath = path.join(tempRoot, 'goal.md');
  const runtimeRoot = path.join(tempRoot, 'runtime');
  fs.writeFileSync(goalPath, 'Fix target repo bug.\n');
  const setupDocsDir = path.join(baseRepo.path, 'docs', 'workspace');
  fs.mkdirSync(setupDocsDir, { recursive: true });
  fs.writeFileSync(path.join(setupDocsDir, 'setup-zoom-out.md'), 'Zoom out map.\n');
  fs.writeFileSync(path.join(setupDocsDir, 'setup-grill-decisions.md'), 'Decision log.\n');
  fs.writeFileSync(path.join(setupDocsDir, 'setup-tdd-plan.md'), '# TDD Order\n');
  fs.writeFileSync(path.join(baseRepo.path, 'UBIQUITOUS_LANGUAGE.md'), '# Ubiquitous Language\n');
  addMinimalGraphArtifact(baseRepo);

  let launchOutput;
  let multiRepoOutput;
  let baseImprovementOutput;
  let sessionLaunchOutput;
  try {
    const launch = runCli(['workspace', 'launch', '--repo', targetRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchText = `${launch.stdout}\n${launch.stderr}`;

    assert(launch.status === 0, 'launch exits zero', launchText);
    launchOutput = JSON.parse(launch.stdout);
    assertSessionOutput(launchOutput, 'launch output');
    assert(fs.existsSync(launchOutput.sessionRoot), 'launch creates session root', launchText);
    assert(launchOutput.sessionRoot.includes(`${path.sep}sessions${path.sep}`), 'launch uses sessions runtime path', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'instance.json')), 'launch writes instance.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'repo-pack.json')), 'launch writes repo-pack.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'grants.json')), 'launch writes grants.json', launchText);

    const repoPack = readJson(path.join(launchOutput.sessionRoot, 'repo-pack.json'));
    assert(repoPack.repos.length === 1, 'repo pack records one repo', JSON.stringify(repoPack, null, 2));
    assert(repoPack.repos[0].head === targetRepo.head, 'repo pack records target HEAD', JSON.stringify(repoPack, null, 2));
    assert(fs.existsSync(repoPack.repos[0].worktreePath), 'launch creates repo worktree', JSON.stringify(repoPack, null, 2));

    const grants = readJson(path.join(launchOutput.sessionRoot, 'grants.json'));
    assert(grants.baseMutationGrant === false, 'normal launch has no Base Mutation Grant', JSON.stringify(grants, null, 2));

    const baseStatus = git(['status', '--short'], baseRepo.path);
    assert(baseStatus === '?? UBIQUITOUS_LANGUAGE.md\n?? docs/', 'launch does not add extra Workspace Base changes', baseStatus);

    section('Workspace Status');

    const missingStatus = runCli(['workspace', 'status', 'missing-session', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingStatusText = `${missingStatus.stdout}\n${missingStatus.stderr}`;
    assert(missingStatus.status !== 0, 'status for missing session exits nonzero', missingStatusText);
    assert(missingStatusText.includes('SESSION_NOT_FOUND'), 'missing status names SESSION_NOT_FOUND', missingStatusText);
    assert(missingStatusText.includes('Next manual action:'), 'missing status includes next manual action hint', missingStatusText);

    const missingEvidence = runCli(['workspace', 'evidence', 'missing-session', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingEvidenceText = `${missingEvidence.stdout}\n${missingEvidence.stderr}`;
    assert(missingEvidence.status !== 0, 'evidence for missing session exits nonzero', missingEvidenceText);
    assert(missingEvidenceText.includes('SESSION_NOT_FOUND'), 'missing evidence names SESSION_NOT_FOUND', missingEvidenceText);
    assert(missingEvidenceText.includes('Next manual action:'), 'missing evidence includes next manual action hint', missingEvidenceText);

    const beforeLaunchStatus = fingerprintTree(launchOutput.sessionRoot);
    const launchStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchStatusText = `${launchStatus.stdout}\n${launchStatus.stderr}`;
    const afterLaunchStatus = fingerprintTree(launchOutput.sessionRoot);
    assert(launchStatus.status === 0, 'status after launch exits zero', launchStatusText);
    assert(beforeLaunchStatus === afterLaunchStatus, 'status after launch is read-only', launchStatusText);
    const launchStatusOutput = JSON.parse(launchStatus.stdout);
    assert(launchStatusOutput.status === 'blocked', 'status after launch reports blocked', launchStatusText);
    assert(
      launchStatusOutput.checks.some((item) => item.code === 'MISSING_INTAKE'),
      'status after launch reports missing intake',
      launchStatusText,
    );
    assert(
      launchStatusOutput.checks.some((item) => item.code === 'MISSING_INTAKE' && item.nextManualAction.includes('bmad workspace intake')),
      'status after launch includes next manual action',
      launchStatusText,
    );

    section('Workspace Evidence');

    const launchEvidenceBefore = fingerprintTree(launchOutput.sessionRoot);
    const launchEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchEvidenceAfter = fingerprintTree(launchOutput.sessionRoot);
    const launchEvidenceText = `${launchEvidence.stdout}\n${launchEvidence.stderr}`;
    assert(launchEvidence.status === 0, 'evidence after launch exits zero', launchEvidenceText);
    assert(launchEvidenceBefore === launchEvidenceAfter, 'evidence after launch is read-only', launchEvidenceText);
    const launchEvidenceOutput = JSON.parse(launchEvidence.stdout);
    assert(launchEvidenceOutput.schemaVersion === 1, 'evidence output records schemaVersion 1', launchEvidenceText);
    assert(launchEvidenceOutput.state === 'invalid', 'evidence after launch reports invalid state', launchEvidenceText);
    assert(
      launchEvidenceOutput.artifacts.some((item) => item.kind === 'instance' && item.validationState === 'valid' && item.sha256),
      'evidence records launch artifact checksum',
      launchEvidenceText,
    );
    assert(
      launchEvidenceOutput.artifacts.some((item) => item.kind === 'work-packet' && item.validationState === 'missing'),
      'evidence records missing packet artifact',
      launchEvidenceText,
    );
    assert(
      launchEvidenceOutput.checks.some((item) => item.code === 'MISSING_INTAKE' && item.nextManualAction.includes('bmad workspace intake')),
      'evidence records next manual action',
      launchEvidenceText,
    );

    section('Workspace List');

    const emptyRuntimeRoot = path.join(tempRoot, 'empty-runtime');
    const emptyList = runCli(['workspace', 'list', '--runtime-root', emptyRuntimeRoot], {
      cwd: baseRepo.path,
    });
    const emptyListText = `${emptyList.stdout}\n${emptyList.stderr}`;
    assert(emptyList.status === 0, 'list empty runtime exits zero', emptyListText);
    assert(emptyList.stderr === '', 'list empty runtime has no stderr noise', emptyListText);
    const emptyListOutput = JSON.parse(emptyList.stdout);
    assert(emptyListOutput.schemaVersion === 1, 'list output records schemaVersion 1', emptyListText);
    assert(
      Array.isArray(emptyListOutput.sessions) && emptyListOutput.sessions.length === 0,
      'list empty runtime has no sessions',
      emptyListText,
    );

    section('Workspace Archive Verification Failures');

    const missingArchive = runCli(['workspace', 'verify-archive', path.join(tempRoot, 'missing-archive')], {
      cwd: baseRepo.path,
    });
    const missingArchiveText = `${missingArchive.stdout}\n${missingArchive.stderr}`;
    assert(missingArchive.status !== 0, 'verify-archive missing dir exits nonzero', missingArchiveText);
    assert(missingArchiveText.includes('ARCHIVE_NOT_FOUND'), 'verify-archive missing dir names ARCHIVE_NOT_FOUND', missingArchiveText);

    const malformedArchiveRoot = path.join(tempRoot, 'malformed-archive');
    fs.mkdirSync(malformedArchiveRoot, { recursive: true });
    const malformedArchive = runCli(['workspace', 'verify-archive', malformedArchiveRoot], {
      cwd: baseRepo.path,
    });
    const malformedArchiveText = `${malformedArchive.stdout}\n${malformedArchive.stderr}`;
    assert(malformedArchive.status !== 0, 'verify-archive without manifest exits nonzero', malformedArchiveText);
    assert(
      malformedArchiveText.includes('ARCHIVE_MANIFEST_MISSING'),
      'verify-archive missing manifest names ARCHIVE_MANIFEST_MISSING',
      malformedArchiveText,
    );

    fs.writeFileSync(path.join(malformedArchiveRoot, 'manifest.json'), '{not-json\n');
    const invalidManifest = runCli(['workspace', 'verify-archive', malformedArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidManifestText = `${invalidManifest.stdout}\n${invalidManifest.stderr}`;
    assert(invalidManifest.status !== 0, 'verify-archive invalid manifest exits nonzero', invalidManifestText);
    assert(
      invalidManifestText.includes('ARCHIVE_MANIFEST_INVALID'),
      'verify-archive invalid manifest names ARCHIVE_MANIFEST_INVALID',
      invalidManifestText,
    );

    section('Workspace Archive Missing Session');

    const missingSessionArchiveRoot = path.join(tempRoot, 'missing-session-archive');
    const missingSessionArchive = runCli(
      ['workspace', 'archive', 'missing-session', '--runtime-root', runtimeRoot, '--output', missingSessionArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSessionArchiveText = `${missingSessionArchive.stdout}\n${missingSessionArchive.stderr}`;
    assert(missingSessionArchive.status !== 0, 'archive missing session exits nonzero', missingSessionArchiveText);
    assert(
      missingSessionArchiveText.includes('SESSION_NOT_FOUND'),
      'archive missing session names SESSION_NOT_FOUND',
      missingSessionArchiveText,
    );
    assert(!fs.existsSync(missingSessionArchiveRoot), 'archive missing session writes no output dir', missingSessionArchiveText);

    const brokenSessionRoot = path.join(runtimeRoot, 'sessions', 'broken-session');
    fs.mkdirSync(brokenSessionRoot, { recursive: true });
    const symlinkSessionRoot = path.join(runtimeRoot, 'sessions', 'session-symlink');
    fs.symlinkSync(launchOutput.sessionRoot, symlinkSessionRoot);

    const beforeList = fingerprintTree(runtimeRoot);
    const sessionList = runCli(['workspace', 'list', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const sessionListText = `${sessionList.stdout}\n${sessionList.stderr}`;
    const afterList = fingerprintTree(runtimeRoot);
    assert(sessionList.status === 0, 'list runtime exits zero', sessionListText);
    assert(beforeList === afterList, 'list is read-only', sessionListText);
    const sessionListOutput = JSON.parse(sessionList.stdout);
    assert(sessionListOutput.runtimeRoot === runtimeRoot, 'list records runtime root', sessionListText);
    const listedIds = sessionListOutput.sessions.map((session) => session.sessionId);
    assert(JSON.stringify(listedIds) === JSON.stringify([...listedIds].sort()), 'list sorts sessions by sessionId', sessionListText);
    const listedLaunch = sessionListOutput.sessions.find((session) => session.sessionId === launchOutput.sessionId);
    assert(listedLaunch?.valid === true, 'list reports launched session valid', sessionListText);
    assert(listedLaunch?.sessionType === 'normal', 'list reports launched session type', sessionListText);
    assert(listedLaunch?.artifacts.instance.present === true, 'list reports instance artifact present', sessionListText);
    assert(listedLaunch?.artifacts.packet.present === false, 'list reports missing packet artifact', sessionListText);
    const listedBroken = sessionListOutput.sessions.find((session) => session.sessionId === 'broken-session');
    assert(listedBroken?.valid === false, 'list reports broken session invalid', sessionListText);
    assert(
      listedBroken?.checks.some((item) => item.code === 'SESSION_INVALID'),
      'broken session list row names SESSION_INVALID',
      sessionListText,
    );
    const listedSymlink = sessionListOutput.sessions.find((session) => session.sessionId === 'session-symlink');
    assert(listedSymlink?.valid === false, 'list does not follow symlink session', sessionListText);
    assert(
      listedSymlink?.checks.some((item) => item.code === 'SESSION_INVALID'),
      'symlink session list row names SESSION_INVALID',
      sessionListText,
    );

    section('Workspace Session Id');

    const sessionLaunch = runCli(
      [
        'workspace',
        'launch',
        '--repo',
        targetRepo.path,
        '--goal',
        goalPath,
        '--runtime-root',
        runtimeRoot,
        '--session-id',
        'session-alias-only',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const sessionLaunchText = `${sessionLaunch.stdout}\n${sessionLaunch.stderr}`;
    assert(sessionLaunch.status === 0, 'launch accepts --session-id', sessionLaunchText);
    sessionLaunchOutput = JSON.parse(sessionLaunch.stdout);
    assert(sessionLaunchOutput.sessionId === 'session-alias-only', '--session-id sets sessionId', sessionLaunchText);
    assertSessionOutput(sessionLaunchOutput, '--session-id launch output');

    fs.mkdirSync(path.join(sessionLaunchOutput.sessionRoot, 'packets'), { recursive: true });
    fs.writeFileSync(path.join(sessionLaunchOutput.sessionRoot, 'packets', 'bmad-work-packet.json'), '{not-json\n');
    const malformedPacketStatus = runCli(['workspace', 'status', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const malformedPacketStatusText = `${malformedPacketStatus.stdout}\n${malformedPacketStatus.stderr}`;
    assert(malformedPacketStatus.status === 0, 'status with malformed packet exits zero', malformedPacketStatusText);
    const malformedPacketStatusOutput = JSON.parse(malformedPacketStatus.stdout);
    assert(malformedPacketStatusOutput.status === 'invalid', 'status with malformed packet reports invalid', malformedPacketStatusText);
    assert(
      malformedPacketStatusOutput.checks.some((item) => item.code === 'WORK_PACKET_INVALID_JSON'),
      'status with malformed packet names WORK_PACKET_INVALID_JSON',
      malformedPacketStatusText,
    );

    const invalidHandoff = runCli(['workspace', 'handoff', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidHandoffText = `${invalidHandoff.stdout}\n${invalidHandoff.stderr}`;
    assert(invalidHandoff.status !== 0, 'handoff for invalid session exits nonzero', invalidHandoffText);
    assert(invalidHandoff.stdout === '', 'invalid handoff emits no partial Markdown', invalidHandoffText);
    assert(invalidHandoffText.includes('SESSION_INVALID'), 'invalid handoff names SESSION_INVALID', invalidHandoffText);

    const invalidArchiveRoot = path.join(tempRoot, 'invalid-session-archive');
    const invalidArchive = runCli(
      ['workspace', 'archive', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', invalidArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidArchiveText = `${invalidArchive.stdout}\n${invalidArchive.stderr}`;
    assert(invalidArchive.status !== 0, 'archive invalid session exits nonzero', invalidArchiveText);
    assert(invalidArchiveText.includes('SESSION_INVALID'), 'archive invalid session names SESSION_INVALID', invalidArchiveText);
    assert(!fs.existsSync(invalidArchiveRoot), 'archive invalid session writes no output dir', invalidArchiveText);

    const missingHandoff = runCli(['workspace', 'handoff', 'missing-session', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingHandoffText = `${missingHandoff.stdout}\n${missingHandoff.stderr}`;
    assert(missingHandoff.status !== 0, 'handoff for missing session exits nonzero', missingHandoffText);
    assert(missingHandoff.stdout === '', 'missing handoff emits no partial Markdown', missingHandoffText);
    assert(missingHandoffText.includes('SESSION_NOT_FOUND'), 'missing handoff names SESSION_NOT_FOUND', missingHandoffText);

    section('Workspace Multi-Repo Launch');

    const multiLaunch = runCli(
      [
        'workspace',
        'launch',
        '--repo',
        targetRepo.path,
        '--repo',
        secondTargetRepo.path,
        '--goal',
        goalPath,
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const multiLaunchText = `${multiLaunch.stdout}\n${multiLaunch.stderr}`;
    assert(multiLaunch.status === 0, 'multi-repo launch exits zero', multiLaunchText);
    multiRepoOutput = JSON.parse(multiLaunch.stdout);
    assertSessionOutput(multiRepoOutput, 'multi-repo launch output');
    const multiRepoPack = readJson(multiRepoOutput.repoPackPath);
    assert(multiRepoPack.repos.length === 2, 'multi-repo launch records two repos', JSON.stringify(multiRepoPack, null, 2));
    assert(
      multiRepoPack.repos[0].head === targetRepo.head,
      'multi-repo launch records first repo HEAD',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      multiRepoPack.repos[1].head === secondTargetRepo.head,
      'multi-repo launch records second repo HEAD',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      fs.existsSync(multiRepoPack.repos[0].worktreePath),
      'multi-repo launch creates first worktree',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      fs.existsSync(multiRepoPack.repos[1].worktreePath),
      'multi-repo launch creates second worktree',
      JSON.stringify(multiRepoPack, null, 2),
    );
    const multiIntake = runCli(['workspace', 'intake', multiRepoOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const multiIntakeText = `${multiIntake.stdout}\n${multiIntake.stderr}`;
    assert(multiIntake.status === 0, 'multi-repo intake exits zero', multiIntakeText);
    const multiIntakeOutput = JSON.parse(multiIntake.stdout);
    const multiRepoIntake = readJson(multiIntakeOutput.repoIntakePath);
    assert(
      multiRepoIntake.graphEvidenceState === 'warning',
      'multi-repo intake warns when one repo lacks graph evidence',
      JSON.stringify(multiRepoIntake, null, 2),
    );
    const multiGraphEvidence = readJson(path.join(multiRepoOutput.sessionRoot, 'intake', 'graph.json'));
    assert(
      multiGraphEvidence.summary.state === 'warning',
      'multi-repo graph evidence rolls partial missing evidence up to warning',
      JSON.stringify(multiGraphEvidence, null, 2),
    );
    assert(
      multiGraphEvidence.repos.some((repo) => repo.state === 'valid') && multiGraphEvidence.repos.some((repo) => repo.state === 'missing'),
      'multi-repo graph evidence records valid and missing repo states',
      JSON.stringify(multiGraphEvidence, null, 2),
    );

    section('Workspace Grant Guard');

    const guardRepoPack = readJson(launchOutput.repoPackPath);
    const targetWritePath = path.join(guardRepoPack.repos[0].worktreePath, 'README.md');
    const allowedWrite = runCli(
      ['workspace', 'authorize', launchOutput.sessionId, '--write-path', targetWritePath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const allowedWriteText = `${allowedWrite.stdout}\n${allowedWrite.stderr}`;
    assert(allowedWrite.status === 0, 'Grant Guard allows target worktree write', allowedWriteText);
    const allowedWriteOutput = JSON.parse(allowedWrite.stdout);
    assertSessionOutput(allowedWriteOutput, 'Grant Guard allowed output');
    assert(allowedWriteOutput.allowed === true, 'Grant Guard reports allowed target write', allowedWriteText);

    const symlinkEscapeRoot = path.join(tempRoot, 'grant-symlink-escape');
    fs.mkdirSync(symlinkEscapeRoot, { recursive: true });
    const symlinkInsideWorktree = path.join(guardRepoPack.repos[0].worktreePath, 'escape-link');
    fs.symlinkSync(symlinkEscapeRoot, symlinkInsideWorktree, 'dir');
    const symlinkDeniedWrite = runCli(
      [
        'workspace',
        'authorize',
        launchOutput.sessionId,
        '--write-path',
        path.join(symlinkInsideWorktree, 'outside.txt'),
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const symlinkDeniedWriteText = `${symlinkDeniedWrite.stdout}\n${symlinkDeniedWrite.stderr}`;
    assert(symlinkDeniedWrite.status !== 0, 'Grant Guard denies symlink escape from target worktree', symlinkDeniedWriteText);
    assert(
      symlinkDeniedWriteText.includes('write-outside-session-boundary'),
      'Grant Guard symlink escape names boundary denial',
      symlinkDeniedWriteText,
    );
    fs.rmSync(symlinkInsideWorktree);
    fs.rmSync(path.join(launchOutput.sessionRoot, 'violations'), { recursive: true, force: true });

    const baseWritePath = path.join(baseRepo.path, 'BMAD.md');
    const deniedWrite = runCli(
      ['workspace', 'authorize', launchOutput.sessionId, '--write-path', baseWritePath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const deniedWriteText = `${deniedWrite.stdout}\n${deniedWrite.stderr}`;
    assert(deniedWrite.status !== 0, 'Grant Guard denies base write without grant', deniedWriteText);
    assert(deniedWriteText.includes('base-write-denied'), 'Grant Guard denial names base-write-denied', deniedWriteText);
    const violationsDir = path.join(launchOutput.sessionRoot, 'violations');
    const violationFiles = fs.existsSync(violationsDir) ? fs.readdirSync(violationsDir).filter((file) => file.endsWith('.json')) : [];
    assert(violationFiles.length === 1, 'Grant Guard records one violation artifact', JSON.stringify(violationFiles, null, 2));
    const violation = readJson(path.join(violationsDir, violationFiles[0]));
    assert(violation.reason === 'base-write-denied', 'Grant Guard violation records denial reason', JSON.stringify(violation, null, 2));

    const baseImprovementLaunch = runCli(
      ['workspace', 'launch', '--repo', baseRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot, '--base-improvement'],
      {
        cwd: baseRepo.path,
      },
    );
    const baseImprovementText = `${baseImprovementLaunch.stdout}\n${baseImprovementLaunch.stderr}`;
    assert(baseImprovementLaunch.status !== 0, 'Base Improvement launch without grant exits nonzero', baseImprovementText);
    assert(
      baseImprovementText.includes('base-improvement-requires-base-mutation-grant'),
      'Base Improvement launch without grant names missing grant',
      baseImprovementText,
    );

    const baseGrantPath = path.join(tempRoot, 'base-mutation-grant.json');
    fs.writeFileSync(
      baseGrantPath,
      `${JSON.stringify(
        {
          schemaVersion: '0.1',
          baseMutationGrant: true,
          allowedBasePaths: ['docs/workspace'],
          bmadArtifactRef: 'docs/workspace/base-improvement-backlog.md',
        },
        null,
        2,
      )}\n`,
    );

    const grantedBaseLaunch = runCli(
      ['workspace', 'launch', '--goal', goalPath, '--runtime-root', runtimeRoot, '--base-improvement', '--grant', baseGrantPath],
      {
        cwd: baseRepo.path,
      },
    );
    const grantedBaseText = `${grantedBaseLaunch.stdout}\n${grantedBaseLaunch.stderr}`;
    assert(grantedBaseLaunch.status === 0, 'Base Improvement launch with grant exits zero', grantedBaseText);
    baseImprovementOutput = JSON.parse(grantedBaseLaunch.stdout);
    assertSessionOutput(baseImprovementOutput, 'Base Improvement launch output');
    const baseInstance = readJson(path.join(baseImprovementOutput.sessionRoot, 'instance.json'));
    assert(
      baseInstance.sessionType === 'base-improvement',
      'Base Improvement instance records session type',
      JSON.stringify(baseInstance, null, 2),
    );
    assert(
      fs.existsSync(path.join(baseImprovementOutput.sessionRoot, 'promotion-policy.json')),
      'Base Improvement writes promotion policy',
    );
    const promotionPolicy = readJson(path.join(baseImprovementOutput.sessionRoot, 'promotion-policy.json'));
    assert(promotionPolicy.explicitOnly === true, 'Promotion policy is explicit-only', JSON.stringify(promotionPolicy, null, 2));

    const baseRepoPack = readJson(baseImprovementOutput.repoPackPath);
    const baseWorktreePath = baseRepoPack.repos[0].worktreePath;
    assert(fs.existsSync(baseWorktreePath), 'Base Improvement creates BMAD Workspace worktree', JSON.stringify(baseRepoPack, null, 2));
    assert(
      git(['branch', '--show-current'], baseWorktreePath).startsWith('codex/workspace/'),
      'Base Improvement uses dedicated codex branch',
      JSON.stringify(baseRepoPack, null, 2),
    );

    const grantedBaseWrite = runCli(
      [
        'workspace',
        'authorize',
        baseImprovementOutput.sessionId,
        '--write-path',
        path.join(baseWorktreePath, 'docs', 'workspace', 's11.md'),
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const grantedBaseWriteText = `${grantedBaseWrite.stdout}\n${grantedBaseWrite.stderr}`;
    assert(grantedBaseWrite.status === 0, 'Grant Guard allows granted base path write', grantedBaseWriteText);
    const grantedBaseWriteOutput = JSON.parse(grantedBaseWrite.stdout);
    assertSessionOutput(grantedBaseWriteOutput, 'Grant Guard base output');
    assert(grantedBaseWriteOutput.scope === 'workspace-base', 'Grant Guard reports workspace-base scope', grantedBaseWriteText);

    const blockedBaseStatus = runCli(['workspace', 'status', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const blockedBaseStatusText = `${blockedBaseStatus.stdout}\n${blockedBaseStatus.stderr}`;
    assert(blockedBaseStatus.status === 0, 'Base Improvement status exits zero while blocked', blockedBaseStatusText);
    const blockedBaseStatusOutput = JSON.parse(blockedBaseStatus.stdout);
    assert(
      blockedBaseStatusOutput.baseImprovementReadiness.state === 'blocked',
      'Base Improvement status reports blocked readiness',
      blockedBaseStatusText,
    );

    const baseIntake = runCli(['workspace', 'intake', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const baseIntakeText = `${baseIntake.stdout}\n${baseIntake.stderr}`;
    assert(baseIntake.status === 0, 'Base Improvement intake exits zero', baseIntakeText);

    const basePacket = runCli(
      [
        'workspace',
        'packet',
        baseImprovementOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const basePacketText = `${basePacket.stdout}\n${basePacket.stderr}`;
    assert(basePacket.status === 0, 'Base Improvement packet exits zero', basePacketText);
    const basePacketOutput = JSON.parse(basePacket.stdout);
    const baseExecutorContract = readJson(basePacketOutput.executorContractPath);
    assert(
      baseExecutorContract.allowedWriteRoots.includes(path.join(fs.realpathSync.native(baseWorktreePath), 'docs', 'workspace')),
      'Base Improvement executor contract scopes allowed roots to granted base paths',
      JSON.stringify(baseExecutorContract, null, 2),
    );

    const baseReview = runCli(['workspace', 'review', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const baseReviewText = `${baseReview.stdout}\n${baseReview.stderr}`;
    assert(baseReview.status === 0, 'Base Improvement review exits zero', baseReviewText);

    const readyBaseStatus = runCli(['workspace', 'status', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const readyBaseStatusText = `${readyBaseStatus.stdout}\n${readyBaseStatus.stderr}`;
    assert(readyBaseStatus.status === 0, 'Base Improvement ready status exits zero', readyBaseStatusText);
    const readyBaseStatusOutput = JSON.parse(readyBaseStatus.stdout);
    assert(
      readyBaseStatusOutput.baseImprovementReadiness.state === 'ready-for-human-review',
      'Base Improvement status reports ready for human review',
      readyBaseStatusText,
    );

    const readyBaseHandoff = runCli(['workspace', 'handoff', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const readyBaseHandoffText = `${readyBaseHandoff.stdout}\n${readyBaseHandoff.stderr}`;
    assert(readyBaseHandoff.status === 0, 'Base Improvement handoff exits zero', readyBaseHandoffText);
    assert(readyBaseHandoff.stdout.includes('ready-for-human-review'), 'Base Improvement handoff reports readiness', readyBaseHandoffText);
    assert(readyBaseHandoff.stdout.includes('Base Improvement'), 'Base Improvement handoff names session type', readyBaseHandoffText);
    assert(!readyBaseHandoff.stdout.includes('promote'), 'Base Improvement handoff avoids promotion wording', readyBaseHandoffText);

    const baseArchiveRoot = path.join(tempRoot, 'base-improvement-archive');
    const baseArchive = runCli(
      ['workspace', 'archive', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot, '--output', baseArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const baseArchiveText = `${baseArchive.stdout}\n${baseArchive.stderr}`;
    assert(baseArchive.status === 0, 'Base Improvement archive exits zero', baseArchiveText);
    const baseCloseout = fs.readFileSync(path.join(baseArchiveRoot, 'closeout.md'), 'utf8');
    assert(baseCloseout.includes('ready-for-human-review'), 'Base Improvement archive closeout records readiness', baseCloseout);
    assert(!baseCloseout.includes('promote'), 'Base Improvement archive closeout avoids promotion wording', baseCloseout);

    const deniedBaseWrite = runCli(
      [
        'workspace',
        'authorize',
        baseImprovementOutput.sessionId,
        '--write-path',
        path.join(baseWorktreePath, 'README.md'),
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const deniedBaseWriteText = `${deniedBaseWrite.stdout}\n${deniedBaseWrite.stderr}`;
    assert(deniedBaseWrite.status !== 0, 'Grant Guard denies out-of-grant base path write', deniedBaseWriteText);
    assert(deniedBaseWriteText.includes('base-path-not-granted'), 'Out-of-grant denial names base-path-not-granted', deniedBaseWriteText);

    section('Workspace Packet Freshness');

    const missingPacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingPacketText = `${missingPacket.stdout}\n${missingPacket.stderr}`;
    assert(missingPacket.status !== 0, 'packet without intake exits nonzero', missingPacketText);
    assert(missingPacketText.includes('missing-intake'), 'packet without intake names missing-intake', missingPacketText);

    section('Workspace Intake');

    const targetBeforeIntake = fingerprintTree(targetRepo.path);
    const baseBeforeIntake = fingerprintTree(baseRepo.path);
    const intake = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const intakeText = `${intake.stdout}\n${intake.stderr}`;

    assert(intake.status === 0, 'intake exits zero', intakeText);
    assert(targetBeforeIntake === fingerprintTree(targetRepo.path), 'intake does not mutate target repo', intakeText);
    assert(baseBeforeIntake === fingerprintTree(baseRepo.path), 'intake does not mutate Workspace Base', intakeText);
    const intakeOutput = JSON.parse(intake.stdout);
    assertSessionOutput(intakeOutput, 'intake output');
    assert(fs.existsSync(intakeOutput.repoIntakePath), 'intake writes repo-intake.json', intakeText);
    assert(fs.existsSync(intakeOutput.provenancePath), 'intake writes provenance.json', intakeText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'intake', 'graph.json')), 'intake writes graph evidence', intakeText);

    const repoIntake = readJson(intakeOutput.repoIntakePath);
    assert(repoIntake.sessionId === launchOutput.sessionId, 'repo intake records session id', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.repos[0].head === targetRepo.head, 'repo intake records target repo HEAD', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.scanner.mode === 'code-only', 'repo intake records code-only scanner mode', JSON.stringify(repoIntake, null, 2));
    assert(
      repoIntake.graphEvidenceRef === 'intake/graph.json',
      'repo intake records graph evidence ref',
      JSON.stringify(repoIntake, null, 2),
    );
    assert(
      repoIntake.graphEvidenceState === 'valid',
      'repo intake records valid graph evidence state',
      JSON.stringify(repoIntake, null, 2),
    );

    const graphEvidence = readJson(path.join(launchOutput.sessionRoot, 'intake', 'graph.json'));
    assert(graphEvidence.kind === 'bmad-workspace-graph-evidence', 'graph evidence records kind', JSON.stringify(graphEvidence, null, 2));
    assert(graphEvidence.schemaVersion === 1, 'graph evidence records schema version', JSON.stringify(graphEvidence, null, 2));
    assert(graphEvidence.sessionId === launchOutput.sessionId, 'graph evidence records session id', JSON.stringify(graphEvidence, null, 2));
    assert(graphEvidence.summary.state === 'valid', 'graph evidence summary records valid state', JSON.stringify(graphEvidence, null, 2));
    assert(graphEvidence.summary.artifactCount === 1, 'graph evidence summary counts artifacts', JSON.stringify(graphEvidence, null, 2));
    const graphArtifact = graphEvidence.repos[0].artifacts[0];
    assert(
      graphArtifact.repoRelativePath === 'graph/repository-knowledge.graph.json',
      'graph evidence records repo-relative path',
      JSON.stringify(graphEvidence, null, 2),
    );
    assert(
      graphArtifact.sha256 === sha256File(path.join(targetRepo.path, 'graph', 'repository-knowledge.graph.json')),
      'graph evidence records sha256',
      JSON.stringify(graphEvidence, null, 2),
    );
    assert(graphArtifact.validationState === 'valid', 'graph evidence records validation state', JSON.stringify(graphEvidence, null, 2));
    assert(graphArtifact.nodeCount === 2, 'graph evidence records node count', JSON.stringify(graphEvidence, null, 2));
    assert(graphArtifact.edgeCount === 1, 'graph evidence records edge count', JSON.stringify(graphEvidence, null, 2));
    assert(
      graphArtifact.sliceIds.includes('repository-knowledge'),
      'graph evidence records slice ids',
      JSON.stringify(graphEvidence, null, 2),
    );
    assert(graphArtifact.namespaces.includes('test'), 'graph evidence records namespaces', JSON.stringify(graphEvidence, null, 2));
    assert(
      Array.isArray(graphArtifact.sourcePathMissing),
      'graph evidence records missing source list',
      JSON.stringify(graphEvidence, null, 2),
    );

    const provenance = readJson(intakeOutput.provenancePath);
    assert(provenance.sessionId === launchOutput.sessionId, 'provenance records session id', JSON.stringify(provenance, null, 2));
    assert(provenance.scanner.id === 'workspace.git-intake', 'provenance records scanner id', JSON.stringify(provenance, null, 2));
    assert(
      provenance.graphEvidenceRef === 'intake/graph.json',
      'provenance records graph evidence ref',
      JSON.stringify(provenance, null, 2),
    );
    assert(provenance.graphInputs.length === 1, 'provenance records graph input', JSON.stringify(provenance, null, 2));
    assert(
      provenance.graphInputs[0].repoRelativePath === 'graph/repository-knowledge.graph.json',
      'provenance records graph input path',
      JSON.stringify(provenance, null, 2),
    );
    assert(
      provenance.graphInputs[0].validationState === 'valid',
      'provenance records graph validation state',
      JSON.stringify(provenance, null, 2),
    );

    fs.appendFileSync(path.join(targetRepo.path, 'README.md'), 'More detail.\n');
    git(['add', 'README.md'], targetRepo.path);
    git(['commit', '-m', 'update target repo'], targetRepo.path);
    const newTargetHead = git(['rev-parse', 'HEAD'], targetRepo.path);

    const stalePacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const stalePacketText = `${stalePacket.stdout}\n${stalePacket.stderr}`;
    assert(stalePacket.status !== 0, 'packet with stale intake exits nonzero', stalePacketText);
    assert(stalePacketText.includes('stale-intake'), 'packet with stale intake names stale-intake', stalePacketText);

    const staleStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const staleStatusText = `${staleStatus.stdout}\n${staleStatus.stderr}`;
    assert(staleStatus.status === 0, 'status with stale intake exits zero', staleStatusText);
    const staleStatusOutput = JSON.parse(staleStatus.stdout);
    assert(staleStatusOutput.status === 'stale', 'status with stale intake reports stale', staleStatusText);
    assert(staleStatusOutput.intake.graphEvidenceRef === 'intake/graph.json', 'status reports graph evidence ref', staleStatusText);
    assert(staleStatusOutput.intake.graphEvidenceState === 'valid', 'status reports graph evidence state', staleStatusText);
    assert(staleStatusOutput.artifacts.graphEvidence.present === true, 'status reports graph evidence artifact', staleStatusText);
    assert(
      staleStatusOutput.checks.some((item) => item.code === 'STALE_INTAKE'),
      'status with stale intake names STALE_INTAKE',
      staleStatusText,
    );

    const reIntake = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reIntakeText = `${reIntake.stdout}\n${reIntake.stderr}`;
    assert(reIntake.status === 0, 're-intake exits zero', reIntakeText);
    const reIntakeOutput = JSON.parse(reIntake.stdout);
    assertSessionOutput(reIntakeOutput, 're-intake output');
    const updatedRepoIntake = readJson(reIntakeOutput.repoIntakePath);
    assert(
      updatedRepoIntake.repos[0].head === newTargetHead,
      're-intake records new target HEAD',
      JSON.stringify(updatedRepoIntake, null, 2),
    );

    const missingSetupPacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingSetupPacketText = `${missingSetupPacket.stdout}\n${missingSetupPacket.stderr}`;
    assert(missingSetupPacket.status !== 0, 'packet without setup exits nonzero', missingSetupPacketText);
    assert(
      missingSetupPacketText.includes('missing-session-setup'),
      'packet without setup names missing-session-setup',
      missingSetupPacketText,
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet without setup does not write partial packet',
      missingSetupPacketText,
    );

    const missingSetupRefPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/missing-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSetupRefText = `${missingSetupRefPacket.stdout}\n${missingSetupRefPacket.stderr}`;
    assert(missingSetupRefPacket.status !== 0, 'packet rejects missing local setup ref', missingSetupRefText);
    assert(missingSetupRefText.includes('SETUP_REF_MISSING'), 'missing setup ref names SETUP_REF_MISSING', missingSetupRefText);
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with missing setup ref does not write partial packet',
      missingSetupRefText,
    );

    const invalidWorkflowPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-agent-dev',
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidWorkflowPacketText = `${invalidWorkflowPacket.stdout}\n${invalidWorkflowPacket.stderr}`;
    assert(invalidWorkflowPacket.status !== 0, 'packet rejects non-routeable workflow override', invalidWorkflowPacketText);
    assert(
      invalidWorkflowPacketText.includes('ROUTE_WORKFLOW_UNKNOWN'),
      'invalid workflow override names ROUTE_WORKFLOW_UNKNOWN',
      invalidWorkflowPacketText,
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with invalid workflow override does not write partial packet',
      invalidWorkflowPacketText,
    );

    const completePacketArgs = [
      'workspace',
      'packet',
      launchOutput.sessionId,
      '--runtime-root',
      runtimeRoot,
      '--zoom-out-ref',
      'docs/workspace/setup-zoom-out.md',
      '--ubiquitous-language-ref',
      'UBIQUITOUS_LANGUAGE.md',
      '--grill-decisions-ref',
      'docs/workspace/setup-grill-decisions.md',
      '--tdd-plan-ref',
      'docs/workspace/setup-tdd-plan.md#tdd-order',
    ];
    const graphEvidencePath = path.join(launchOutput.sessionRoot, 'intake', 'graph.json');

    const graphEvidenceBeforeUnknownRoute = readJson(graphEvidencePath);
    fs.writeFileSync(
      graphEvidencePath,
      `${JSON.stringify(
        {
          ...graphEvidenceBeforeUnknownRoute,
          routeHints: [
            {
              route: 'bmad-missing-advisory-route',
              explicitActionIntent: true,
              citations: [{ path: 'README.md' }],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const targetBeforeUnknownRoute = fingerprintTree(targetRepo.path);
    const baseBeforeUnknownRoute = fingerprintTree(baseRepo.path);
    const sessionBeforeUnknownRoute = fingerprintTree(launchOutput.sessionRoot);
    const unknownRoutePacket = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const unknownRoutePacketText = `${unknownRoutePacket.stdout}\n${unknownRoutePacket.stderr}`;
    assert(unknownRoutePacket.status === 2, 'packet unknown advisory route exits trust-gate code 2', unknownRoutePacketText);
    assert(
      unknownRoutePacket.stderr === '',
      'packet unknown advisory route prints JSON without stderr diagnostics',
      unknownRoutePacketText,
    );
    const unknownRouteOutput = JSON.parse(unknownRoutePacket.stdout);
    assert(unknownRouteOutput.status === 'blocked', 'unknown advisory route returns blocked JSON', unknownRoutePacketText);
    assert(unknownRouteOutput.reason === 'UNKNOWN_ROUTE', 'unknown advisory route names UNKNOWN_ROUTE', unknownRoutePacketText);
    assert(!('recommendedRoute' in unknownRouteOutput), 'unknown advisory route omits recommendedRoute', unknownRoutePacketText);
    assert(
      unknownRouteOutput.unknownRoutes.includes('bmad-missing-advisory-route'),
      'unknown advisory route reports missing route id',
      JSON.stringify(unknownRouteOutput, null, 2),
    );
    assert(
      unknownRouteOutput.zeroMutationProof.workflowExecution === 'not-started' &&
        unknownRouteOutput.zeroMutationProof.liveGraphifyCall === 'not-called' &&
        unknownRouteOutput.zeroMutationProof.networkCall === 'not-called' &&
        unknownRouteOutput.zeroMutationProof.repoMutation === 'not-started',
      'unknown advisory route reports no workflow, Graphify, network, or repo mutation',
      JSON.stringify(unknownRouteOutput, null, 2),
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with unknown advisory route does not write partial packet',
      unknownRoutePacketText,
    );
    assert(targetBeforeUnknownRoute === fingerprintTree(targetRepo.path), 'unknown advisory route does not mutate target repo');
    assert(baseBeforeUnknownRoute === fingerprintTree(baseRepo.path), 'unknown advisory route does not mutate Workspace Base');
    assert(
      sessionBeforeUnknownRoute === fingerprintTree(launchOutput.sessionRoot),
      'unknown advisory route does not mutate session artifacts',
    );
    fs.writeFileSync(graphEvidencePath, `${JSON.stringify(graphEvidenceBeforeUnknownRoute, null, 2)}\n`);

    const graphEvidenceBeforeFuzzyRoute = readJson(graphEvidencePath);
    fs.writeFileSync(
      graphEvidencePath,
      `${JSON.stringify(
        {
          ...graphEvidenceBeforeFuzzyRoute,
          routeHints: [
            {
              route: 'bmad-create-prdd',
              explicitActionIntent: true,
              citations: [{ path: 'README.md' }],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const targetBeforeFuzzyRoute = fingerprintTree(targetRepo.path);
    const baseBeforeFuzzyRoute = fingerprintTree(baseRepo.path);
    const sessionBeforeFuzzyRoute = fingerprintTree(launchOutput.sessionRoot);
    const fuzzyRoutePacket = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const fuzzyRoutePacketText = `${fuzzyRoutePacket.stdout}\n${fuzzyRoutePacket.stderr}`;
    assert(fuzzyRoutePacket.status === 2, 'packet fuzzy advisory route exits trust-gate code 2', fuzzyRoutePacketText);
    assert(fuzzyRoutePacket.stderr === '', 'packet fuzzy advisory route prints JSON without stderr diagnostics', fuzzyRoutePacketText);
    const fuzzyRouteOutput = JSON.parse(fuzzyRoutePacket.stdout);
    assert(fuzzyRouteOutput.status === 'blocked', 'fuzzy advisory route returns blocked JSON', fuzzyRoutePacketText);
    assert(fuzzyRouteOutput.reason === 'UNKNOWN_ROUTE', 'fuzzy advisory route names UNKNOWN_ROUTE', fuzzyRoutePacketText);
    assert(!('recommendedRoute' in fuzzyRouteOutput), 'fuzzy advisory route omits recommendedRoute', fuzzyRoutePacketText);
    assert(
      fuzzyRouteOutput.unknownRoutes.includes('bmad-create-prdd'),
      'fuzzy advisory route reports raw hinted route id',
      JSON.stringify(fuzzyRouteOutput, null, 2),
    );
    assert(
      fuzzyRouteOutput.evidenceRefs.includes('README.md'),
      'fuzzy advisory route reports cited evidence refs',
      JSON.stringify(fuzzyRouteOutput, null, 2),
    );
    assert(
      fuzzyRouteOutput.zeroMutationProof.workflowExecution === 'not-started' &&
        fuzzyRouteOutput.zeroMutationProof.liveGraphifyCall === 'not-called' &&
        fuzzyRouteOutput.zeroMutationProof.networkCall === 'not-called' &&
        fuzzyRouteOutput.zeroMutationProof.repoMutation === 'not-started',
      'fuzzy advisory route reports no workflow, Graphify, network, or repo mutation',
      JSON.stringify(fuzzyRouteOutput, null, 2),
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with fuzzy advisory route does not write partial packet',
      fuzzyRoutePacketText,
    );
    assert(targetBeforeFuzzyRoute === fingerprintTree(targetRepo.path), 'fuzzy advisory route does not mutate target repo');
    assert(baseBeforeFuzzyRoute === fingerprintTree(baseRepo.path), 'fuzzy advisory route does not mutate Workspace Base');
    assert(sessionBeforeFuzzyRoute === fingerprintTree(launchOutput.sessionRoot), 'fuzzy advisory route does not mutate session artifacts');
    fs.writeFileSync(graphEvidencePath, `${JSON.stringify(graphEvidenceBeforeFuzzyRoute, null, 2)}\n`);

    fs.rmSync(graphEvidencePath);
    const missingGraphPacket = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const missingGraphPacketText = `${missingGraphPacket.stdout}\n${missingGraphPacket.stderr}`;
    assert(missingGraphPacket.status !== 0, 'packet rejects missing required graph evidence', missingGraphPacketText);
    assert(
      missingGraphPacketText.includes('EVIDENCE_GATE_FAILED'),
      'missing graph evidence names EVIDENCE_GATE_FAILED',
      missingGraphPacketText,
    );
    assert(missingGraphPacketText.includes('"reason":"missing"'), 'missing graph evidence reports missing reason', missingGraphPacketText);
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with missing graph evidence does not write partial packet',
      missingGraphPacketText,
    );

    const restoreAfterMissingGraph = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    assert(
      restoreAfterMissingGraph.status === 0,
      're-intake restores missing graph evidence',
      `${restoreAfterMissingGraph.stdout}\n${restoreAfterMissingGraph.stderr}`,
    );

    fs.writeFileSync(graphEvidencePath, `${JSON.stringify({ kind: 'not-graph-evidence', schemaVersion: 1 }, null, 2)}\n`);
    const invalidGraphPacket = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const invalidGraphPacketText = `${invalidGraphPacket.stdout}\n${invalidGraphPacket.stderr}`;
    assert(invalidGraphPacket.status !== 0, 'packet rejects invalid required graph evidence', invalidGraphPacketText);
    assert(
      invalidGraphPacketText.includes('EVIDENCE_GATE_FAILED'),
      'invalid graph evidence names EVIDENCE_GATE_FAILED',
      invalidGraphPacketText,
    );
    assert(invalidGraphPacketText.includes('"reason":"invalid"'), 'invalid graph evidence reports invalid reason', invalidGraphPacketText);
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with invalid graph evidence does not write partial packet',
      invalidGraphPacketText,
    );

    const restoreAfterInvalidGraph = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    assert(
      restoreAfterInvalidGraph.status === 0,
      're-intake restores invalid graph evidence',
      `${restoreAfterInvalidGraph.stdout}\n${restoreAfterInvalidGraph.stderr}`,
    );

    const future = new Date(Date.now() + 10_000);
    fs.utimesSync(path.join(launchOutput.sessionRoot, 'intake', 'repo-intake.json'), future, future);
    const staleGraphPacket = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const staleGraphPacketText = `${staleGraphPacket.stdout}\n${staleGraphPacket.stderr}`;
    assert(staleGraphPacket.status !== 0, 'packet rejects stale required graph evidence', staleGraphPacketText);
    assert(staleGraphPacketText.includes('EVIDENCE_GATE_FAILED'), 'stale graph evidence names EVIDENCE_GATE_FAILED', staleGraphPacketText);
    assert(staleGraphPacketText.includes('"reason":"stale"'), 'stale graph evidence reports stale reason', staleGraphPacketText);
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with stale graph evidence does not write partial packet',
      staleGraphPacketText,
    );

    const restoreAfterStaleGraph = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    assert(
      restoreAfterStaleGraph.status === 0,
      're-intake restores stale graph evidence',
      `${restoreAfterStaleGraph.stdout}\n${restoreAfterStaleGraph.stderr}`,
    );

    const packet = runCli(completePacketArgs, {
      cwd: baseRepo.path,
    });
    const packetText = `${packet.stdout}\n${packet.stderr}`;
    assert(packet.status === 0, 'packet with fresh intake exits zero', packetText);
    const packetOutput = JSON.parse(packet.stdout);
    assertSessionOutput(packetOutput, 'packet output');
    assert(fs.existsSync(packetOutput.packetPath), 'packet writes bmad-work-packet.json', packetText);
    assert(fs.existsSync(packetOutput.renderedPromptPath), 'packet writes rendered-prompt.md', packetText);
    assert(fs.existsSync(packetOutput.capabilityContractPath), 'packet writes capabilities.json', packetText);
    assert(fs.existsSync(packetOutput.executorContractPath), 'packet writes executor-contract.json', packetText);

    const sessionPacket = readJson(packetOutput.packetPath);
    assert(sessionPacket.kind === 'bmad-work-packet', 'packet records Work Packet kind', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.packetVersion === 5, 'packet records packetVersion 5', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.sessionId === launchOutput.sessionId, 'packet records sessionId', JSON.stringify(sessionPacket, null, 2));
    assertSessionOutput(sessionPacket, 'BMAD Work Packet');
    assert(sessionPacket.routing.routingSchemaVersion === 1, 'packet records routing schema', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.routing.selectedWorkflow === 'bmad-quick-dev',
      'packet routes quick dev deterministically',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.routing.source === 'deterministic',
      'packet records deterministic route source',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.bmadWorkflow === sessionPacket.routing.selectedWorkflow,
      'packet workflow alias matches routing selected workflow',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(sessionPacket.goal === 'Fix target repo bug.', 'packet records goal from goal file', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.sessionSetup.zoomOut.ref === 'docs/workspace/setup-zoom-out.md',
      'packet records zoom-out setup ref',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.sessionSetup.zoomOut.sha256 === sha256File(path.join(baseRepo.path, 'docs', 'workspace', 'setup-zoom-out.md')),
      'packet records zoom-out setup checksum',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(!('repoIntakeRefs' in sessionPacket), 'v5 packet omits legacy repoIntakeRefs', JSON.stringify(sessionPacket, null, 2));
    assert(Array.isArray(sessionPacket.evidenceGates), 'v5 packet records evidenceGates', JSON.stringify(sessionPacket, null, 2));
    assert(Array.isArray(sessionPacket.evidenceRefs), 'v5 packet records evidenceRefs', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.evidenceGates.some(
        (gate) =>
          gate.required === true && gate.requiredCapabilityIds.includes('evidence.graph.repo-intake') && gate.freshnessPolicy === 'mtime',
      ),
      'v5 packet declares required repo-intake graph evidence gate',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.evidenceRefs.some(
        (ref) => ref.capability === 'evidence.graph.repo-intake' && ref.artifactRef === 'intake/graph.json' && ref.sha256,
      ),
      'v5 packet references repo-intake graph evidence',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.constraints.includes('Do not mutate Workspace Base'),
      'packet records base isolation constraint',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(sessionPacket.grants.includes('grants.json'), 'packet references grants', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.acceptanceCriteria.length > 0, 'packet includes acceptance criteria', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.capabilityContractRef === 'capabilities.json',
      'packet references Capability Contract',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.renderedPromptRef === 'packets/rendered-prompt.md',
      'packet references rendered prompt',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.executorContractRef === 'packets/executor-contract.json',
      'packet references executor contract',
      JSON.stringify(sessionPacket, null, 2),
    );

    const executorContract = readJson(packetOutput.executorContractPath);
    assert(
      executorContract.kind === 'bmad-workspace-executor-contract',
      'executor contract records kind',
      JSON.stringify(executorContract, null, 2),
    );
    assert(executorContract.schemaVersion === 1, 'executor contract records schema version', JSON.stringify(executorContract, null, 2));
    assert(
      executorContract.sessionId === launchOutput.sessionId,
      'executor contract records session id',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.packetRef === 'packets/bmad-work-packet.json',
      'executor contract references packet',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.renderedPromptRef === 'packets/rendered-prompt.md',
      'executor contract references rendered prompt',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.resultLedgerRef === 'results',
      'executor contract references result ledger directory',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.executionMode === 'manual',
      'executor contract records manual execution mode',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.executorKind === 'codex',
      'executor contract records Codex executor kind',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      Array.isArray(executorContract.allowedWriteRoots) &&
        executorContract.allowedWriteRoots.length === 1 &&
        path.isAbsolute(executorContract.allowedWriteRoots[0]),
      'executor contract records absolute allowed write roots',
      JSON.stringify(executorContract, null, 2),
    );
    assert(
      executorContract.allowedWriteRoots[0] === fs.realpathSync.native(guardRepoPack.repos[0].worktreePath),
      'executor contract derives allowed roots from grants',
      JSON.stringify(executorContract, null, 2),
    );
    for (const forbiddenAction of ['workspace-run', 'scheduler', 'watcher', 'daemon', 'live-adapter-activation', 'hidden-subprocess']) {
      assert(
        executorContract.forbiddenActions.includes(forbiddenAction),
        `executor contract forbids ${forbiddenAction}`,
        JSON.stringify(executorContract, null, 2),
      );
    }
    assert(
      executorContract.manualExecutionSteps.some((step) => step.includes('bmad workspace result')),
      'executor contract names Result Ledger recording step',
      JSON.stringify(executorContract, null, 2),
    );

    const capabilityContract = readJson(packetOutput.capabilityContractPath);
    assert(
      capabilityContract.capabilities.some((capability) => capability.id === 'executor.codex.manual'),
      'Capability Contract includes manual Codex executor readiness',
      JSON.stringify(capabilityContract, null, 2),
    );
    const gitCapability = capabilityContract.capabilities.find((capability) => capability.id === 'repo.git.worktree-review');
    assert(
      gitCapability?.provider === 'git' && gitCapability?.interface === 'worktree-review',
      'Capability Contract records Git Worktree Review provider',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      gitCapability?.writes?.includes('workspace-session/review') &&
        gitCapability?.outputs?.includes('review-manifest.json') &&
        gitCapability.outputs.includes('diff.patch'),
      'Capability Contract records Git review artifact writes and outputs',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      gitCapability?.forbiddenWrites?.includes('target-repo/push') &&
        gitCapability.forbiddenWrites.includes('target-repo/reset') &&
        gitCapability.forbiddenWrites.includes('target-repo/clean'),
      'Capability Contract forbids destructive Git target actions',
      JSON.stringify(capabilityContract, null, 2),
    );
    const graphCapability = capabilityContract.capabilities.find((capability) => capability.id === 'evidence.graph.repo-intake');
    assert(
      graphCapability?.provider === 'graphify',
      'Capability Contract records Graphify graph provider',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      graphCapability?.interface === 'repo-intake',
      'Capability Contract keeps repo-intake graph interface',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      graphCapability?.artifactRefs?.includes('intake/graph.json'),
      'Capability Contract references graph evidence artifact',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      graphCapability?.validationCommand === 'npm run validate:graphify-manifests',
      'Capability Contract records Graphify validation command',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      graphCapability?.guidance?.bmad?.includes('advisory') &&
        graphCapability.guidance.codex.includes('verify source files before edits') &&
        graphCapability.guidance.tools.includes(
          'does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration',
        ),
      'Capability Contract records advisory graph guidance',
      JSON.stringify(capabilityContract, null, 2),
    );
    const postgresqlMcpCapability = capabilityContract.capabilities.find((capability) => capability.id === 'host.mcp.postgresql.readonly');
    assert(
      postgresqlMcpCapability?.provider === 'modelcontextprotocol/server-postgres' &&
        postgresqlMcpCapability?.interface === 'readonly-postgresql-mcp',
      'Capability Contract records PostgreSQL MCP readonly provider',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      postgresqlMcpCapability?.writes?.length === 0 &&
        postgresqlMcpCapability?.forbiddenWrites?.includes('external/postgresql/database') &&
        postgresqlMcpCapability?.forbiddenWrites?.includes('secret-store'),
      'Capability Contract records PostgreSQL MCP readonly and secret boundaries',
      JSON.stringify(capabilityContract, null, 2),
    );
    assert(
      postgresqlMcpCapability?.outputs?.includes('postgres-mcp-operator-evidence.json'),
      'Capability Contract records PostgreSQL MCP operator evidence output',
      JSON.stringify(capabilityContract, null, 2),
    );

    const renderedPrompt = fs.readFileSync(packetOutput.renderedPromptPath, 'utf8');
    assert(renderedPrompt.includes('Source of truth: `packets/bmad-work-packet.json`'), 'rendered prompt names packet source');
    assert(renderedPrompt.includes('Fix target repo bug.'), 'rendered prompt includes packet goal');
    assert(renderedPrompt.includes('Do not mutate Workspace Base'), 'rendered prompt includes packet constraints');
    assert(renderedPrompt.includes('GOAL_QUICK_DEV'), 'rendered prompt includes routing reason code');
    assert(renderedPrompt.includes('packets/executor-contract.json'), 'rendered prompt references executor contract');
    assert(renderedPrompt.includes('## Graph Evidence'), 'rendered prompt includes graph evidence section');
    assert(renderedPrompt.includes('intake/graph.json'), 'rendered prompt references graph evidence artifact');
    assert(renderedPrompt.includes('Graph evidence is advisory'), 'rendered prompt marks graph evidence advisory');
    assert(renderedPrompt.includes('verify source files before edits'), 'rendered prompt requires source verification');
    assert(
      renderedPrompt.includes('does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration'),
      'rendered prompt preserves graph boundary',
      renderedPrompt,
    );

    const packetStatusBefore = fingerprintTree(launchOutput.sessionRoot);
    const packetStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const packetStatusAfter = fingerprintTree(launchOutput.sessionRoot);
    const packetStatusText = `${packetStatus.stdout}\n${packetStatus.stderr}`;
    assert(packetStatus.status === 0, 'status after packet exits zero', packetStatusText);
    assert(packetStatusBefore === packetStatusAfter, 'status after packet is read-only', packetStatusText);
    const packetStatusOutput = JSON.parse(packetStatus.stdout);
    assert(packetStatusOutput.evidenceGates.state === 'passed', 'status summarizes passed evidence gates', packetStatusText);
    assert(
      packetStatusOutput.evidenceGates.gates.some((gate) => gate.id === 'repo-intake-graph' && gate.state === 'passed'),
      'status reports repo-intake graph evidence gate details',
      packetStatusText,
    );

    const packetEvidenceBefore = fingerprintTree(launchOutput.sessionRoot);
    const packetEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const packetEvidenceAfter = fingerprintTree(launchOutput.sessionRoot);
    const packetEvidenceText = `${packetEvidence.stdout}\n${packetEvidence.stderr}`;
    assert(packetEvidence.status === 0, 'evidence after packet exits zero', packetEvidenceText);
    assert(packetEvidenceBefore === packetEvidenceAfter, 'evidence after packet is read-only', packetEvidenceText);
    const packetEvidenceOutput = JSON.parse(packetEvidence.stdout);
    assert(
      packetEvidenceOutput.artifacts.some((item) => item.kind === 'work-packet' && item.validationState === 'valid' && item.sha256),
      'evidence records packet checksum',
      packetEvidenceText,
    );
    assert(packetEvidenceOutput.evidenceGates.state === 'passed', 'evidence summarizes passed evidence gates', packetEvidenceText);
    assert(
      packetEvidenceOutput.evidenceGates.gates.some((gate) => gate.id === 'repo-intake-graph' && gate.state === 'passed'),
      'evidence reports repo-intake graph evidence gate details',
      packetEvidenceText,
    );
    assert(
      packetEvidenceOutput.artifacts.some((item) => item.kind === 'executor-contract' && item.validationState === 'valid'),
      'evidence records executor contract state',
      packetEvidenceText,
    );
    assert(
      packetEvidenceOutput.artifacts.some(
        (item) => item.kind === 'graph-evidence' && item.ref === 'intake/graph.json' && item.validationState === 'valid',
      ),
      'evidence records graph evidence artifact',
      packetEvidenceText,
    );
    assert(
      packetEvidenceOutput.checks.some((item) => item.code === 'REVIEW_MISSING' && item.nextManualAction.includes('bmad workspace review')),
      'evidence after packet records review next action',
      packetEvidenceText,
    );

    const originalPacketContent = fs.readFileSync(packetOutput.packetPath, 'utf8');
    const originalExecutorContractContent = fs.readFileSync(packetOutput.executorContractPath, 'utf8');
    const missingRoutingPacket = JSON.parse(originalPacketContent);
    delete missingRoutingPacket.routing;
    fs.writeFileSync(packetOutput.packetPath, `${JSON.stringify(missingRoutingPacket, null, 2)}\n`);
    const missingRoutingStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingRoutingStatusText = `${missingRoutingStatus.stdout}\n${missingRoutingStatus.stderr}`;
    assert(missingRoutingStatus.status === 0, 'status with missing routing exits zero', missingRoutingStatusText);
    const missingRoutingStatusOutput = JSON.parse(missingRoutingStatus.stdout);
    assert(missingRoutingStatusOutput.status === 'invalid', 'status marks missing routing invalid', missingRoutingStatusText);
    assert(
      missingRoutingStatusOutput.checks.some(
        (item) => item.code === 'WORK_PACKET_SCHEMA_INVALID' && item.message.includes('packet.routing'),
      ),
      'status reports missing routing as packet schema error',
      missingRoutingStatusText,
    );
    const missingRoutingHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingRoutingHandoffText = `${missingRoutingHandoff.stdout}\n${missingRoutingHandoff.stderr}`;
    assert(missingRoutingHandoff.status !== 0, 'handoff rejects packet without routing', missingRoutingHandoffText);
    assert(
      missingRoutingHandoffText.includes('SESSION_INVALID'),
      'missing routing handoff names invalid session',
      missingRoutingHandoffText,
    );
    fs.writeFileSync(packetOutput.packetPath, originalPacketContent);

    const missingExecutorPacket = JSON.parse(originalPacketContent);
    delete missingExecutorPacket.executorContractRef;
    fs.writeFileSync(packetOutput.packetPath, `${JSON.stringify(missingExecutorPacket, null, 2)}\n`);
    const missingExecutorFieldStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingExecutorFieldStatusText = `${missingExecutorFieldStatus.stdout}\n${missingExecutorFieldStatus.stderr}`;
    assert(missingExecutorFieldStatus.status === 0, 'status with missing executorContractRef exits zero', missingExecutorFieldStatusText);
    const missingExecutorFieldStatusOutput = JSON.parse(missingExecutorFieldStatus.stdout);
    assert(
      missingExecutorFieldStatusOutput.status === 'invalid',
      'status marks missing executorContractRef invalid',
      missingExecutorFieldStatusText,
    );
    assert(
      missingExecutorFieldStatusOutput.checks.some(
        (item) => item.code === 'WORK_PACKET_SCHEMA_INVALID' && item.message.includes('executorContractRef'),
      ),
      'status reports missing executorContractRef as packet schema error',
      missingExecutorFieldStatusText,
    );
    const missingExecutorFieldHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingExecutorFieldHandoffText = `${missingExecutorFieldHandoff.stdout}\n${missingExecutorFieldHandoff.stderr}`;
    assert(missingExecutorFieldHandoff.status !== 0, 'handoff rejects packet without executorContractRef', missingExecutorFieldHandoffText);
    assert(
      missingExecutorFieldHandoffText.includes('SESSION_INVALID'),
      'missing executorContractRef handoff names invalid session',
      missingExecutorFieldHandoffText,
    );
    fs.writeFileSync(packetOutput.packetPath, originalPacketContent);

    fs.rmSync(packetOutput.executorContractPath);
    const missingExecutorStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingExecutorStatusText = `${missingExecutorStatus.stdout}\n${missingExecutorStatus.stderr}`;
    assert(missingExecutorStatus.status === 0, 'status with missing declared executor contract exits zero', missingExecutorStatusText);
    const missingExecutorStatusOutput = JSON.parse(missingExecutorStatus.stdout);
    assert(
      missingExecutorStatusOutput.status === 'invalid',
      'status with missing declared executor contract is invalid',
      missingExecutorStatusText,
    );
    assert(
      missingExecutorStatusOutput.checks.some((item) => item.code === 'EXECUTOR_CONTRACT_MISSING'),
      'status names missing declared executor contract',
      missingExecutorStatusText,
    );
    const missingExecutorHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingExecutorHandoffText = `${missingExecutorHandoff.stdout}\n${missingExecutorHandoff.stderr}`;
    assert(missingExecutorHandoff.status !== 0, 'handoff fails missing declared executor contract', missingExecutorHandoffText);
    assert(
      missingExecutorHandoffText.includes('SESSION_INVALID'),
      'handoff missing executor contract names invalid session',
      missingExecutorHandoffText,
    );
    const missingExecutorArchiveRoot = path.join(tempRoot, 'missing-executor-contract-archive');
    const missingExecutorArchive = runCli(
      ['workspace', 'archive', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', missingExecutorArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const missingExecutorArchiveText = `${missingExecutorArchive.stdout}\n${missingExecutorArchive.stderr}`;
    assert(missingExecutorArchive.status !== 0, 'archive fails missing declared executor contract', missingExecutorArchiveText);
    assert(
      missingExecutorArchiveText.includes('EXECUTOR_CONTRACT_INVALID'),
      'archive missing executor contract names executor contract invalid',
      missingExecutorArchiveText,
    );
    assert(
      !fs.existsSync(missingExecutorArchiveRoot),
      'archive missing executor contract writes no output dir',
      missingExecutorArchiveText,
    );
    fs.writeFileSync(packetOutput.executorContractPath, originalExecutorContractContent);

    const closeoutCompletedInputPath = path.join(tempRoot, 'closeout-completed.json');
    fs.writeFileSync(
      closeoutCompletedInputPath,
      `${JSON.stringify(
        {
          outcome: 'completed',
          nextAction: 'manual-target-review',
          summary: 'Manual work finished and review evidence is ready.',
          evidenceRefs: ['review/summary.json'],
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(packetOutput.executorContractPath, `${JSON.stringify({ kind: 'not-executor-contract' }, null, 2)}\n`);
    const invalidExecutorStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidExecutorStatusText = `${invalidExecutorStatus.stdout}\n${invalidExecutorStatus.stderr}`;
    assert(invalidExecutorStatus.status === 0, 'status with invalid executor contract exits zero', invalidExecutorStatusText);
    const invalidExecutorStatusOutput = JSON.parse(invalidExecutorStatus.stdout);
    assert(invalidExecutorStatusOutput.status === 'invalid', 'status with invalid executor contract is invalid', invalidExecutorStatusText);
    assert(
      invalidExecutorStatusOutput.checks.some((item) => item.code === 'EXECUTOR_CONTRACT_INVALID'),
      'status names invalid executor contract',
      invalidExecutorStatusText,
    );
    const invalidExecutorCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'invalid-executor-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidExecutorCloseoutText = `${invalidExecutorCloseout.stdout}\n${invalidExecutorCloseout.stderr}`;
    assert(invalidExecutorCloseout.status !== 0, 'closeout with invalid executor contract exits nonzero', invalidExecutorCloseoutText);
    assert(
      invalidExecutorCloseoutText.includes('EXECUTOR_CONTRACT_INVALID'),
      'closeout invalid executor contract names stable error',
      invalidExecutorCloseoutText,
    );
    fs.writeFileSync(packetOutput.executorContractPath, originalExecutorContractContent);

    const packetFingerprint = fingerprintTree(path.join(launchOutput.sessionRoot, 'packets'));
    const unknownWorkflowAfterPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-missing-workflow',
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const unknownWorkflowAfterPacketText = `${unknownWorkflowAfterPacket.stdout}\n${unknownWorkflowAfterPacket.stderr}`;
    assert(unknownWorkflowAfterPacket.status !== 0, 'packet rejects unknown workflow override', unknownWorkflowAfterPacketText);
    assert(
      unknownWorkflowAfterPacketText.includes('ROUTE_WORKFLOW_UNKNOWN'),
      'unknown workflow override names ROUTE_WORKFLOW_UNKNOWN',
      unknownWorkflowAfterPacketText,
    );
    assert(
      packetFingerprint === fingerprintTree(path.join(launchOutput.sessionRoot, 'packets')),
      'packet route failure preserves existing packet artifacts',
      unknownWorkflowAfterPacketText,
    );

    const overridePacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-create-prd',
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const overridePacketText = `${overridePacket.stdout}\n${overridePacket.stderr}`;
    assert(overridePacket.status === 0, 'packet accepts explicit workflow override', overridePacketText);
    const overrideSessionPacket = readJson(JSON.parse(overridePacket.stdout).packetPath);
    assert(
      overrideSessionPacket.routing.selectedWorkflow === 'bmad-create-prd',
      'explicit workflow override records selected workflow',
      JSON.stringify(overrideSessionPacket, null, 2),
    );
    assert(
      overrideSessionPacket.routing.source === 'override',
      'explicit workflow override records source',
      JSON.stringify(overrideSessionPacket, null, 2),
    );

    fs.appendFileSync(path.join(baseRepo.path, 'docs', 'workspace', 'setup-zoom-out.md'), 'Checksum drift.\n');
    const checksumStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const checksumStatusText = `${checksumStatus.stdout}\n${checksumStatus.stderr}`;
    assert(checksumStatus.status === 0, 'status with checksum drift exits zero', checksumStatusText);
    const checksumStatusOutput = JSON.parse(checksumStatus.stdout);
    assert(checksumStatusOutput.status === 'stale', 'status with checksum drift reports stale', checksumStatusText);
    assert(
      checksumStatusOutput.checks.some((item) => item.code === 'SETUP_REF_CHECKSUM_MISMATCH'),
      'status names setup checksum mismatch',
      checksumStatusText,
    );
    const checksumEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const checksumEvidenceText = `${checksumEvidence.stdout}\n${checksumEvidence.stderr}`;
    assert(checksumEvidence.status === 0, 'evidence with checksum drift exits zero', checksumEvidenceText);
    assert(
      JSON.parse(checksumEvidence.stdout).checks.some((item) => item.code === 'SETUP_REF_CHECKSUM_MISMATCH'),
      'evidence names setup checksum mismatch',
      checksumEvidenceText,
    );
    fs.writeFileSync(path.join(baseRepo.path, 'docs', 'workspace', 'setup-zoom-out.md'), 'Zoom out map.\n');

    const skippedPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
        '--skip-setup',
        'grillDecisions=Already decided by party mode.',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const skippedPacketText = `${skippedPacket.stdout}\n${skippedPacket.stderr}`;
    assert(skippedPacket.status === 0, 'packet accepts explicit setup skip', skippedPacketText);
    const skippedPacketOutput = JSON.parse(skippedPacket.stdout);
    const skippedSessionPacket = readJson(skippedPacketOutput.packetPath);
    assert(
      skippedSessionPacket.sessionSetup.grillDecisions.status === 'skipped',
      'packet records skipped setup status',
      JSON.stringify(skippedSessionPacket, null, 2),
    );

    const externalPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'external:zoom-out-thread-note',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
        env: { NO_PROXY: '*', HTTPS_PROXY: 'http://127.0.0.1:1', HTTP_PROXY: 'http://127.0.0.1:1' },
      },
    );
    const externalPacketText = `${externalPacket.stdout}\n${externalPacket.stderr}`;
    assert(externalPacket.status === 0, 'packet accepts external setup ref without network', externalPacketText);
    const externalPacketOutput = JSON.parse(externalPacket.stdout);
    const externalSessionPacket = readJson(externalPacketOutput.packetPath);
    assert(
      externalSessionPacket.sessionSetup.zoomOut.verification === 'external-unverified',
      'external setup ref records unverified provenance',
      JSON.stringify(externalSessionPacket, null, 2),
    );
    assert(
      externalSessionPacket.routing.selectedWorkflow === 'bmad-quick-dev',
      'external setup packet keeps deterministic route',
      JSON.stringify(externalSessionPacket, null, 2),
    );
    const externalStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
      env: { NO_PROXY: '*', HTTPS_PROXY: 'http://127.0.0.1:1', HTTP_PROXY: 'http://127.0.0.1:1' },
    });
    const externalStatusText = `${externalStatus.stdout}\n${externalStatus.stderr}`;
    assert(externalStatus.status === 0, 'status accepts external setup ref without network', externalStatusText);
    const externalStatusOutput = JSON.parse(externalStatus.stdout);
    assert(
      externalStatusOutput.checks.some((item) => item.code === 'SETUP_REF_EXTERNAL_UNVERIFIED' && item.severity === 'warning'),
      'status reports external setup warning',
      externalStatusText,
    );

    section('Workspace Result Ledger');

    const resultInputPath = path.join(tempRoot, 'result-input.json');
    const resultSideEffectPath = path.join(tempRoot, 'result-command-was-run');
    const resultInput = {
      outcome: 'succeeded',
      summary: 'Manual execution completed with focused checks.',
      commands: [
        {
          command: `${process.execPath} -e "require('fs').writeFileSync('${resultSideEffectPath}', 'bad')"`,
          exitCode: 0,
          summary: 'Command text recorded only; Workspace did not execute it.',
        },
      ],
      evidenceRefs: ['review/summary.json'],
    };
    fs.writeFileSync(resultInputPath, `${JSON.stringify(resultInput, null, 2)}\n`);

    const missingSessionResult = runCli(
      [
        'workspace',
        'result',
        'missing-session',
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'missing-result',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSessionResultText = `${missingSessionResult.stdout}\n${missingSessionResult.stderr}`;
    assert(missingSessionResult.status !== 0, 'result missing session exits nonzero', missingSessionResultText);
    assert(
      missingSessionResultText.includes('SESSION_NOT_FOUND'),
      'result missing session names SESSION_NOT_FOUND',
      missingSessionResultText,
    );

    const missingPacketResult = runCli(
      [
        'workspace',
        'result',
        multiRepoOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'no-packet',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingPacketResultText = `${missingPacketResult.stdout}\n${missingPacketResult.stderr}`;
    assert(missingPacketResult.status !== 0, 'result without packet exits nonzero', missingPacketResultText);
    assert(
      missingPacketResultText.includes('RESULT_PACKET_MISSING'),
      'result without packet names RESULT_PACKET_MISSING',
      missingPacketResultText,
    );

    section('Workspace Closeout Preconditions');

    const missingSessionCloseout = runCli(
      [
        'workspace',
        'closeout',
        'missing-session',
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'missing-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSessionCloseoutText = `${missingSessionCloseout.stdout}\n${missingSessionCloseout.stderr}`;
    assert(missingSessionCloseout.status !== 0, 'closeout missing session exits nonzero', missingSessionCloseoutText);
    assert(
      missingSessionCloseoutText.includes('SESSION_NOT_FOUND'),
      'closeout missing session names SESSION_NOT_FOUND',
      missingSessionCloseoutText,
    );

    const missingPacketCloseout = runCli(
      [
        'workspace',
        'closeout',
        multiRepoOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'no-packet-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingPacketCloseoutText = `${missingPacketCloseout.stdout}\n${missingPacketCloseout.stderr}`;
    assert(missingPacketCloseout.status !== 0, 'closeout without packet exits nonzero', missingPacketCloseoutText);
    assert(
      missingPacketCloseoutText.includes('CLOSEOUT_PACKET_MISSING'),
      'closeout without packet names CLOSEOUT_PACKET_MISSING',
      missingPacketCloseoutText,
    );

    const invalidJsonInputPath = path.join(tempRoot, 'result-invalid-json.json');
    fs.writeFileSync(invalidJsonInputPath, '{nope\n');
    const invalidJsonResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidJsonInputPath,
        '--result-id',
        'bad-json',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidJsonResultText = `${invalidJsonResult.stdout}\n${invalidJsonResult.stderr}`;
    assert(invalidJsonResult.status !== 0, 'result invalid JSON exits nonzero', invalidJsonResultText);
    assert(invalidJsonResultText.includes('RESULT_INPUT_INVALID_JSON'), 'result invalid JSON names stable error', invalidJsonResultText);

    const invalidOutcomeInputPath = path.join(tempRoot, 'result-invalid-outcome.json');
    fs.writeFileSync(invalidOutcomeInputPath, `${JSON.stringify({ outcome: 'unknown', summary: 'Bad outcome.' }, null, 2)}\n`);
    const invalidOutcomeResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidOutcomeInputPath,
        '--result-id',
        'bad-outcome',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidOutcomeResultText = `${invalidOutcomeResult.stdout}\n${invalidOutcomeResult.stderr}`;
    assert(invalidOutcomeResult.status !== 0, 'result invalid outcome exits nonzero', invalidOutcomeResultText);
    assert(invalidOutcomeResultText.includes('RESULT_INVALID'), 'result invalid outcome names RESULT_INVALID', invalidOutcomeResultText);

    const unsafeResultId = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        '../escape',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const unsafeResultIdText = `${unsafeResultId.stdout}\n${unsafeResultId.stderr}`;
    assert(unsafeResultId.status !== 0, 'result unsafe id exits nonzero', unsafeResultIdText);
    assert(unsafeResultIdText.includes('RESULT_ID_UNSAFE'), 'result unsafe id names RESULT_ID_UNSAFE', unsafeResultIdText);

    const secretToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzABCDE';
    const secretInputPath = path.join(tempRoot, 'result-secret.json');
    fs.writeFileSync(secretInputPath, `${JSON.stringify({ outcome: 'failed', summary: secretToken }, null, 2)}\n`);
    const secretResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        secretInputPath,
        '--result-id',
        'secret-result',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const secretResultText = `${secretResult.stdout}\n${secretResult.stderr}`;
    assert(secretResult.status !== 0, 'result secret-positive input exits nonzero', secretResultText);
    assert(
      secretResultText.includes('RESULT_SECRET_DETECTED'),
      'result secret-positive input names RESULT_SECRET_DETECTED',
      secretResultText,
    );
    assert(!secretResultText.includes(secretToken), 'result secret-positive stderr is redacted', secretResultText);
    assert(!fs.existsSync(path.join(launchOutput.sessionRoot, 'results')), 'result failures write no partial artifacts');

    const completedBeforeReviewCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'before-review',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const completedBeforeReviewCloseoutText = `${completedBeforeReviewCloseout.stdout}\n${completedBeforeReviewCloseout.stderr}`;
    assert(completedBeforeReviewCloseout.status !== 0, 'completed closeout before review exits nonzero', completedBeforeReviewCloseoutText);
    assert(
      completedBeforeReviewCloseoutText.includes('CLOSEOUT_REVIEW_MISSING'),
      'completed closeout before review names CLOSEOUT_REVIEW_MISSING',
      completedBeforeReviewCloseoutText,
    );

    const unsafeCloseoutId = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        '../escape',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const unsafeCloseoutIdText = `${unsafeCloseoutId.stdout}\n${unsafeCloseoutId.stderr}`;
    assert(unsafeCloseoutId.status !== 0, 'closeout unsafe id exits nonzero', unsafeCloseoutIdText);
    assert(unsafeCloseoutIdText.includes('CLOSEOUT_ID_UNSAFE'), 'closeout unsafe id names CLOSEOUT_ID_UNSAFE', unsafeCloseoutIdText);

    const invalidJsonCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidJsonInputPath,
        '--closeout-id',
        'bad-json-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidJsonCloseoutText = `${invalidJsonCloseout.stdout}\n${invalidJsonCloseout.stderr}`;
    assert(invalidJsonCloseout.status !== 0, 'closeout invalid JSON exits nonzero', invalidJsonCloseoutText);
    assert(
      invalidJsonCloseoutText.includes('CLOSEOUT_INPUT_INVALID_JSON'),
      'closeout invalid JSON names stable error',
      invalidJsonCloseoutText,
    );

    const secretCloseoutInputPath = path.join(tempRoot, 'closeout-secret.json');
    fs.writeFileSync(
      secretCloseoutInputPath,
      `${JSON.stringify({ outcome: 'blocked', nextAction: 'manual-continuation-review', summary: secretToken }, null, 2)}\n`,
    );
    const secretCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        secretCloseoutInputPath,
        '--closeout-id',
        'secret-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const secretCloseoutText = `${secretCloseout.stdout}\n${secretCloseout.stderr}`;
    assert(secretCloseout.status !== 0, 'closeout secret-positive input exits nonzero', secretCloseoutText);
    assert(
      secretCloseoutText.includes('CLOSEOUT_SECRET_DETECTED'),
      'closeout secret-positive input names CLOSEOUT_SECRET_DETECTED',
      secretCloseoutText,
    );
    assert(!secretCloseoutText.includes(secretToken), 'closeout secret-positive stderr is redacted', secretCloseoutText);

    const invalidCloseoutInputPath = path.join(tempRoot, 'closeout-invalid-action.json');
    fs.writeFileSync(
      invalidCloseoutInputPath,
      `${JSON.stringify({ outcome: 'approved', nextAction: 'merge', summary: 'Bad closeout.' }, null, 2)}\n`,
    );
    const invalidCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidCloseoutInputPath,
        '--closeout-id',
        'bad-action-closeout',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidCloseoutText = `${invalidCloseout.stdout}\n${invalidCloseout.stderr}`;
    assert(invalidCloseout.status !== 0, 'closeout invalid outcome or action exits nonzero', invalidCloseoutText);
    assert(invalidCloseoutText.includes('CLOSEOUT_INVALID'), 'closeout invalid outcome or action names stable error', invalidCloseoutText);
    assert(!fs.existsSync(path.join(launchOutput.sessionRoot, 'closeout')), 'closeout failures write no partial artifacts');

    const recordResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'result-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const recordResultText = `${recordResult.stdout}\n${recordResult.stderr}`;
    assert(recordResult.status === 0, 'valid result exits zero', recordResultText);
    const recordResultOutput = JSON.parse(recordResult.stdout);
    assertSessionOutput(recordResultOutput, 'result output');
    assert(recordResultOutput.resultId === 'result-001', 'result output records result id', recordResultText);
    assert(fs.existsSync(recordResultOutput.resultPath), 'result writes artifact', recordResultText);
    assert(!fs.existsSync(resultSideEffectPath), 'result command text is not executed', recordResultText);
    const resultArtifact = readJson(recordResultOutput.resultPath);
    assert(resultArtifact.kind === 'bmad-workspace-result', 'result records kind', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.schemaVersion === 1, 'result records schemaVersion 1', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.sessionId === launchOutput.sessionId, 'result records sessionId', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.resultId === 'result-001', 'result records resultId', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.outcome === 'succeeded', 'result records outcome', JSON.stringify(resultArtifact, null, 2));
    assert(
      resultArtifact.packetRef === 'packets/bmad-work-packet.json',
      'result records packet ref',
      JSON.stringify(resultArtifact, null, 2),
    );
    assert(
      resultArtifact.routing.selectedWorkflow === 'bmad-quick-dev',
      'result records packet route',
      JSON.stringify(resultArtifact, null, 2),
    );

    const duplicateResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'result-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const duplicateResultText = `${duplicateResult.stdout}\n${duplicateResult.stderr}`;
    assert(duplicateResult.status !== 0, 'duplicate result exits nonzero', duplicateResultText);
    assert(duplicateResultText.includes('RESULT_EXISTS'), 'duplicate result names RESULT_EXISTS', duplicateResultText);

    const invalidStoredResultPath = path.join(launchOutput.sessionRoot, 'results', 'invalid-result.json');
    fs.writeFileSync(invalidStoredResultPath, `${JSON.stringify({ kind: 'not-a-result' }, null, 2)}\n`);
    const invalidResultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidResultStatusText = `${invalidResultStatus.stdout}\n${invalidResultStatus.stderr}`;
    assert(invalidResultStatus.status === 0, 'status with invalid result exits zero', invalidResultStatusText);
    const invalidResultStatusOutput = JSON.parse(invalidResultStatus.stdout);
    assert(
      invalidResultStatusOutput.checks.some((item) => item.code === 'RESULT_INVALID'),
      'status with invalid result names RESULT_INVALID',
      invalidResultStatusText,
    );
    const invalidResultEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidResultEvidenceText = `${invalidResultEvidence.stdout}\n${invalidResultEvidence.stderr}`;
    assert(invalidResultEvidence.status === 0, 'evidence with invalid result exits zero', invalidResultEvidenceText);
    assert(
      JSON.parse(invalidResultEvidence.stdout).checks.some((item) => item.code === 'RESULT_INVALID'),
      'evidence with invalid result names RESULT_INVALID',
      invalidResultEvidenceText,
    );
    fs.rmSync(invalidStoredResultPath);

    const secretStoredResultPath = path.join(launchOutput.sessionRoot, 'results', 'secret-result.json');
    fs.writeFileSync(
      secretStoredResultPath,
      `${JSON.stringify({ ...resultArtifact, resultId: 'secret-result', summary: secretToken }, null, 2)}\n`,
    );
    const secretResultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const secretResultStatusText = `${secretResultStatus.stdout}\n${secretResultStatus.stderr}`;
    assert(secretResultStatus.status === 0, 'status with secret-positive result exits zero', secretResultStatusText);
    assert(
      JSON.parse(secretResultStatus.stdout).checks.some((item) => item.code === 'RESULT_SECRET_DETECTED'),
      'status with secret-positive result names RESULT_SECRET_DETECTED',
      secretResultStatusText,
    );
    assert(!secretResultStatusText.includes(secretToken), 'status with secret-positive result is redacted', secretResultStatusText);
    const secretResultEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const secretResultEvidenceText = `${secretResultEvidence.stdout}\n${secretResultEvidence.stderr}`;
    assert(secretResultEvidence.status === 0, 'evidence with secret-positive result exits zero', secretResultEvidenceText);
    assert(
      JSON.parse(secretResultEvidence.stdout).checks.some((item) => item.code === 'RESULT_SECRET_DETECTED'),
      'evidence with secret-positive result names RESULT_SECRET_DETECTED',
      secretResultEvidenceText,
    );
    assert(!secretResultEvidenceText.includes(secretToken), 'evidence with secret-positive result is redacted', secretResultEvidenceText);
    fs.rmSync(secretStoredResultPath);

    const resultStatusBefore = fingerprintTree(runtimeRoot);
    const resultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const resultStatusAfter = fingerprintTree(runtimeRoot);
    const resultStatusText = `${resultStatus.stdout}\n${resultStatus.stderr}`;
    assert(resultStatus.status === 0, 'status after result exits zero', resultStatusText);
    assert(resultStatusBefore === resultStatusAfter, 'status after result is read-only', resultStatusText);
    const resultStatusOutput = JSON.parse(resultStatus.stdout);
    assert(resultStatusOutput.results.count === 1, 'status reports result count', resultStatusText);
    assert(resultStatusOutput.results.latest.resultId === 'result-001', 'status reports latest result', resultStatusText);
    assert(resultStatusOutput.results.latest.outcome === 'succeeded', 'status reports latest result outcome', resultStatusText);

    const resultListBefore = fingerprintTree(runtimeRoot);
    const resultList = runCli(['workspace', 'list', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const resultListAfter = fingerprintTree(runtimeRoot);
    const resultListText = `${resultList.stdout}\n${resultList.stderr}`;
    assert(resultList.status === 0, 'list after result exits zero', resultListText);
    assert(resultListBefore === resultListAfter, 'list after result is read-only', resultListText);
    const resultListOutput = JSON.parse(resultList.stdout);
    const listedResultSession = resultListOutput.sessions.find((session) => session.sessionId === launchOutput.sessionId);
    assert(listedResultSession?.results.count === 1, 'list reports result count', resultListText);
    assert(listedResultSession?.results.latest.resultId === 'result-001', 'list reports latest result', resultListText);

    const packetHandoffBefore = fingerprintTree(runtimeRoot);
    const packetHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const packetHandoffAfter = fingerprintTree(runtimeRoot);
    const packetHandoffText = `${packetHandoff.stdout}\n${packetHandoff.stderr}`;
    assert(packetHandoff.status === 0, 'handoff after packet exits zero', packetHandoffText);
    assert(packetHandoffBefore === packetHandoffAfter, 'handoff after packet is read-only', packetHandoffText);
    assert(packetHandoff.stdout.startsWith('# BMAD Workspace Handoff'), 'handoff emits raw Markdown heading', packetHandoffText);
    assert(!packetHandoff.stdout.trim().startsWith('{'), 'handoff is not JSON output', packetHandoffText);
    for (const heading of [
      '## Identity',
      '## Status',
      '## Blockers',
      '## Evidence Index',
      '## BMAD Work Packet',
      '## Setup Gate',
      '## Result Ledger',
      '## Worktree Review',
      '## Base Improvement Readiness',
      '## Next BMAD Route',
      '## Read-only Boundary',
    ]) {
      assert(packetHandoff.stdout.includes(heading), `handoff includes ${heading}`, packetHandoffText);
    }
    assert(packetHandoff.stdout.includes(launchOutput.sessionId), 'handoff includes sessionId', packetHandoffText);
    assert(packetHandoff.stdout.includes('packets/bmad-work-packet.json'), 'handoff includes Work Packet ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('packets/rendered-prompt.md'), 'handoff includes rendered prompt ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('routeWorkflow: `bmad-quick-dev`'), 'handoff includes routed workflow', packetHandoffText);
    assert(packetHandoff.stdout.includes('routeSource: `deterministic`'), 'handoff includes route source', packetHandoffText);
    assert(packetHandoff.stdout.includes('result-001'), 'handoff includes result id', packetHandoffText);
    assert(packetHandoff.stdout.includes('outcome=succeeded'), 'handoff includes result outcome', packetHandoffText);
    assert(packetHandoff.stdout.includes('external:zoom-out-thread-note'), 'handoff includes external setup ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('external-unverified'), 'handoff includes external setup warning', packetHandoffText);
    assert(packetHandoff.stdout.includes('SETUP_REF_EXTERNAL_UNVERIFIED'), 'handoff includes status checks', packetHandoffText);
    assert(packetHandoff.stdout.includes('nextManualAction:'), 'handoff includes evidence next manual action', packetHandoffText);
    assert(
      packetHandoff.stdout.includes('Worktree Review has not been created.'),
      'handoff includes missing review blocker',
      packetHandoffText,
    );
    assert(packetHandoff.stdout.includes('`bmad workspace review'), 'handoff recommends deterministic review route', packetHandoffText);
    assert(!packetHandoff.stdout.includes('latest session'), 'handoff does not infer latest session', packetHandoffText);
    assert(!packetHandoff.stdout.includes('merge'), 'handoff avoids merge wording', packetHandoffText);

    const invalidSkipPacket = runCli(
      ['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--skip-setup', 'badStep=nope'],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidSkipPacketText = `${invalidSkipPacket.stdout}\n${invalidSkipPacket.stderr}`;
    assert(invalidSkipPacket.status !== 0, 'packet rejects invalid setup skip step', invalidSkipPacketText);
    assert(invalidSkipPacketText.includes('invalid-session-setup-skip'), 'invalid setup skip names stable error', invalidSkipPacketText);

    section('Workspace Review');

    const cleanReview = runCli(['workspace', 'review', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const cleanReviewText = `${cleanReview.stdout}\n${cleanReview.stderr}`;
    assert(cleanReview.status === 0, 'clean review exits zero', cleanReviewText);
    const cleanReviewOutput = JSON.parse(cleanReview.stdout);
    assertSessionOutput(cleanReviewOutput, 'clean review output');
    assert(fs.existsSync(cleanReviewOutput.summaryPath), 'clean review writes summary.json', cleanReviewText);
    assert(fs.existsSync(cleanReviewOutput.manifestPath), 'clean review writes review-manifest.json', cleanReviewText);
    const cleanSummary = readJson(cleanReviewOutput.summaryPath);
    const cleanManifest = readJson(cleanReviewOutput.manifestPath);
    assert(cleanSummary.clean === true, 'clean review reports clean worktree', JSON.stringify(cleanSummary, null, 2));
    assert(cleanSummary.repos[0].patchPath === null, 'clean review has no patch path', JSON.stringify(cleanSummary, null, 2));
    assert(cleanManifest.kind === 'bmad-workspace-review-manifest', 'review manifest records kind', JSON.stringify(cleanManifest, null, 2));
    assert(cleanManifest.schemaVersion === 1, 'review manifest records schemaVersion 1', JSON.stringify(cleanManifest, null, 2));
    assert(cleanManifest.sessionId === launchOutput.sessionId, 'review manifest records sessionId', JSON.stringify(cleanManifest, null, 2));
    assert(
      cleanManifest.sourceRefs.reviewSummary === 'review/summary.json',
      'review manifest records review summary ref',
      JSON.stringify(cleanManifest, null, 2),
    );
    assert(
      cleanManifest.capabilities.forbidden.includes('restore'),
      'review manifest forbids restore',
      JSON.stringify(cleanManifest, null, 2),
    );
    assert(cleanManifest.decision.status === 'ready', 'clean review manifest is ready', JSON.stringify(cleanManifest, null, 2));

    const reviewedStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reviewedStatusText = `${reviewedStatus.stdout}\n${reviewedStatus.stderr}`;
    assert(reviewedStatus.status === 0, 'status after review exits zero', reviewedStatusText);
    const reviewedStatusOutput = JSON.parse(reviewedStatus.stdout);
    assert(reviewedStatusOutput.review.state === 'present', 'status after review reports review present', reviewedStatusText);
    assert(reviewedStatusOutput.review.manifest.state === 'valid', 'status after review reports review manifest valid', reviewedStatusText);
    assert(reviewedStatusOutput.status === 'ready', 'status after review reports ready', reviewedStatusText);

    const reviewedEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reviewedEvidenceText = `${reviewedEvidence.stdout}\n${reviewedEvidence.stderr}`;
    assert(reviewedEvidence.status === 0, 'evidence after review exits zero', reviewedEvidenceText);
    assert(
      JSON.parse(reviewedEvidence.stdout).artifacts.some((item) => item.kind === 'review-manifest' && item.validationState === 'valid'),
      'evidence after review records review manifest',
      reviewedEvidenceText,
    );

    section('Workspace Closeout');

    const recordCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'closeout-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const recordCloseoutText = `${recordCloseout.stdout}\n${recordCloseout.stderr}`;
    assert(recordCloseout.status === 0, 'valid closeout exits zero', recordCloseoutText);
    const recordCloseoutOutput = JSON.parse(recordCloseout.stdout);
    assertSessionOutput(recordCloseoutOutput, 'closeout output');
    assert(recordCloseoutOutput.closeoutId === 'closeout-001', 'closeout output records closeout id', recordCloseoutText);
    assert(fs.existsSync(recordCloseoutOutput.closeoutPath), 'closeout writes artifact', recordCloseoutText);
    const closeoutArtifact = readJson(recordCloseoutOutput.closeoutPath);
    assert(closeoutArtifact.kind === 'bmad-workspace-closeout', 'closeout records kind', JSON.stringify(closeoutArtifact, null, 2));
    assert(closeoutArtifact.schemaVersion === 1, 'closeout records schemaVersion 1', JSON.stringify(closeoutArtifact, null, 2));
    assert(closeoutArtifact.sessionId === launchOutput.sessionId, 'closeout records sessionId', JSON.stringify(closeoutArtifact, null, 2));
    assert(closeoutArtifact.closeoutId === 'closeout-001', 'closeout records closeoutId', JSON.stringify(closeoutArtifact, null, 2));
    assert(closeoutArtifact.outcome === 'completed', 'closeout records outcome', JSON.stringify(closeoutArtifact, null, 2));
    assert(
      closeoutArtifact.nextAction === 'manual-target-review',
      'closeout records next action',
      JSON.stringify(closeoutArtifact, null, 2),
    );
    assert(
      closeoutArtifact.packetRef === 'packets/bmad-work-packet.json',
      'closeout records packet ref',
      JSON.stringify(closeoutArtifact, null, 2),
    );
    assert(
      closeoutArtifact.executorContractRef === 'packets/executor-contract.json',
      'closeout records executor contract ref',
      JSON.stringify(closeoutArtifact, null, 2),
    );
    assert(closeoutArtifact.reviewRef === 'review/summary.json', 'closeout records review ref', JSON.stringify(closeoutArtifact, null, 2));
    assert(
      closeoutArtifact.reviewManifestRef === 'review/review-manifest.json',
      'closeout records review manifest ref',
      JSON.stringify(closeoutArtifact, null, 2),
    );
    assert(
      closeoutArtifact.resultRefs.includes('results/result-001.json'),
      'closeout records result ref',
      JSON.stringify(closeoutArtifact, null, 2),
    );

    const duplicateCloseout = runCli(
      [
        'workspace',
        'closeout',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'closeout-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const duplicateCloseoutText = `${duplicateCloseout.stdout}\n${duplicateCloseout.stderr}`;
    assert(duplicateCloseout.status !== 0, 'duplicate closeout exits nonzero', duplicateCloseoutText);
    assert(duplicateCloseoutText.includes('CLOSEOUT_EXISTS'), 'duplicate closeout names CLOSEOUT_EXISTS', duplicateCloseoutText);

    const closeoutStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const closeoutStatusText = `${closeoutStatus.stdout}\n${closeoutStatus.stderr}`;
    assert(closeoutStatus.status === 0, 'status after closeout exits zero', closeoutStatusText);
    const closeoutStatusOutput = JSON.parse(closeoutStatus.stdout);
    assert(closeoutStatusOutput.closeout.count === 1, 'status reports closeout count', closeoutStatusText);
    assert(closeoutStatusOutput.closeout.latest.closeoutId === 'closeout-001', 'status reports latest closeout', closeoutStatusText);
    assert(closeoutStatusOutput.closeout.latest.outcome === 'completed', 'status reports latest closeout outcome', closeoutStatusText);
    assert(closeoutStatusOutput.derivedLifecycle === 'closeout-recorded', 'status reports closeout derived lifecycle', closeoutStatusText);

    const closeoutList = runCli(['workspace', 'list', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const closeoutListText = `${closeoutList.stdout}\n${closeoutList.stderr}`;
    assert(closeoutList.status === 0, 'list after closeout exits zero', closeoutListText);
    const closeoutListOutput = JSON.parse(closeoutList.stdout);
    const listedCloseoutSession = closeoutListOutput.sessions.find((session) => session.sessionId === launchOutput.sessionId);
    assert(listedCloseoutSession?.closeout.count === 1, 'list reports closeout count', closeoutListText);
    assert(listedCloseoutSession?.closeout.latest.closeoutId === 'closeout-001', 'list reports latest closeout', closeoutListText);
    assert(listedCloseoutSession?.derivedLifecycle === 'closeout-recorded', 'list reports closeout derived lifecycle', closeoutListText);

    const closeoutHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const closeoutHandoffText = `${closeoutHandoff.stdout}\n${closeoutHandoff.stderr}`;
    assert(closeoutHandoff.status === 0, 'handoff after closeout exits zero', closeoutHandoffText);
    assert(closeoutHandoff.stdout.includes('## Closeout'), 'handoff includes Closeout section', closeoutHandoffText);
    assert(closeoutHandoff.stdout.includes('closeout-001'), 'handoff includes closeout id', closeoutHandoffText);
    assert(closeoutHandoff.stdout.includes('manual-target-review'), 'handoff includes manual closeout guidance', closeoutHandoffText);

    const invalidStoredCloseoutPath = path.join(launchOutput.sessionRoot, 'closeout', 'invalid-closeout.json');
    fs.writeFileSync(invalidStoredCloseoutPath, `${JSON.stringify({ kind: 'not-closeout' }, null, 2)}\n`);
    const invalidCloseoutStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidCloseoutStatusText = `${invalidCloseoutStatus.stdout}\n${invalidCloseoutStatus.stderr}`;
    assert(invalidCloseoutStatus.status === 0, 'status with invalid closeout exits zero', invalidCloseoutStatusText);
    assert(
      JSON.parse(invalidCloseoutStatus.stdout).checks.some((item) => item.code === 'CLOSEOUT_INVALID'),
      'status with invalid closeout names CLOSEOUT_INVALID',
      invalidCloseoutStatusText,
    );
    const invalidCloseoutEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidCloseoutEvidenceText = `${invalidCloseoutEvidence.stdout}\n${invalidCloseoutEvidence.stderr}`;
    assert(invalidCloseoutEvidence.status === 0, 'evidence with invalid closeout exits zero', invalidCloseoutEvidenceText);
    assert(
      JSON.parse(invalidCloseoutEvidence.stdout).checks.some((item) => item.code === 'CLOSEOUT_INVALID'),
      'evidence with invalid closeout names CLOSEOUT_INVALID',
      invalidCloseoutEvidenceText,
    );
    fs.rmSync(invalidStoredCloseoutPath);

    const secretStoredCloseoutPath = path.join(launchOutput.sessionRoot, 'closeout', 'secret-closeout.json');
    fs.writeFileSync(
      secretStoredCloseoutPath,
      `${JSON.stringify({ ...closeoutArtifact, closeoutId: 'secret-closeout', summary: secretToken }, null, 2)}\n`,
    );
    const secretCloseoutStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const secretCloseoutStatusText = `${secretCloseoutStatus.stdout}\n${secretCloseoutStatus.stderr}`;
    assert(secretCloseoutStatus.status === 0, 'status with secret-positive closeout exits zero', secretCloseoutStatusText);
    assert(
      JSON.parse(secretCloseoutStatus.stdout).checks.some((item) => item.code === 'CLOSEOUT_SECRET_DETECTED'),
      'status with secret-positive closeout names CLOSEOUT_SECRET_DETECTED',
      secretCloseoutStatusText,
    );
    assert(!secretCloseoutStatusText.includes(secretToken), 'status with secret-positive closeout is redacted', secretCloseoutStatusText);
    const secretCloseoutEvidence = runCli(['workspace', 'evidence', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const secretCloseoutEvidenceText = `${secretCloseoutEvidence.stdout}\n${secretCloseoutEvidence.stderr}`;
    assert(secretCloseoutEvidence.status === 0, 'evidence with secret-positive closeout exits zero', secretCloseoutEvidenceText);
    assert(
      JSON.parse(secretCloseoutEvidence.stdout).checks.some((item) => item.code === 'CLOSEOUT_SECRET_DETECTED'),
      'evidence with secret-positive closeout names CLOSEOUT_SECRET_DETECTED',
      secretCloseoutEvidenceText,
    );
    assert(
      !secretCloseoutEvidenceText.includes(secretToken),
      'evidence with secret-positive closeout is redacted',
      secretCloseoutEvidenceText,
    );
    fs.rmSync(secretStoredCloseoutPath);

    addMinimalGraphArtifact(secondTargetRepo);
    const noResultIntake = runCli(['workspace', 'intake', multiRepoOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const noResultIntakeText = `${noResultIntake.stdout}\n${noResultIntake.stderr}`;
    assert(noResultIntake.status === 0, 'no-result closeout fixture intake exits zero', noResultIntakeText);
    const noResultPacket = runCli(
      [
        'workspace',
        'packet',
        multiRepoOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/setup-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/setup-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/setup-tdd-plan.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const noResultPacketText = `${noResultPacket.stdout}\n${noResultPacket.stderr}`;
    assert(noResultPacket.status === 0, 'no-result closeout fixture packet exits zero', noResultPacketText);
    const noResultReview = runCli(['workspace', 'review', multiRepoOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const noResultReviewText = `${noResultReview.stdout}\n${noResultReview.stderr}`;
    assert(noResultReview.status === 0, 'no-result closeout fixture review exits zero', noResultReviewText);
    const noResultCloseout = runCli(
      [
        'workspace',
        'closeout',
        multiRepoOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        closeoutCompletedInputPath,
        '--closeout-id',
        'closeout-no-results',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const noResultCloseoutText = `${noResultCloseout.stdout}\n${noResultCloseout.stderr}`;
    assert(noResultCloseout.status === 0, 'valid closeout without results exits zero', noResultCloseoutText);
    const noResultCloseoutArtifact = readJson(JSON.parse(noResultCloseout.stdout).closeoutPath);
    assert(noResultCloseoutArtifact.resultRefs.length === 0, 'closeout without results records empty result refs', noResultCloseoutText);

    const reviewRepoPack = readJson(launchOutput.repoPackPath);
    const worktreeReadme = path.join(reviewRepoPack.repos[0].worktreePath, 'README.md');
    fs.appendFileSync(worktreeReadme, 'Worktree review change.\n');

    const changedReview = runCli(['workspace', 'review', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const changedReviewText = `${changedReview.stdout}\n${changedReview.stderr}`;
    assert(changedReview.status === 0, 'changed review exits zero', changedReviewText);
    const changedReviewOutput = JSON.parse(changedReview.stdout);
    assertSessionOutput(changedReviewOutput, 'changed review output');
    const changedSummary = readJson(changedReviewOutput.summaryPath);
    assert(changedSummary.clean === false, 'changed review reports dirty worktree', JSON.stringify(changedSummary, null, 2));
    assert(
      changedSummary.repos[0].changedFiles.includes('README.md'),
      'changed review records changed file',
      JSON.stringify(changedSummary, null, 2),
    );
    assert(
      fs.existsSync(changedSummary.repos[0].statusPath),
      'changed review writes per-repo status.json',
      JSON.stringify(changedSummary, null, 2),
    );
    assert(fs.existsSync(changedSummary.repos[0].patchPath), 'changed review writes diff.patch', JSON.stringify(changedSummary, null, 2));
    const reviewPatch = fs.readFileSync(changedSummary.repos[0].patchPath, 'utf8');
    assert(reviewPatch.includes('Worktree review change.'), 'changed review patch includes worktree diff');
    const changedManifest = readJson(changedReviewOutput.manifestPath);
    assert(
      changedManifest.decision.status === 'needs_human_review',
      'changed review manifest needs human review',
      JSON.stringify(changedManifest, null, 2),
    );
    assert(
      changedManifest.findings.some((finding) => finding.id === 'worktree-changes-present'),
      'changed review manifest records finding',
      JSON.stringify(changedManifest, null, 2),
    );

    section('Workspace Archive');

    const archiveRoot = path.join(tempRoot, 'session-archive');
    const beforeArchiveRuntime = fingerprintTree(runtimeRoot);
    const beforeArchiveTarget = fingerprintTree(targetRepo.path);
    const archive = runCli(['workspace', 'archive', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', archiveRoot], {
      cwd: baseRepo.path,
    });
    const archiveText = `${archive.stdout}\n${archive.stderr}`;
    const afterArchiveRuntime = fingerprintTree(runtimeRoot);
    const afterArchiveTarget = fingerprintTree(targetRepo.path);
    assert(archive.status === 0, 'archive reviewed session exits zero', archiveText);
    assert(beforeArchiveRuntime === afterArchiveRuntime, 'archive does not mutate runtime root', archiveText);
    assert(beforeArchiveTarget === afterArchiveTarget, 'archive does not mutate target repo', archiveText);
    const archiveOutput = JSON.parse(archive.stdout);
    assert(archiveOutput.sessionId === launchOutput.sessionId, 'archive output records sessionId', archiveText);
    assert(archiveOutput.archiveRoot === archiveRoot, 'archive output records exact output root', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'manifest.json')), 'archive writes manifest.json', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'checksums.sha256')), 'archive writes checksums.sha256', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'status.json')), 'archive writes status.json', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'evidence-index.json')), 'archive writes evidence-index.json', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'handoff.md')), 'archive writes handoff.md', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'closeout.md')), 'archive writes closeout.md', archiveText);
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'packets', 'bmad-work-packet.json')),
      'archive copies Work Packet',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'packets', 'executor-contract.json')),
      'archive copies executor contract',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'intake', 'graph.json')),
      'archive copies graph evidence',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'review', 'summary.json')),
      'archive copies review summary',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'review', 'review-manifest.json')),
      'archive copies review manifest',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'review', 'repo-1', 'diff.patch')),
      'archive copies review patch',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'results', 'result-001.json')),
      'archive copies result artifact',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'closeout', 'closeout-001.json')),
      'archive copies closeout artifact',
      archiveText,
    );
    assert(!fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'worktrees')), 'archive does not copy worktrees', archiveText);
    assert(
      !fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'docs', 'workspace', 'setup-zoom-out.md')),
      'archive does not copy setup evidence files',
      archiveText,
    );

    const manifest = readJson(path.join(archiveRoot, 'manifest.json'));
    assert(manifest.schemaVersion === 1, 'archive manifest records schemaVersion 1', JSON.stringify(manifest, null, 2));
    assert(manifest.archiveVersion === 2, 'archive manifest records archiveVersion 2', JSON.stringify(manifest, null, 2));
    assert(manifest.sessionId === launchOutput.sessionId, 'archive manifest records sessionId', JSON.stringify(manifest, null, 2));
    assert(manifest.statusRef === 'status.json', 'archive manifest records status ref', JSON.stringify(manifest, null, 2));
    assert(
      manifest.evidenceIndexRef === 'evidence-index.json',
      'archive manifest records evidence index ref',
      JSON.stringify(manifest, null, 2),
    );
    assert(manifest.handoffRef === 'handoff.md', 'archive manifest records handoff ref', JSON.stringify(manifest, null, 2));
    assert(manifest.closeoutRef === 'closeout.md', 'archive manifest records closeout ref', JSON.stringify(manifest, null, 2));
    assert(
      manifest.artifacts.executorContract.present === true,
      'archive manifest records executor contract artifact',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifest.artifacts.graphEvidence.present === true,
      'archive manifest records graph evidence artifact',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifest.artifacts.reviewManifest.present === true,
      'archive manifest records review manifest artifact',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifest.artifacts.closeouts.some((entry) => entry.closeout.present === true),
      'archive manifest records closeout artifact',
      JSON.stringify(manifest, null, 2),
    );
    const manifestPaths = manifest.files.map((file) => file.path);
    assert(
      JSON.stringify(manifestPaths) === JSON.stringify([...manifestPaths].sort()),
      'archive manifest file list is sorted',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifest.files.every((file) => file.sha256?.length === 64 && Number.isInteger(file.bytes)),
      'archive manifest records sha256 and byte sizes',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifestPaths.every((filePath) => !path.isAbsolute(filePath) && !filePath.includes('..') && !filePath.includes('\\')),
      'archive manifest uses safe POSIX relative paths',
      JSON.stringify(manifest, null, 2),
    );

    const archivedPacket = readJson(path.join(archiveRoot, 'session-artifacts', 'packets', 'bmad-work-packet.json'));
    assert(
      archivedPacket.sessionSetup.zoomOut.ref === 'external:zoom-out-thread-note',
      'archive preserves setup ref provenance',
      JSON.stringify(archivedPacket, null, 2),
    );
    assert(
      archivedPacket.sessionSetup.ubiquitousLanguage.sha256 === sha256File(path.join(baseRepo.path, 'UBIQUITOUS_LANGUAGE.md')),
      'archive preserves local setup checksum metadata',
      JSON.stringify(archivedPacket, null, 2),
    );
    const archivedStatus = readJson(path.join(archiveRoot, 'status.json'));
    const archivedEvidence = readJson(path.join(archiveRoot, 'evidence-index.json'));
    assert(archivedEvidence.schemaVersion === 1, 'archive evidence records schemaVersion 1', JSON.stringify(archivedEvidence, null, 2));
    assert(
      archivedEvidence.sessionId === launchOutput.sessionId,
      'archive evidence records sessionId',
      JSON.stringify(archivedEvidence, null, 2),
    );
    assert(
      archivedEvidence.artifacts.some((item) => item.kind === 'work-packet' && item.sha256),
      'archive evidence preserves packet checksum',
      JSON.stringify(archivedEvidence, null, 2),
    );
    assert(
      archivedEvidence.artifacts.some((item) => item.kind === 'review-manifest' && item.sha256),
      'archive evidence preserves review manifest checksum',
      JSON.stringify(archivedEvidence, null, 2),
    );
    assert(
      archivedEvidence.artifacts.some((item) => item.kind === 'graph-evidence' && item.sha256),
      'archive evidence preserves graph evidence checksum',
      JSON.stringify(archivedEvidence, null, 2),
    );
    assert(
      archivedEvidence.checks.every((item) => typeof item.nextManualAction === 'string'),
      'archive evidence preserves next manual actions',
      JSON.stringify(archivedEvidence, null, 2),
    );
    assert(
      archivedStatus.routing.selectedWorkflow === 'bmad-quick-dev',
      'archive status preserves routed workflow',
      JSON.stringify(archivedStatus, null, 2),
    );
    assert(
      archivedStatus.executorContract.state === 'valid',
      'archive status preserves executor contract state',
      JSON.stringify(archivedStatus, null, 2),
    );
    assert(archivedStatus.results.count === 1, 'archive status preserves result count', JSON.stringify(archivedStatus, null, 2));
    assert(archivedStatus.closeout.count === 1, 'archive status preserves closeout count', JSON.stringify(archivedStatus, null, 2));
    assert(
      archivedStatus.derivedLifecycle === 'closeout-recorded',
      'archive status preserves closeout lifecycle',
      JSON.stringify(archivedStatus, null, 2),
    );
    const archivedExecutorContract = readJson(path.join(archiveRoot, 'session-artifacts', 'packets', 'executor-contract.json'));
    assert(
      archivedExecutorContract.executionMode === 'manual',
      'archive preserves executor contract execution mode',
      JSON.stringify(archivedExecutorContract, null, 2),
    );
    const archivedResult = readJson(path.join(archiveRoot, 'session-artifacts', 'results', 'result-001.json'));
    assert(archivedResult.outcome === 'succeeded', 'archive preserves result outcome', JSON.stringify(archivedResult, null, 2));
    const archivedCloseout = readJson(path.join(archiveRoot, 'session-artifacts', 'closeout', 'closeout-001.json'));
    assert(archivedCloseout.outcome === 'completed', 'archive preserves closeout outcome', JSON.stringify(archivedCloseout, null, 2));
    const archiveCloseoutMarkdown = fs.readFileSync(path.join(archiveRoot, 'closeout.md'), 'utf8');
    assert(
      archiveCloseoutMarkdown.includes('latestCloseout'),
      'archive closeout markdown mentions latest closeout',
      archiveCloseoutMarkdown,
    );

    const archiveCollision = runCli(
      ['workspace', 'archive', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', archiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const archiveCollisionText = `${archiveCollision.stdout}\n${archiveCollision.stderr}`;
    assert(archiveCollision.status !== 0, 'archive output collision exits nonzero', archiveCollisionText);
    assert(
      archiveCollisionText.includes('ARCHIVE_OUTPUT_EXISTS'),
      'archive output collision names ARCHIVE_OUTPUT_EXISTS',
      archiveCollisionText,
    );

    const beforeVerifyArchive = fingerprintTree(archiveRoot);
    const verifyArchive = runCli(['workspace', 'verify-archive', archiveRoot], {
      cwd: baseRepo.path,
    });
    const verifyArchiveText = `${verifyArchive.stdout}\n${verifyArchive.stderr}`;
    const afterVerifyArchive = fingerprintTree(archiveRoot);
    assert(verifyArchive.status === 0, 'verify-archive clean archive exits zero', verifyArchiveText);
    assert(beforeVerifyArchive === afterVerifyArchive, 'verify-archive is read-only', verifyArchiveText);
    const verifyOutput = JSON.parse(verifyArchive.stdout);
    assert(verifyOutput.ok === true, 'verify-archive reports ok true', verifyArchiveText);
    assert(verifyOutput.archiveVersion === 2, 'verify-archive reports archiveVersion 2', verifyArchiveText);

    const unknownFieldArchiveRoot = path.join(tempRoot, 'archive-unknown-field');
    copyTree(archiveRoot, unknownFieldArchiveRoot);
    const unknownFieldManifestPath = path.join(unknownFieldArchiveRoot, 'manifest.json');
    const unknownFieldManifest = readJson(unknownFieldManifestPath);
    unknownFieldManifest.unexpectedField = true;
    fs.writeFileSync(unknownFieldManifestPath, `${JSON.stringify(unknownFieldManifest, null, 2)}\n`);
    const verifyUnknownFieldArchive = runCli(['workspace', 'verify-archive', unknownFieldArchiveRoot], {
      cwd: baseRepo.path,
    });
    const verifyUnknownFieldArchiveText = `${verifyUnknownFieldArchive.stdout}\n${verifyUnknownFieldArchive.stderr}`;
    assert(verifyUnknownFieldArchive.status !== 0, 'verify-archive rejects unknown manifest field', verifyUnknownFieldArchiveText);
    assert(
      verifyUnknownFieldArchiveText.includes('ARCHIVE_MANIFEST_INVALID') && verifyUnknownFieldArchiveText.includes('unexpectedField'),
      'verify-archive unknown manifest field names field',
      verifyUnknownFieldArchiveText,
    );

    const invalidManifestArchiveRoot = path.join(tempRoot, 'archive-invalid-manifest');
    copyTree(archiveRoot, invalidManifestArchiveRoot);
    const invalidManifestPath = path.join(invalidManifestArchiveRoot, 'manifest.json');
    const contractMismatchManifest = readJson(invalidManifestPath);
    contractMismatchManifest.archiveVersion = 'current-contract-mismatch';
    fs.writeFileSync(invalidManifestPath, `${JSON.stringify(contractMismatchManifest, null, 2)}\n`);
    rewriteArchiveChecksums(invalidManifestArchiveRoot);
    const verifyInvalidManifestArchive = runCli(['workspace', 'verify-archive', invalidManifestArchiveRoot], {
      cwd: baseRepo.path,
    });
    const verifyInvalidManifestArchiveText = `${verifyInvalidManifestArchive.stdout}\n${verifyInvalidManifestArchive.stderr}`;
    assert(verifyInvalidManifestArchive.status !== 0, 'verify-archive rejects invalid archive manifest', verifyInvalidManifestArchiveText);
    assert(
      verifyInvalidManifestArchiveText.includes('ARCHIVE_MANIFEST_INVALID'),
      'verify-archive invalid manifest names stable error',
      verifyInvalidManifestArchiveText,
    );

    section('Workspace Diff');

    const diffMissingSources = runCli(['workspace', 'diff', '--left', archiveRoot], {
      cwd: baseRepo.path,
    });
    const diffMissingSourcesText = `${diffMissingSources.stdout}\n${diffMissingSources.stderr}`;
    assert(diffMissingSources.status !== 0, 'diff without both sources exits nonzero', diffMissingSourcesText);
    assert(diffMissingSourcesText.includes('DIFF_SOURCE_REQUIRED'), 'diff missing source names stable error', diffMissingSourcesText);

    const diffMissingArchive = runCli(
      ['workspace', 'diff', '--left', archiveRoot, '--right', path.join(tempRoot, 'missing-diff-archive')],
      {
        cwd: baseRepo.path,
      },
    );
    const diffMissingArchiveText = `${diffMissingArchive.stdout}\n${diffMissingArchive.stderr}`;
    assert(diffMissingArchive.status !== 0, 'diff missing archive exits nonzero', diffMissingArchiveText);
    assert(diffMissingArchiveText.includes('DIFF_SOURCE_NOT_FOUND'), 'diff missing archive names stable error', diffMissingArchiveText);

    const diffLiveSession = runCli(['workspace', 'diff', '--left', archiveRoot, '--right', launchOutput.sessionRoot], {
      cwd: baseRepo.path,
    });
    const diffLiveSessionText = `${diffLiveSession.stdout}\n${diffLiveSession.stderr}`;
    assert(diffLiveSession.status !== 0, 'diff live session path exits nonzero', diffLiveSessionText);
    assert(diffLiveSessionText.includes('DIFF_SOURCE_UNSUPPORTED'), 'diff live session path names stable error', diffLiveSessionText);

    const diffUrlSource = runCli(['workspace', 'diff', '--left', archiveRoot, '--right', 'https://example.com/archive'], {
      cwd: baseRepo.path,
    });
    const diffUrlSourceText = `${diffUrlSource.stdout}\n${diffUrlSource.stderr}`;
    assert(diffUrlSource.status !== 0, 'diff URL source exits nonzero', diffUrlSourceText);
    assert(diffUrlSourceText.includes('DIFF_SOURCE_UNSUPPORTED'), 'diff URL source names stable error', diffUrlSourceText);

    const identicalArchiveRoot = path.join(tempRoot, 'identical-diff-archive');
    copyTree(archiveRoot, identicalArchiveRoot);
    const beforeIdenticalLeft = fingerprintTree(archiveRoot);
    const beforeIdenticalRight = fingerprintTree(identicalArchiveRoot);
    const identicalDiff = runCli(['workspace', 'diff', '--left', archiveRoot, '--right', identicalArchiveRoot], {
      cwd: baseRepo.path,
    });
    const afterIdenticalLeft = fingerprintTree(archiveRoot);
    const afterIdenticalRight = fingerprintTree(identicalArchiveRoot);
    const identicalDiffText = `${identicalDiff.stdout}\n${identicalDiff.stderr}`;
    assert(identicalDiff.status === 0, 'diff identical archives exits zero', identicalDiffText);
    assert(beforeIdenticalLeft === afterIdenticalLeft, 'diff leaves left archive unchanged', identicalDiffText);
    assert(beforeIdenticalRight === afterIdenticalRight, 'diff leaves right archive unchanged', identicalDiffText);
    const identicalDiffOutput = JSON.parse(identicalDiff.stdout);
    assert(identicalDiffOutput.schemaVersion === 1, 'diff output records schemaVersion 1', identicalDiffText);
    assert(identicalDiffOutput.diffVersion === 1, 'diff output records diffVersion 1', identicalDiffText);
    assert(identicalDiffOutput.summary.changed === false, 'diff identical archives reports no changes', identicalDiffText);
    assert(identicalDiffOutput.fileDeltas.changed.length === 0, 'diff identical archives has no changed files', identicalDiffText);
    assert(identicalDiffOutput.evidenceDeltas.state === 'compared', 'diff current evidence is compared', identicalDiffText);

    const changedArchiveRoot = path.join(tempRoot, 'changed-diff-archive');
    copyTree(archiveRoot, changedArchiveRoot);
    const changedStatusPath = path.join(changedArchiveRoot, 'status.json');
    const changedStatus = readJson(changedStatusPath);
    changedStatus.status = 'changed-for-diff';
    fs.writeFileSync(changedStatusPath, `${JSON.stringify(changedStatus, null, 2)}\n`);
    rewriteArchiveChecksums(changedArchiveRoot);
    const changedDiff = runCli(['workspace', 'diff', '--left', archiveRoot, '--right', changedArchiveRoot], {
      cwd: baseRepo.path,
    });
    const changedDiffText = `${changedDiff.stdout}\n${changedDiff.stderr}`;
    assert(changedDiff.status === 0, 'diff changed archive exits zero', changedDiffText);
    const changedDiffOutput = JSON.parse(changedDiff.stdout);
    assert(changedDiffOutput.summary.changed === true, 'diff changed archive reports changes', changedDiffText);
    assert(
      changedDiffOutput.fileDeltas.changed.some((item) => item.path === 'status.json'),
      'diff reports changed file path',
      changedDiffText,
    );
    assert(
      changedDiffOutput.statusDeltas.changed.some((item) => item.path === 'status'),
      'diff reports changed status value',
      changedDiffText,
    );

    const addedRemovedLeftRoot = path.join(tempRoot, 'added-removed-left-archive');
    const addedRemovedRightRoot = path.join(tempRoot, 'added-removed-right-archive');
    copyTree(archiveRoot, addedRemovedLeftRoot);
    copyTree(archiveRoot, addedRemovedRightRoot);
    addArchiveFile(addedRemovedLeftRoot, 'left-only.txt', 'left only\n');
    addArchiveFile(addedRemovedRightRoot, 'right-only.txt', 'right only\n');
    const addedRemovedDiff = runCli(['workspace', 'diff', '--left', addedRemovedLeftRoot, '--right', addedRemovedRightRoot], {
      cwd: baseRepo.path,
    });
    const addedRemovedDiffText = `${addedRemovedDiff.stdout}\n${addedRemovedDiff.stderr}`;
    assert(addedRemovedDiff.status === 0, 'diff added and removed files exits zero', addedRemovedDiffText);
    const addedRemovedDiffOutput = JSON.parse(addedRemovedDiff.stdout);
    assert(
      addedRemovedDiffOutput.fileDeltas.added.some((item) => item.path === 'right-only.txt'),
      'diff reports added file path',
      addedRemovedDiffText,
    );
    assert(
      addedRemovedDiffOutput.fileDeltas.removed.some((item) => item.path === 'left-only.txt'),
      'diff reports removed file path',
      addedRemovedDiffText,
    );

    const invalidManifestCurrentDiff = runCli(['workspace', 'diff', '--left', invalidManifestArchiveRoot, '--right', archiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidManifestCurrentDiffText = `${invalidManifestCurrentDiff.stdout}\n${invalidManifestCurrentDiff.stderr}`;
    assert(invalidManifestCurrentDiff.status !== 0, 'diff rejects invalid archive manifest', invalidManifestCurrentDiffText);
    assert(
      invalidManifestCurrentDiffText.includes('DIFF_ARCHIVE_INVALID') &&
        invalidManifestCurrentDiffText.includes('ARCHIVE_MANIFEST_INVALID'),
      'diff invalid manifest names invalid archive',
      invalidManifestCurrentDiffText,
    );

    const invalidExecutorArchiveRoot = path.join(tempRoot, 'invalid-executor-archive');
    copyTree(archiveRoot, invalidExecutorArchiveRoot);
    const invalidArchivedExecutorPath = path.join(invalidExecutorArchiveRoot, 'session-artifacts', 'packets', 'executor-contract.json');
    fs.writeFileSync(invalidArchivedExecutorPath, `${JSON.stringify({ kind: 'not-executor-contract' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidExecutorArchiveRoot);
    const invalidExecutorArchive = runCli(['workspace', 'verify-archive', invalidExecutorArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidExecutorArchiveText = `${invalidExecutorArchive.stdout}\n${invalidExecutorArchive.stderr}`;
    assert(invalidExecutorArchive.status !== 0, 'verify-archive invalid executor contract exits nonzero', invalidExecutorArchiveText);
    assert(
      invalidExecutorArchiveText.includes('ARCHIVE_EXECUTOR_CONTRACT_INVALID'),
      'verify-archive invalid executor contract names stable error',
      invalidExecutorArchiveText,
    );

    const invalidResultArchiveRoot = path.join(tempRoot, 'invalid-result-archive');
    copyTree(archiveRoot, invalidResultArchiveRoot);
    const invalidArchivedResultPath = path.join(invalidResultArchiveRoot, 'session-artifacts', 'results', 'result-001.json');
    fs.writeFileSync(invalidArchivedResultPath, `${JSON.stringify({ kind: 'not-a-result' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidResultArchiveRoot);
    const invalidResultArchive = runCli(['workspace', 'verify-archive', invalidResultArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidResultArchiveText = `${invalidResultArchive.stdout}\n${invalidResultArchive.stderr}`;
    assert(invalidResultArchive.status !== 0, 'verify-archive invalid result shape exits nonzero', invalidResultArchiveText);
    assert(
      invalidResultArchiveText.includes('ARCHIVE_RESULT_INVALID'),
      'verify-archive invalid result shape names ARCHIVE_RESULT_INVALID',
      invalidResultArchiveText,
    );

    const invalidCloseoutArchiveRoot = path.join(tempRoot, 'invalid-closeout-archive');
    copyTree(archiveRoot, invalidCloseoutArchiveRoot);
    const invalidArchivedCloseoutPath = path.join(invalidCloseoutArchiveRoot, 'session-artifacts', 'closeout', 'closeout-001.json');
    fs.writeFileSync(invalidArchivedCloseoutPath, `${JSON.stringify({ kind: 'not-a-closeout' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidCloseoutArchiveRoot);
    const invalidCloseoutArchive = runCli(['workspace', 'verify-archive', invalidCloseoutArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidCloseoutArchiveText = `${invalidCloseoutArchive.stdout}\n${invalidCloseoutArchive.stderr}`;
    assert(invalidCloseoutArchive.status !== 0, 'verify-archive invalid closeout shape exits nonzero', invalidCloseoutArchiveText);
    assert(
      invalidCloseoutArchiveText.includes('ARCHIVE_CLOSEOUT_INVALID'),
      'verify-archive invalid closeout shape names ARCHIVE_CLOSEOUT_INVALID',
      invalidCloseoutArchiveText,
    );

    const invalidEvidenceArchiveRoot = path.join(tempRoot, 'invalid-evidence-archive');
    copyTree(archiveRoot, invalidEvidenceArchiveRoot);
    const invalidArchivedEvidencePath = path.join(invalidEvidenceArchiveRoot, 'evidence-index.json');
    fs.writeFileSync(invalidArchivedEvidencePath, `${JSON.stringify({ kind: 'not-evidence-index' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidEvidenceArchiveRoot);
    const invalidEvidenceArchive = runCli(['workspace', 'verify-archive', invalidEvidenceArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidEvidenceArchiveText = `${invalidEvidenceArchive.stdout}\n${invalidEvidenceArchive.stderr}`;
    assert(invalidEvidenceArchive.status !== 0, 'verify-archive invalid evidence index exits nonzero', invalidEvidenceArchiveText);
    assert(
      invalidEvidenceArchiveText.includes('ARCHIVE_EVIDENCE_INDEX_INVALID'),
      'verify-archive invalid evidence index names stable error',
      invalidEvidenceArchiveText,
    );

    const missingEvidenceArchiveRoot = path.join(tempRoot, 'missing-evidence-archive');
    copyTree(archiveRoot, missingEvidenceArchiveRoot);
    fs.rmSync(path.join(missingEvidenceArchiveRoot, 'evidence-index.json'));
    const missingEvidenceArchive = runCli(['workspace', 'verify-archive', missingEvidenceArchiveRoot], {
      cwd: baseRepo.path,
    });
    const missingEvidenceArchiveText = `${missingEvidenceArchive.stdout}\n${missingEvidenceArchive.stderr}`;
    assert(missingEvidenceArchive.status !== 0, 'verify-archive missing evidence index exits nonzero', missingEvidenceArchiveText);
    assert(
      missingEvidenceArchiveText.includes('ARCHIVE_FILE_MISSING') && missingEvidenceArchiveText.includes('evidence-index.json'),
      'verify-archive missing evidence index names stable error',
      missingEvidenceArchiveText,
    );

    const invalidReviewManifestArchiveRoot = path.join(tempRoot, 'invalid-review-manifest-archive');
    copyTree(archiveRoot, invalidReviewManifestArchiveRoot);
    const invalidArchivedReviewManifestPath = path.join(
      invalidReviewManifestArchiveRoot,
      'session-artifacts',
      'review',
      'review-manifest.json',
    );
    fs.writeFileSync(invalidArchivedReviewManifestPath, `${JSON.stringify({ kind: 'not-review-manifest' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidReviewManifestArchiveRoot);
    const invalidReviewManifestArchive = runCli(['workspace', 'verify-archive', invalidReviewManifestArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidReviewManifestArchiveText = `${invalidReviewManifestArchive.stdout}\n${invalidReviewManifestArchive.stderr}`;
    assert(
      invalidReviewManifestArchive.status !== 0,
      'verify-archive invalid review manifest exits nonzero',
      invalidReviewManifestArchiveText,
    );
    assert(
      invalidReviewManifestArchiveText.includes('ARCHIVE_REVIEW_MANIFEST_INVALID'),
      'verify-archive invalid review manifest names stable error',
      invalidReviewManifestArchiveText,
    );

    const invalidEvidenceDiff = runCli(['workspace', 'diff', '--left', archiveRoot, '--right', invalidEvidenceArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidEvidenceDiffText = `${invalidEvidenceDiff.stdout}\n${invalidEvidenceDiff.stderr}`;
    assert(invalidEvidenceDiff.status !== 0, 'diff invalid archive exits nonzero', invalidEvidenceDiffText);
    assert(invalidEvidenceDiffText.includes('DIFF_ARCHIVE_INVALID'), 'diff invalid archive names stable error', invalidEvidenceDiffText);

    const duplicatePathArchiveRoot = path.join(tempRoot, 'duplicate-path-archive');
    copyTree(archiveRoot, duplicatePathArchiveRoot);
    const duplicateManifestPath = path.join(duplicatePathArchiveRoot, 'manifest.json');
    const duplicateManifest = readJson(duplicateManifestPath);
    duplicateManifest.files.push({ ...duplicateManifest.files[0] });
    fs.writeFileSync(duplicateManifestPath, `${JSON.stringify(duplicateManifest, null, 2)}\n`);
    const duplicatePathArchive = runCli(['workspace', 'verify-archive', duplicatePathArchiveRoot], {
      cwd: baseRepo.path,
    });
    const duplicatePathArchiveText = `${duplicatePathArchive.stdout}\n${duplicatePathArchive.stderr}`;
    assert(duplicatePathArchive.status !== 0, 'verify-archive duplicate manifest path exits nonzero', duplicatePathArchiveText);
    assert(
      duplicatePathArchiveText.includes('ARCHIVE_MANIFEST_INVALID'),
      'verify-archive duplicate manifest path names stable error',
      duplicatePathArchiveText,
    );

    const archivedStatusPath = path.join(archiveRoot, 'status.json');
    const originalArchivedStatus = fs.readFileSync(archivedStatusPath, 'utf8');
    fs.appendFileSync(archivedStatusPath, 'tamper\n');
    const tamperedArchive = runCli(['workspace', 'verify-archive', archiveRoot], {
      cwd: baseRepo.path,
    });
    const tamperedArchiveText = `${tamperedArchive.stdout}\n${tamperedArchive.stderr}`;
    assert(tamperedArchive.status !== 0, 'verify-archive tampered file exits nonzero', tamperedArchiveText);
    assert(
      tamperedArchiveText.includes('ARCHIVE_CHECKSUM_MISMATCH'),
      'verify-archive tampered file names ARCHIVE_CHECKSUM_MISMATCH',
      tamperedArchiveText,
    );
    fs.writeFileSync(archivedStatusPath, originalArchivedStatus);

    const unsafeArchiveRoot = path.join(tempRoot, 'unsafe-archive');
    copyTree(archiveRoot, unsafeArchiveRoot);
    const unsafeManifest = readJson(path.join(unsafeArchiveRoot, 'manifest.json'));
    unsafeManifest.files[0].path = '../escape.txt';
    fs.writeFileSync(path.join(unsafeArchiveRoot, 'manifest.json'), `${JSON.stringify(unsafeManifest, null, 2)}\n`);
    const unsafeArchive = runCli(['workspace', 'verify-archive', unsafeArchiveRoot], {
      cwd: baseRepo.path,
    });
    const unsafeArchiveText = `${unsafeArchive.stdout}\n${unsafeArchive.stderr}`;
    assert(unsafeArchive.status !== 0, 'verify-archive unsafe path exits nonzero', unsafeArchiveText);
    assert(unsafeArchiveText.includes('ARCHIVE_UNSAFE_PATH'), 'verify-archive unsafe path names ARCHIVE_UNSAFE_PATH', unsafeArchiveText);

    const symlinkUnsafeArchiveRoot = path.join(tempRoot, 'symlink-unsafe-archive');
    copyTree(archiveRoot, symlinkUnsafeArchiveRoot);
    const symlinkArchiveEscapeRoot = path.join(tempRoot, 'archive-symlink-escape');
    fs.mkdirSync(symlinkArchiveEscapeRoot, { recursive: true });
    fs.writeFileSync(path.join(symlinkArchiveEscapeRoot, 'outside.txt'), 'outside archive boundary\n');
    fs.symlinkSync(symlinkArchiveEscapeRoot, path.join(symlinkUnsafeArchiveRoot, 'escape-link'), 'dir');
    const symlinkUnsafeManifest = readJson(path.join(symlinkUnsafeArchiveRoot, 'manifest.json'));
    symlinkUnsafeManifest.files.push({
      path: 'escape-link/outside.txt',
      sha256: sha256File(path.join(symlinkArchiveEscapeRoot, 'outside.txt')),
      bytes: fs.statSync(path.join(symlinkArchiveEscapeRoot, 'outside.txt')).size,
    });
    symlinkUnsafeManifest.files.sort((left, right) => left.path.localeCompare(right.path));
    fs.writeFileSync(path.join(symlinkUnsafeArchiveRoot, 'manifest.json'), `${JSON.stringify(symlinkUnsafeManifest, null, 2)}\n`);
    const symlinkUnsafeArchive = runCli(['workspace', 'verify-archive', symlinkUnsafeArchiveRoot], {
      cwd: baseRepo.path,
    });
    const symlinkUnsafeArchiveText = `${symlinkUnsafeArchive.stdout}\n${symlinkUnsafeArchive.stderr}`;
    assert(symlinkUnsafeArchive.status !== 0, 'verify-archive symlink escape exits nonzero', symlinkUnsafeArchiveText);
    assert(
      symlinkUnsafeArchiveText.includes('ARCHIVE_UNSAFE_PATH'),
      'verify-archive symlink escape names ARCHIVE_UNSAFE_PATH',
      symlinkUnsafeArchiveText,
    );

    section('Workspace Destroy');

    const cleanDestroyLaunch = runCli(
      ['workspace', 'launch', '--repo', targetRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const cleanDestroyLaunchText = `${cleanDestroyLaunch.stdout}\n${cleanDestroyLaunch.stderr}`;
    assert(cleanDestroyLaunch.status === 0, 'destroy fixture launch exits zero', cleanDestroyLaunchText);
    const cleanDestroySession = JSON.parse(cleanDestroyLaunch.stdout);
    assertSessionOutput(cleanDestroySession, 'destroy fixture launch output');
    const cleanDestroyRepoPackPath = path.join(cleanDestroySession.sessionRoot, 'repo-pack.json');
    const cleanDestroyRepoPack = readJson(cleanDestroyRepoPackPath);
    const originalDestroyRepoPack = JSON.stringify(cleanDestroyRepoPack, null, 2);
    const outsideDestroyRoot = path.join(tempRoot, 'outside-destroy-root');
    fs.mkdirSync(outsideDestroyRoot, { recursive: true });
    cleanDestroyRepoPack.repos[0].worktreePath = outsideDestroyRoot;
    fs.writeFileSync(cleanDestroyRepoPackPath, `${JSON.stringify(cleanDestroyRepoPack, null, 2)}\n`);
    const unsafeDestroy = runCli(['workspace', 'destroy', cleanDestroySession.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const unsafeDestroyText = `${unsafeDestroy.stdout}\n${unsafeDestroy.stderr}`;
    assert(unsafeDestroy.status !== 0, 'destroy rejects worktree path outside session root', unsafeDestroyText);
    assert(unsafeDestroyText.includes('DESTROY_UNSAFE_PATH'), 'destroy unsafe worktree names DESTROY_UNSAFE_PATH', unsafeDestroyText);
    assert(fs.existsSync(cleanDestroySession.sessionRoot), 'destroy unsafe worktree keeps session root', unsafeDestroyText);
    assert(fs.existsSync(outsideDestroyRoot), 'destroy unsafe worktree preserves outside path', unsafeDestroyText);
    fs.writeFileSync(cleanDestroyRepoPackPath, `${originalDestroyRepoPack}\n`);
    const destroy = runCli(['workspace', 'destroy', cleanDestroySession.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const destroyText = `${destroy.stdout}\n${destroy.stderr}`;
    assert(destroy.status === 0, 'destroy exits zero', destroyText);
    const destroyOutput = JSON.parse(destroy.stdout);
    assertSessionOutput(destroyOutput, 'destroy output');
    assert(destroyOutput.removed === true, 'destroy reports removal', destroyText);
    assert(!fs.existsSync(cleanDestroySession.sessionRoot), 'destroy removes session root', destroyText);
    assert(git(['rev-parse', 'HEAD'], targetRepo.path) === newTargetHead, 'destroy preserves source repo HEAD');

    const keepReviewDestroy = runCli(['workspace', 'destroy', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--keep-review'], {
      cwd: baseRepo.path,
    });
    const keepReviewDestroyText = `${keepReviewDestroy.stdout}\n${keepReviewDestroy.stderr}`;
    assert(keepReviewDestroy.status === 0, 'destroy --keep-review exits zero', keepReviewDestroyText);
    const keepReviewOutput = JSON.parse(keepReviewDestroy.stdout);
    assertSessionOutput(keepReviewOutput, 'destroy --keep-review output');
    assert(!fs.existsSync(launchOutput.sessionRoot), 'destroy --keep-review removes session root', keepReviewDestroyText);
    assert(fs.existsSync(keepReviewOutput.retainedReviewPath), 'destroy --keep-review retains review artifacts', keepReviewDestroyText);
    assert(
      fs.existsSync(path.join(keepReviewOutput.retainedReviewPath, 'repo-1', 'diff.patch')),
      'destroy --keep-review retains per-repo patch',
      keepReviewDestroyText,
    );
  } catch (error) {
    assert(false, 'workspace command emits parseable session JSON', error.message);
  } finally {
    removeSessionWorktrees(launchOutput);
    removeSessionWorktrees(multiRepoOutput);
    removeSessionWorktrees(baseImprovementOutput);
    removeSessionWorktrees(sessionLaunchOutput);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

function removeSessionWorktrees(sessionOutput) {
  if (!sessionOutput?.repoPackPath || !fs.existsSync(sessionOutput.repoPackPath)) {
    return;
  }

  const repoPack = readJson(sessionOutput.repoPackPath);
  for (const repo of repoPack.repos || []) {
    if (fs.existsSync(repo.worktreePath)) {
      git(['worktree', 'remove', '--force', repo.worktreePath], repo.sourcePath);
    }
  }
}

runTests();
