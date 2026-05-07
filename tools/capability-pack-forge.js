const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyCapabilityRequest } = require('./workspace/contracts');

const USAGE = 'Usage: node tools/capability-pack-forge.js --input <forge-request.json> --output <dir>';
const PACK_SCHEMA_PATH = path.join(__dirname, 'schemas', 'bmad-capability-pack.schema.json');
const ARTIFACTS = Object.freeze([
  {
    path: 'capability-pack.json',
    kind: 'bmad-capability-pack',
    role: 'primary draft artifact',
  },
  {
    path: 'capability-request.json',
    kind: 'bmad-workspace-capability-request',
    role: 'offline verifier-compatible draft',
  },
  {
    path: 'operator-evidence-template.json',
    kind: 'capability-pack-operator-evidence-template',
    role: 'manual operator evidence draft',
  },
  {
    path: 'customization-draft.toml',
    kind: 'bmad-customize-draft',
    role: 'inactive customization draft',
  },
  {
    path: 'skill-outline.md',
    kind: 'bmad-skill-outline',
    role: 'skill draft outline',
  },
  {
    path: 'readiness-checklist.md',
    kind: 'bmad-readiness-checklist',
    role: 'implementation readiness draft',
  },
  {
    path: 'codex-task-packet.md',
    kind: 'codex-task-packet-draft',
    role: 'instruction draft only',
  },
]);

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--input') {
      args.input = argv[++index];
    } else if (arg === '--output') {
      args.output = argv[++index];
    } else {
      throw forgeError('FORGE_USAGE', `${USAGE}\nUnknown argument: ${arg}`);
    }
  }
  if (!args.input || !args.output) {
    throw forgeError('FORGE_USAGE', USAGE);
  }
  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv);
    const result = runForge({
      inputPath: args.input,
      outputDir: args.output,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const code = error.code || 'FORGE_FAILED';
    process.stderr.write(`${code}: ${error.message}\n`);
    process.exit(1);
  }
}

function runForge({ inputPath, outputDir }) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw forgeError('FORGE_USAGE', USAGE);
  }
  if (typeof outputDir !== 'string' || outputDir.trim() === '') {
    throw forgeError('FORGE_USAGE', USAGE);
  }

  const resolvedInputPath = path.resolve(inputPath);
  const requestRoot = path.dirname(resolvedInputPath);
  const requestContent = readFile(resolvedInputPath, 'FORGE_REQUEST_INVALID');
  assertNoSecrets(requestContent, '$.request');
  const request = parseJson(requestContent, 'FORGE_REQUEST_INVALID', resolvedInputPath);
  validateForgeRequest(request);

  const capabilityRequestPath = resolveLocalRef(requestRoot, request.capabilityRequestRef, '$.capabilityRequestRef');
  const context7EvidencePath = resolveLocalRef(requestRoot, request.context7EvidenceRef, '$.context7EvidenceRef');
  const capabilityRequestContent = readFile(capabilityRequestPath, 'FORGE_INPUT_READ_FAILED');
  const context7EvidenceContent = readFile(context7EvidencePath, 'FORGE_INPUT_READ_FAILED');
  assertNoSecrets(capabilityRequestContent, request.capabilityRequestRef);
  assertNoSecrets(context7EvidenceContent, request.context7EvidenceRef);

  const capabilityRequest = parseJson(capabilityRequestContent, 'FORGE_INPUT_INVALID', capabilityRequestPath);
  const context7Evidence = parseJson(context7EvidenceContent, 'FORGE_INPUT_INVALID', context7EvidencePath);
  const verdict = verifyCapabilityRequest(capabilityRequest);
  if (!verdict.ok) {
    throw forgeError('FORGE_CAPABILITY_REQUEST_INVALID', JSON.stringify(verdict.errors));
  }

  const inputs = [
    createInputRecord(
      'capability-request',
      capabilityRequest.kind,
      request.capabilityRequestRef,
      'declared capability request',
      capabilityRequestContent,
    ),
    createInputRecord(
      'context7-docs-evidence',
      context7Evidence.kind || 'context7-docs-operator-evidence',
      request.context7EvidenceRef,
      'advisory docs evidence',
      context7EvidenceContent,
    ),
  ];

  const seenInputIds = new Set(inputs.map((input) => input.id));
  for (const evidenceRef of request.evidenceRefs || []) {
    resolveLocalRef(requestRoot, evidenceRef.path, `$.evidenceRefs.${evidenceRef.id}.path`);
    const evidencePath = path.resolve(requestRoot, evidenceRef.path);
    const evidenceContent = readFile(evidencePath, 'FORGE_INPUT_READ_FAILED');
    assertNoSecrets(evidenceContent, evidenceRef.path);
    if (seenInputIds.has(evidenceRef.id)) {
      continue;
    }
    seenInputIds.add(evidenceRef.id);
    inputs.push(createInputRecord(evidenceRef.id, evidenceRef.kind, evidenceRef.path, evidenceRef.role, evidenceContent));
  }

  const pack = createCapabilityPack({ request, inputs });
  validateCapabilityPack(pack);

  const resolvedOutputDir = path.resolve(outputDir);
  prepareOutputDir(resolvedOutputDir);
  const files = createArtifactFiles({ request, pack, capabilityRequest, context7Evidence });
  for (const [relativePath, content] of Object.entries(files)) {
    writeOutputFile(resolvedOutputDir, relativePath, content);
  }

  const manifest = createManifest(files);
  writeOutputFile(resolvedOutputDir, 'manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    kind: 'bmad-capability-pack-forge-result',
    schemaVersion: 1,
    outputDir: resolvedOutputDir,
    artifacts: ['manifest.json', ...Object.keys(files).sort()],
  };
}

function validateForgeRequest(request) {
  if (!isObject(request)) {
    throw forgeError('FORGE_REQUEST_INVALID', 'request must be an object');
  }
  requireExact(request.kind, 'bmad-capability-pack-forge-request', '$.kind');
  requireExact(request.schemaVersion, 1, '$.schemaVersion');
  if (!isObject(request.capability)) {
    throw forgeError('FORGE_REQUEST_INVALID', '$.capability must be an object');
  }
  for (const field of ['id', 'displayName', 'summary']) {
    requireNonEmptyString(request.capability[field], `$.capability.${field}`);
  }
  requireLocalRefString(request.context7EvidenceRef, '$.context7EvidenceRef');
  requireLocalRefString(request.capabilityRequestRef, '$.capabilityRequestRef');
  if ('targetCustomizationSurface' in request) {
    requireNonEmptyString(request.targetCustomizationSurface, '$.targetCustomizationSurface');
  }
  if (!Array.isArray(request.acceptanceCriteria) || request.acceptanceCriteria.length === 0) {
    throw forgeError('FORGE_REQUEST_INVALID', '$.acceptanceCriteria must be a non-empty array');
  }
  for (const [index, criterion] of request.acceptanceCriteria.entries()) {
    if (!isObject(criterion)) {
      throw forgeError('FORGE_REQUEST_INVALID', `$.acceptanceCriteria[${index}] must be an object`);
    }
    requireNonEmptyString(criterion.id, `$.acceptanceCriteria[${index}].id`);
    requireNonEmptyString(criterion.statement, `$.acceptanceCriteria[${index}].statement`);
  }
  if ('evidenceRefs' in request && !Array.isArray(request.evidenceRefs)) {
    throw forgeError('FORGE_REQUEST_INVALID', '$.evidenceRefs must be an array');
  }
  for (const [index, evidenceRef] of (request.evidenceRefs || []).entries()) {
    if (!isObject(evidenceRef)) {
      throw forgeError('FORGE_REQUEST_INVALID', `$.evidenceRefs[${index}] must be an object`);
    }
    for (const field of ['id', 'kind', 'path', 'role']) {
      requireNonEmptyString(evidenceRef[field], `$.evidenceRefs[${index}].${field}`);
    }
    requireLocalRefString(evidenceRef.path, `$.evidenceRefs[${index}].path`);
  }
}

function createCapabilityPack({ request, inputs }) {
  return {
    kind: 'bmad-capability-pack',
    schemaVersion: 1,
    metadata: {
      source: 'capability-pack-forge',
      generatorVersion: 1,
    },
    capability: {
      id: request.capability.id,
      displayName: request.capability.displayName,
      summary: request.capability.summary,
    },
    inputs,
    artifacts: ARTIFACTS.map((artifact) => ({ ...artifact })),
    boundaries: [
      'No live tool access.',
      'No Workspace command is added.',
      'No verifier authority is granted.',
      'No runtime authority is granted.',
      'No _bmad/custom authority is granted.',
      'Generated artifacts are drafts until human review.',
    ],
    acceptanceCriteria: request.acceptanceCriteria.map((criterion) => ({
      id: criterion.id,
      statement: criterion.statement,
    })),
    humanReview: {
      required: true,
      nextSteps: [
        'Review generated artifacts before use.',
        'Run bmad workspace verify-capability on capability-request.json when verifier evidence is needed.',
        'Route customization-draft.toml through bmad-customize before any override is written.',
        'Treat codex-task-packet.md as an instruction draft, not an execution trigger.',
      ],
    },
  };
}

function validateCapabilityPack(pack) {
  const schema = parseJson(readFile(PACK_SCHEMA_PATH, 'FORGE_SCHEMA_INVALID'), 'FORGE_SCHEMA_INVALID', PACK_SCHEMA_PATH);
  if (schema.properties?.kind?.const !== 'bmad-capability-pack' || schema.properties?.schemaVersion?.const !== 1) {
    throw forgeError('FORGE_SCHEMA_INVALID', 'schema consts do not match bmad-capability-pack v1');
  }
  for (const field of schema.required || []) {
    if (!(field in pack)) {
      throw forgeError('FORGE_PACK_INVALID', `capability pack missing required field: ${field}`);
    }
  }
  requireExact(pack.kind, 'bmad-capability-pack', '$.kind');
  requireExact(pack.schemaVersion, 1, '$.schemaVersion');
  requireExact(pack.metadata?.source, 'capability-pack-forge', '$.metadata.source');
  requireExact(pack.metadata?.generatorVersion, 1, '$.metadata.generatorVersion');
  requireNonEmptyString(pack.capability?.id, '$.capability.id');
  requireNonEmptyString(pack.capability?.displayName, '$.capability.displayName');
  requireNonEmptyString(pack.capability?.summary, '$.capability.summary');
  if (!Array.isArray(pack.inputs) || pack.inputs.length === 0) {
    throw forgeError('FORGE_PACK_INVALID', '$.inputs must be non-empty');
  }
  for (const input of pack.inputs) {
    for (const field of ['id', 'kind', 'path', 'role', 'sha256']) {
      requireNonEmptyString(input[field], `$.inputs.${field}`);
    }
    if (!/^[a-f0-9]{64}$/.test(input.sha256)) {
      throw forgeError('FORGE_PACK_INVALID', `$.inputs.${input.id}.sha256 must be sha256 hex`);
    }
    requireLocalRefString(input.path, `$.inputs.${input.id}.path`);
  }
  if (!Array.isArray(pack.artifacts) || pack.artifacts.length === 0) {
    throw forgeError('FORGE_PACK_INVALID', '$.artifacts must be non-empty');
  }
  if (!Array.isArray(pack.boundaries) || pack.boundaries.length === 0) {
    throw forgeError('FORGE_PACK_INVALID', '$.boundaries must be non-empty');
  }
  if (!Array.isArray(pack.acceptanceCriteria) || pack.acceptanceCriteria.length === 0) {
    throw forgeError('FORGE_PACK_INVALID', '$.acceptanceCriteria must be non-empty');
  }
  if (pack.humanReview?.required !== true) {
    throw forgeError('FORGE_PACK_INVALID', '$.humanReview.required must be true');
  }
}

function createArtifactFiles({ request, pack, capabilityRequest, context7Evidence }) {
  return {
    'capability-pack.json': `${JSON.stringify(pack, null, 2)}\n`,
    'capability-request.json': `${JSON.stringify(capabilityRequest, null, 2)}\n`,
    'operator-evidence-template.json': `${JSON.stringify(createOperatorEvidenceTemplate(request, context7Evidence), null, 2)}\n`,
    'customization-draft.toml': createCustomizationDraft(request),
    'skill-outline.md': createSkillOutline(request),
    'readiness-checklist.md': createReadinessChecklist(request),
    'codex-task-packet.md': createCodexTaskPacket(request),
  };
}

function createOperatorEvidenceTemplate(request, context7Evidence) {
  return {
    kind: 'capability-pack-operator-evidence-template',
    schemaVersion: 1,
    capabilityId: request.capability.id,
    observer: 'Codex operator',
    evidenceRefs: (request.evidenceRefs || []).map((ref) => ({ id: ref.id, path: ref.path, role: ref.role })),
    context7EvidenceKind: context7Evidence.kind || 'context7-docs-operator-evidence',
    credentialEvidence: 'CONTEXT7_API_KEY=set|unset',
    credentialValue: '[REDACTED]',
    pass: false,
    boundary:
      'Manual operator evidence only; not verifier input, not grant authority, not runtime authority, not Workspace command authority.',
  };
}

function createCustomizationDraft(request) {
  const target = request.targetCustomizationSurface || 'bmad-agent-dev';
  return [
    '# Draft only. Route through bmad-customize before writing any override.',
    '# This file does not grant verifier authority, runtime authority, or Workspace authority.',
    '',
    '[workflow]',
    'persistent_facts = [',
    `  "Capability Pack Forge draft for ${escapeTomlString(request.capability.id)} is advisory only; review generated artifacts before use.",`,
    `  "Generated artifacts from ${escapeTomlString(target)} customization drafts are inactive until bmad-customize verifies the exposed surface."`,
    ']',
    '',
  ].join('\n');
}

function createSkillOutline(request) {
  return [
    `# ${request.capability.displayName} Capability Pack Skill Outline`,
    '',
    'Draft only. Not an installed skill and not an execution trigger.',
    '',
    '## Purpose',
    '',
    request.capability.summary,
    '',
    '## Boundary',
    '',
    '- No live tools.',
    '- No secrets.',
    '- No verifier authority.',
    '- No Workspace command changes.',
    '- Human review required before install or customization.',
    '',
    '## Candidate Acceptance Criteria',
    '',
    ...request.acceptanceCriteria.map((criterion) => `- ${criterion.id}: ${criterion.statement}`),
    '',
  ].join('\n');
}

function createReadinessChecklist(request) {
  return [
    `# ${request.capability.displayName} Readiness Checklist`,
    '',
    '- [ ] Capability request verifies offline with `bmad workspace verify-capability`.',
    '- [ ] Evidence refs are local files and advisory only.',
    '- [ ] No raw secrets, query results, or runtime credentials are stored.',
    '- [ ] Customization draft is routed through `bmad-customize` before use.',
    '- [ ] Codex task packet is reviewed as an instruction draft only.',
    '- [ ] Targeted tests pass.',
    '- [ ] `npm ci && npm run quality` runs on exact `HEAD` before push readiness.',
    '',
    '## Acceptance Criteria',
    '',
    ...request.acceptanceCriteria.map((criterion) => `- ${criterion.id}: ${criterion.statement}`),
    '',
  ].join('\n');
}

function createCodexTaskPacket(request) {
  return [
    `# ${request.capability.displayName} Codex Task Packet`,
    '',
    'This is an instruction draft, not an execution trigger.',
    '',
    '## Goal',
    '',
    request.capability.summary,
    '',
    '## Guardrails',
    '',
    '- Do not call live Context7, MCP, Docker, PostgreSQL, Git, Codex app-server, Apple Passwords, keychain, or network.',
    '- Do not change `bmad workspace` command registry.',
    '- Do not change `verify-capability` behavior.',
    '- Do not treat `_bmad/custom` as authority.',
    '- Preserve dirty worktree changes not owned by this task.',
    '',
    '## First Failing Behavior Test',
    '',
    '`node test/test-capability-pack-forge.js` must fail before Forge exists and pass after implementation.',
    '',
    '## Validation',
    '',
    '- `node test/test-capability-pack-forge.js`',
    '- `node test/test-workspace-contracts.js`',
    '- `node test/test-workspace-cli.js`',
    '- `npm run validate:skills`',
    '- `npm run validate:refs`',
    '- `npm run validate:graphify-manifests`',
    '',
  ].join('\n');
}

function createManifest(files) {
  return {
    kind: 'bmad-capability-pack-manifest',
    schemaVersion: 1,
    generator: 'capability-pack-forge',
    artifacts: Object.keys(files)
      .sort()
      .map((relativePath) => ({
        path: relativePath,
        sha256: sha256(files[relativePath]),
      })),
  };
}

function createInputRecord(id, kind, refPath, role, content) {
  return {
    id,
    kind,
    path: normalizePosix(refPath),
    role,
    sha256: sha256(content),
  };
}

function prepareOutputDir(outputDir) {
  if (fs.existsSync(outputDir)) {
    const entries = fs.readdirSync(outputDir);
    if (entries.length > 0) {
      throw forgeError('FORGE_OUTPUT_EXISTS', 'output directory exists and is not empty');
    }
    return;
  }
  fs.mkdirSync(outputDir, { recursive: true });
}

function writeOutputFile(outputDir, relativePath, content) {
  const targetPath = path.join(outputDir, relativePath);
  if (!targetPath.startsWith(`${outputDir}${path.sep}`)) {
    throw forgeError('FORGE_OUTPUT_UNSAFE', `unsafe output path: ${relativePath}`);
  }
  fs.writeFileSync(targetPath, content);
}

function resolveLocalRef(root, refPath, label) {
  requireLocalRefString(refPath, label);
  const resolved = path.resolve(root, refPath);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`) && resolved !== path.resolve(root)) {
    throw forgeError('FORGE_LOCAL_FILE_ONLY', `${label} must stay under request directory`);
  }
  return resolved;
}

function requireLocalRefString(value, label) {
  requireNonEmptyString(value, label);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || path.isAbsolute(value) || value.includes('\\')) {
    throw forgeError('FORGE_LOCAL_FILE_ONLY', `${label} must be a local relative file path`);
  }
  if (value.split('/').includes('..')) {
    throw forgeError('FORGE_LOCAL_FILE_ONLY', `${label} must not traverse parent directories`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw forgeError('FORGE_REQUEST_INVALID', `${label} must be a non-empty string`);
  }
}

function requireExact(actual, expected, label) {
  if (actual !== expected) {
    throw forgeError('FORGE_REQUEST_INVALID', `${label} must be ${JSON.stringify(expected)}`);
  }
}

function readFile(filePath, code) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw forgeError(code, `could not read ${filePath}: ${error.message}`);
  }
}

function parseJson(content, code, filePath) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw forgeError(code, `${filePath} contains invalid JSON: ${error.message}`);
  }
}

function assertNoSecrets(content, label) {
  const allowed = content.replaceAll('ctx7_test_placeholder_DO_NOT_USE', '');
  if (/ctx7_[A-Za-z0-9_-]{12,}/.test(allowed)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains Context7-key-like value`);
  }
  if (/\bsk-[A-Za-z0-9_-]{8,}/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains API-key-like value`);
  }
  if (/postgres(?:ql)?:\/\/[^"'<\s)]+/i.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains PostgreSQL URL`);
  }
  if (/POSTGRES_URL\s*=\s*(?!set\b|unset\b)/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains raw POSTGRES_URL value`);
  }
  if (/DATABASE_URL\s*=\s*(?!set\b|unset\b)/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains raw DATABASE_URL value`);
  }
  if (/PGPASSWORD\s*=/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains PGPASSWORD value`);
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizePosix(value) {
  return value.split(path.sep).join('/');
}

function escapeTomlString(value) {
  const serialized = JSON.stringify(String(value));
  return serialized.slice(1, -1);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function forgeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

if (require.main === module) {
  main();
}

module.exports = {
  runForge,
};
