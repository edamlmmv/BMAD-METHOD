/**
 * BMAD Workspace Contract Tests
 *
 * Public behavior checks for the BMAD Workspace artifact contract.
 * Usage: node test/test-workspace-contracts.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { validateCapabilityContract, validateWorkPacket, verifyCapabilityRequest } = require('../tools/workspace/contracts');
const { createCapabilityContract } = require('../tools/workspace/capability-contract');
const { createEvidenceGateFailure, evaluateEvidenceGates } = require('../tools/workspace/evidence-gates');
const { validateCloseoutArtifact } = require('../tools/workspace/closeout');
const { FORBIDDEN_EXECUTOR_ACTIONS, validateExecutorContract } = require('../tools/workspace/executor-contract');
const { buildSessionSetup } = require('../tools/workspace/packet');
const { REVIEW_MANIFEST_FORBIDDEN_ACTIONS, validateReviewManifest } = require('../tools/workspace/review-manifest');
const { scanForSecrets, validateResultArtifact } = require('../tools/workspace/result');
const { createRouteableCatalog, routeWorkspace } = require('../tools/workspace/routing');
const { validateBaseImprovementSessionKit, validateVendorSnapshots } = require('../tools/workspace/templates');
const { WORKSPACE_COMMANDS, WORKSPACE_COMMAND_NAMES, WORKSPACE_OPTIONS } = require('../tools/workspace/command-registry');

const repoRoot = path.join(__dirname, '..');
const EXPECTED_WORKSPACE_COMMAND_NAMES = [
  'launch',
  'intake',
  'packet',
  'list',
  'status',
  'handoff',
  'evidence',
  'verify-capability',
  'diff',
  'result',
  'closeout',
  'archive',
  'verify-archive',
  'review',
  'destroy',
  'authorize',
];

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

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

function validWorkPacket() {
  return {
    kind: 'bmad-work-packet',
    packetVersion: 4,
    sessionId: 'session-2026-05-04-example',
    bmadWorkflow: 'bmad-quick-dev',
    goal: 'Fix the reported bug',
    repoIntakeRefs: ['intake/repo-intake.json'],
    constraints: ['Do not mutate Workspace Base'],
    grants: ['grants.json'],
    acceptanceCriteria: ['Tests pass', 'Worktree Review ready'],
    capabilityContractRef: 'capabilities.json',
    renderedPromptRef: 'packets/rendered-prompt.md',
    executorContractRef: 'packets/executor-contract.json',
    routing: validRouting(),
    sessionSetup: {
      zoomOut: { status: 'complete', ref: 'docs/workspace/setup-zoom-out.md' },
      ubiquitousLanguage: { status: 'complete', ref: 'UBIQUITOUS_LANGUAGE.md' },
      grillDecisions: { status: 'skipped', skipReason: 'Decision already captured.' },
      tddPlan: { status: 'complete', ref: 'docs/workspace/setup-tdd-plan.md#tdd-order' },
    },
    reviewPlan: 'Run BMAD Code Review after execution',
  };
}

function validEvidenceRef() {
  return {
    id: 'repo-intake-graph-evidence',
    capability: 'evidence.graph.repo-intake',
    artifactRef: 'intake/graph.json',
    sha256: 'a'.repeat(64),
    generatedAt: '2026-05-04T00:00:00.000Z',
    sourceFiles: [{ path: 'intake/repo-intake.json', sha256: 'b'.repeat(64) }],
  };
}

function validEvidenceGate() {
  return {
    id: 'repo-intake-graph',
    requiredCapabilityIds: ['evidence.graph.repo-intake'],
    required: true,
    evidenceRefIds: ['repo-intake-graph-evidence'],
    freshnessPolicy: 'none',
    message: 'Workspace packet requires repo-intake graph evidence.',
  };
}

function validWorkPacketV5() {
  const packet = validWorkPacket();
  delete packet.repoIntakeRefs;
  packet.packetVersion = 5;
  packet.evidenceGates = [validEvidenceGate()];
  packet.evidenceRefs = [validEvidenceRef()];
  return packet;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validCapabilityContract() {
  return {
    schemaVersion: '0.1',
    workspaceVersion: 'b50f9fee8',
    capabilities: [
      {
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
      },
    ],
  };
}

function validCapabilityRequest(overrides = {}) {
  const request = {
    id: 'evidence.graph.repo-intake',
    sessionType: 'normal',
    group: 'evidence.graph',
    provider: 'graphify',
    interface: 'repo-intake',
    writes: ['workspace-session/intake'],
    outputs: ['graph.json'],
  };
  if (overrides.request) {
    Object.assign(request, overrides.request);
  }

  const capabilityRequest = {
    kind: 'bmad-workspace-capability-request',
    schemaVersion: 1,
    request,
    capabilities: overrides.capabilities || validCapabilityContract().capabilities,
  };
  if (overrides.observations) {
    capabilityRequest.observations = overrides.observations;
  }
  if (overrides.extraFields) {
    Object.assign(capabilityRequest, overrides.extraFields);
  }
  return capabilityRequest;
}

function validRouting(workflow = 'bmad-quick-dev') {
  return {
    routingSchemaVersion: 1,
    selectedWorkflow: workflow,
    source: 'deterministic',
    confidence: 'strong',
    reasonCodes: ['GOAL_QUICK_DEV'],
    alternatives: [],
    inputRefs: {
      repoIntakeRefs: ['intake/repo-intake.json'],
      artifactRefs: {},
    },
    blockers: [],
    nextManualStep: `Use ${workflow} for this Workspace Session.`,
  };
}

function validResultArtifact() {
  return {
    kind: 'bmad-workspace-result',
    schemaVersion: 1,
    sessionId: 'session-2026-05-04-example',
    resultId: 'result-001',
    createdAt: '2026-05-04T00:00:00.000Z',
    packetRef: 'packets/bmad-work-packet.json',
    renderedPromptRef: 'packets/rendered-prompt.md',
    routing: validRouting(),
    outcome: 'failed',
    summary: 'Manual execution stopped after focused test failure.',
    commands: [{ command: 'npm run test:workspace', exitCode: 1, summary: 'Focused workspace test failed.' }],
    evidenceRefs: ['review/summary.json'],
    failure: {
      rootCause: 'Regression in result ledger validation.',
      retryable: true,
      nextAction: 'Fix validation and rerun focused tests.',
    },
  };
}

function validExecutorContract() {
  return {
    kind: 'bmad-workspace-executor-contract',
    schemaVersion: 1,
    sessionId: 'session-2026-05-04-example',
    packetRef: 'packets/bmad-work-packet.json',
    renderedPromptRef: 'packets/rendered-prompt.md',
    resultLedgerRef: 'results',
    routing: validRouting(),
    sessionType: 'normal',
    executionMode: 'manual',
    executorKind: 'codex',
    allowedWriteRoots: [path.join(os.tmpdir(), 'bmad-workspace-contract-root')],
    forbiddenActions: [...FORBIDDEN_EXECUTOR_ACTIONS],
    manualExecutionSteps: ['Inspect status.', 'Use rendered prompt.', 'Record result.'],
  };
}

function validCloseoutArtifact() {
  return {
    kind: 'bmad-workspace-closeout',
    schemaVersion: 1,
    sessionId: 'session-2026-05-04-example',
    closeoutId: 'closeout-001',
    createdAt: '2026-05-04T00:00:00.000Z',
    packetRef: 'packets/bmad-work-packet.json',
    routing: validRouting(),
    executorContractRef: 'packets/executor-contract.json',
    resultRefs: ['results/result-001.json'],
    reviewRef: 'review/summary.json',
    reviewManifestRef: 'review/review-manifest.json',
    outcome: 'completed',
    nextAction: 'manual-target-review',
    summary: 'Manual work finished and review evidence is ready.',
    evidenceRefs: ['results/result-001.json', 'review/summary.json'],
  };
}

function validReviewManifest() {
  return {
    kind: 'bmad-workspace-review-manifest',
    schemaVersion: 1,
    sessionId: 'session-2026-05-04-example',
    reviewId: 'review-20260504000000',
    createdAt: '2026-05-04T00:00:00.000Z',
    createdBy: 'manual',
    sourceRefs: {
      packet: 'packets/bmad-work-packet.json',
      executorContract: 'packets/executor-contract.json',
      capabilityContract: 'capabilities.json',
      resultLedger: 'results',
      reviewSummary: 'review/summary.json',
      reviewManifest: 'review/review-manifest.json',
      closeout: null,
      evidenceIndex: null,
      archive: null,
      archiveDiff: null,
    },
    capabilities: {
      allowed: ['read-session-artifact', 'write-review-artifact'],
      forbidden: [...REVIEW_MANIFEST_FORBIDDEN_ACTIONS],
    },
    checks: [
      {
        id: 'review-summary-present',
        status: 'pass',
        evidenceRefs: ['review/summary.json'],
        message: 'Worktree Review summary is present.',
      },
    ],
    findings: [],
    decision: {
      status: 'ready',
      reason: 'Review Manifest has no failing checks or open findings.',
    },
  };
}

function catalogRows() {
  return [
    row('bmad-document-project', 'DP', 'anytime', false),
    row('bmad-generate-project-context', 'GPC', 'anytime', false),
    row('bmad-quick-dev', 'QQ', 'anytime', false),
    row('bmad-correct-course', 'CC', 'anytime', false),
    row('bmad-agent-dev', 'DEV', 'anytime', false),
    row('bmad-brainstorming', 'BP', '1-analysis', false),
    row('bmad-market-research', 'MR', '1-analysis', false),
    row('bmad-domain-research', 'DR', '1-analysis', false),
    row('bmad-technical-research', 'TR', '1-analysis', false),
    row('bmad-create-prd', 'CP', '2-planning', true),
    row('bmad-create-ux-design', 'CU', '2-planning', false),
    row('bmad-create-architecture', 'CA', '3-solutioning', true),
    row('bmad-create-story', 'CS', '4-implementation', true, 'create'),
    row('bmad-create-story', 'VS', '4-implementation', false, 'validate'),
    row('bmad-dev-story', 'DS', '4-implementation', true),
    row('bmad-code-review', 'CR', '4-implementation', false),
    row('bmad-quick-dev', 'QQ', 'anytime', false),
    { ...row('bmad-workspace', 'WS', 'anytime', false), module: 'Core' },
    { ...row('_meta', '', '', false), skill: '_meta' },
  ];
}

function row(skill, menuCode, phase, required, action = '') {
  return {
    module: 'BMad Method',
    skill,
    'display-name': skill,
    'menu-code': menuCode,
    description: skill,
    action,
    phase,
    required: String(required),
  };
}

function listFiles(root, options = {}) {
  const files = [];
  if (!fs.existsSync(root)) {
    return files;
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    const relativePath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    if (options.skip?.some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`))) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, options));
    } else if (!options.extensions || options.extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }

  return files;
}

function findWorkspaceReleaseRefsOutsideHistory() {
  const scannedFiles = [
    ...listFiles(path.join(repoRoot, 'docs', 'workspace'), {
      extensions: ['.md', '.json'],
      skip: ['docs/workspace/history', 'docs/workspace/vendor'],
    }),
    ...listFiles(path.join(repoRoot, 'src', 'core-skills', 'bmad-workspace'), { extensions: ['.md'] }),
    path.join(repoRoot, 'test', 'README.md'),
    path.join(repoRoot, 'test', 'test-workspace-contracts.js'),
    path.join(repoRoot, 'test', 'test-workspace-cli.js'),
  ];
  const releaseRefPattern =
    /\bV\d+\b|\bv\d+-(?:prd|backlog|acceptance-tests|traceability|release-readiness|zoom-out|grill-decisions|implementation-backlog)\.md\b/g;
  const findings = [];

  for (const filePath of scannedFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      releaseRefPattern.lastIndex = 0;
      const matches = line.match(releaseRefPattern);
      if (matches) {
        findings.push(`${relativePath}:${index + 1}: ${matches.join(', ')}`);
      }
    }
  }

  return findings;
}

function findWorkspaceRemovedContractRefsOutsideHistory() {
  const scannedFiles = [
    ...listFiles(path.join(repoRoot, 'docs', 'workspace'), {
      extensions: ['.md', '.json'],
      skip: ['docs/workspace/history', 'docs/workspace/vendor'],
    }),
    ...listFiles(path.join(repoRoot, 'src', 'core-skills', 'bmad-workspace'), { extensions: ['.md'] }),
    ...listFiles(path.join(repoRoot, 'tools', 'workspace'), { extensions: ['.js'] }),
    path.join(repoRoot, 'test', 'test-workspace-contracts.js'),
    path.join(repoRoot, 'test', 'test-workspace-cli.js'),
  ];
  const removedContractTerms = [
    ['legacy', 'missing'].join('-'),
    ['legacy', 'workspace', 'artifact', 'unsupported'].join('-'),
    ['mission', 'Id'].join(''),
    ['mission', 'Root'].join(''),
    ['mission', 'Type'].join(''),
    ['mission', '-id'].join(''),
  ];
  const findings = [];

  for (const filePath of scannedFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      const matches = removedContractTerms.filter((term) => line.includes(term));
      if (matches.length > 0) {
        findings.push(`${relativePath}:${index + 1}: ${matches.join(', ')}`);
      }
    }
  }

  return findings;
}

function findWorkspaceArchiveContractDrift() {
  const scannedFiles = [
    ...listFiles(path.join(repoRoot, 'docs', 'workspace'), {
      extensions: ['.md', '.json'],
      skip: ['docs/workspace/vendor'],
    }),
    ...listFiles(path.join(repoRoot, 'src', 'core-skills', 'bmad-workspace'), { extensions: ['.md'] }),
    ...listFiles(path.join(repoRoot, 'tools', 'workspace'), { extensions: ['.js'] }),
    path.join(repoRoot, 'test', 'test-workspace-contracts.js'),
    path.join(repoRoot, 'test', 'test-workspace-cli.js'),
  ];
  const currentArchiveCodes = new Set([
    'ARCHIVE_CHECKSUM_MISMATCH',
    'ARCHIVE_CLOSEOUT_INVALID',
    'ARCHIVE_CLOSEOUT_REF_MISSING',
    'ARCHIVE_CLOSEOUT_SECRET_DETECTED',
    'ARCHIVE_EVIDENCE_INDEX_INVALID',
    'ARCHIVE_EXECUTOR_CONTRACT_INVALID',
    'ARCHIVE_EXECUTOR_CONTRACT_MISSING',
    'ARCHIVE_EXECUTOR_CONTRACT_REF_MISSING',
    'ARCHIVE_FILE_MISSING',
    'ARCHIVE_MANIFEST_INVALID',
    'ARCHIVE_MANIFEST_MISSING',
    'ARCHIVE_NOT_FOUND',
    'ARCHIVE_OUTPUT_EXISTS',
    'ARCHIVE_OUTPUT_UNSAFE',
    'ARCHIVE_OUTPUT_UNWRITABLE',
    'ARCHIVE_PACKET_INVALID',
    'ARCHIVE_RESULT_INVALID',
    'ARCHIVE_RESULT_SECRET_DETECTED',
    'ARCHIVE_REVIEW_MANIFEST_INVALID',
    'ARCHIVE_UNSAFE_PATH',
    'ARCHIVE_VERSION',
    'DIFF_ARCHIVE_INVALID',
  ]);
  const findings = [];

  for (const filePath of scannedFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      const archiveCodes = line.match(/\b(?:ARCHIVE|DIFF_ARCHIVE)_[A-Z_]+\b/g) || [];
      const unexpectedCodes = archiveCodes.filter((code) => !currentArchiveCodes.has(code));
      if (unexpectedCodes.length > 0) {
        findings.push(`${relativePath}:${index + 1}: unexpected archive code ${unexpectedCodes.join(', ')}`);
      }
      const archiveVersionLiteral = line.match(/\barchiveVersion:\s*([0-9]+)/);
      if (archiveVersionLiteral && archiveVersionLiteral[1] !== '2') {
        findings.push(`${relativePath}:${index + 1}: non-current archiveVersion literal`);
      }
    }
  }

  return findings;
}

function runTests() {
  section('BMAD Work Packet');

  {
    const result = validateWorkPacket(validWorkPacket());
    assert(result.ok === true, 'valid v4 session packet without evidence gates is accepted', result.errors.join('; '));
  }

  {
    const packet = validWorkPacket();
    packet.evidenceGates = [validEvidenceGate()];
    packet.evidenceRefs = [validEvidenceRef()];
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'v4 packet rejects v5 evidence gate fields');
    assert(
      result.errors.some((error) => error.includes('evidenceGates') || error.includes('evidenceRefs')),
      'v4 evidence gate rejection names locked fields',
      result.errors.join('; '),
    );
  }

  {
    const result = validateWorkPacket(validWorkPacketV5());
    assert(result.ok === true, 'valid v5 session packet with evidence gates is accepted', result.errors.join('; '));
  }

  {
    const packet = validWorkPacketV5();
    packet.evidenceGates[0].freshnessPolicy = 'eventual';
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'v5 packet rejects unknown evidence freshness policy');
    assert(
      result.errors.some((error) => error.includes('freshnessPolicy')),
      'v5 freshness rejection names freshnessPolicy',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacketV5();
    packet.evidenceRefs[0].repoIntakeRef = 'intake/repo-intake.json';
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'v5 packet rejects unknown evidence ref fields');
    assert(
      result.errors.some((error) => error.includes('evidenceRefs[0].repoIntakeRef')),
      'v5 evidence ref rejection names unknown field',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacketV5();
    packet.repoIntakeRefs = ['intake/other.json'];
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects diverged repoIntakeRefs and evidenceRefs');
    assert(
      result.errors.some((error) => error.includes('repoIntakeRefs') && error.includes('evidenceRefs')),
      'diverged evidence alias rejection names both fields',
      result.errors.join('; '),
    );
  }

  {
    const payload = createEvidenceGateFailure({
      gateId: 'repo-intake-graph',
      capability: 'evidence.graph.repo-intake',
      reason: 'missing',
      packetVersion: 5,
    });
    assert(payload.code === 'EVIDENCE_GATE_FAILED', 'evidence gate failure payload records stable code', JSON.stringify(payload));
    assert(payload.packetVersion === 5, 'evidence gate failure payload records packetVersion 5', JSON.stringify(payload));
  }

  {
    const sessionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-evidence-gate-'));
    fs.mkdirSync(path.join(sessionRoot, 'intake'), { recursive: true });
    const graphPath = path.join(sessionRoot, 'intake', 'graph.json');
    const sourcePath = path.join(sessionRoot, 'intake', 'repo-intake.json');
    fs.writeFileSync(
      graphPath,
      `${JSON.stringify({
        kind: 'bmad-workspace-graph-evidence',
        schemaVersion: 1,
        generatedAt: '2026-05-04T00:00:00.000Z',
        summary: { state: 'valid' },
        repos: [],
      })}\n`,
    );
    fs.writeFileSync(sourcePath, '{"kind":"repo-intake"}\n');
    const future = new Date(Date.now() + 10_000);
    fs.utimesSync(sourcePath, future, future);
    const packet = validWorkPacketV5();
    packet.evidenceGates[0].required = false;
    packet.evidenceGates[0].freshnessPolicy = 'mtime';
    packet.evidenceRefs[0].sha256 = sha256File(graphPath);
    packet.evidenceRefs[0].sourceFiles = [{ path: 'intake/repo-intake.json' }];
    const result = evaluateEvidenceGates({ packet, sessionRoot });
    assert(result.state === 'warning', 'optional stale evidence gate reports warning state', JSON.stringify(result));
    assert(result.failures.length === 0, 'optional stale evidence gate does not block certification', JSON.stringify(result));
    assert(
      result.warnings.some((warning) => warning.reason === 'stale'),
      'optional stale evidence gate records stale warning',
      JSON.stringify(result),
    );
  }

  {
    const packet = validWorkPacket();
    packet.routing = validRouting();
    const result = validateWorkPacket(packet);
    assert(result.ok === true, 'packet accepts routing metadata', result.errors.join('; '));
  }

  {
    const packet = validWorkPacket();
    packet.routing = validRouting('bmad-create-prd');
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects workflow alias mismatch');
    assert(
      result.errors.some((error) => error.includes('routing.selectedWorkflow')),
      'workflow alias mismatch names routing selected workflow',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    packet.routing = { ...validRouting(), source: 'magic' };
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects invalid routing source');
    assert(
      result.errors.some((error) => error.includes('packet.routing.source')),
      'routing source rejection names source',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    packet.routing = { ...validRouting(), source: ['legacy', 'missing'].join('-') };
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects removed routing source');
    assert(
      result.errors.some((error) => error.includes('packet.routing.source')),
      'removed routing source rejection names source',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    delete packet.acceptanceCriteria;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet without acceptanceCriteria is rejected');
    assert(
      result.errors.some((error) => error.includes('acceptanceCriteria')),
      'packet rejection names acceptanceCriteria',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    delete packet.routing;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet without routing is rejected');
    assert(
      result.errors.some((error) => error.includes('packet.routing')),
      'packet routing rejection names routing',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    delete packet.executorContractRef;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet without executorContractRef is rejected');
    assert(
      result.errors.some((error) => error.includes('executorContractRef')),
      'packet executor contract rejection names executorContractRef',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    delete packet.sessionSetup;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet without sessionSetup is rejected');
    assert(
      result.errors.some((error) => error.includes('missing-session-setup')),
      'packet setup rejection names missing-session-setup',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    packet.sessionSetup.tddPlan = { status: 'skipped', skipReason: 'No code change.' };
    const result = validateWorkPacket(packet);
    assert(result.ok === true, 'packet accepts explicit setup skip reason', result.errors.join('; '));
  }

  {
    const packet = validWorkPacket();
    packet.sessionSetup.zoomOut = {
      status: 'complete',
      ref: 'docs/workspace/setup-zoom-out.md',
      refType: 'file',
      resolvedRef: '/tmp/docs/workspace/setup-zoom-out.md',
      sha256: 'a'.repeat(64),
      verification: 'local-verified',
    };
    packet.sessionSetup.grillDecisions = {
      status: 'complete',
      ref: 'external:party-mode-thread',
      refType: 'external',
      verification: 'external-unverified',
    };
    const result = validateWorkPacket(packet);
    assert(result.ok === true, 'packet accepts setup ref metadata', result.errors.join('; '));
  }

  {
    const packet = validWorkPacket();
    packet.sessionSetup.zoomOut = {
      status: 'complete',
      ref: 'external:party-mode-thread',
      refType: 'external',
      verification: 'external-unverified',
      sha256: 'a'.repeat(64),
    };
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects checksum on external setup ref');
    assert(
      result.errors.some((error) => error.includes('external refs')),
      'external setup ref rejection names external refs',
      result.errors.join('; '),
    );
  }

  {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-setup-ref-'));
    try {
      fs.writeFileSync(path.join(tempRoot, 'zoom-out.md'), 'Zoom out.\n');
      const setup = buildSessionSetup({
        setupBasePath: tempRoot,
        setupRefs: {
          zoomOut: 'zoom-out.md',
          ubiquitousLanguage: 'file:zoom-out.md',
          grillDecisions: 'external:party-mode-thread',
          tddPlan: 'zoom-out.md#tdd',
        },
        setupSkips: [],
      });
      assert(setup.zoomOut.sha256.length === 64, 'local setup ref records sha256');
      assert(setup.ubiquitousLanguage.refType === 'file', 'file setup ref records file type');
      assert(setup.grillDecisions.verification === 'external-unverified', 'external setup ref records warning state');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  {
    const packet = validWorkPacket();
    packet.sessionSetup.zoomOut = { status: 'skipped', skipReason: '' };
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects empty setup skip reason');
    assert(
      result.errors.some((error) => error.includes('skipReason')),
      'setup skip rejection names skipReason',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    packet.unexpectedField = 'unexpected';
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects unknown top-level fields');
    assert(
      result.errors.some((error) => error.includes('packet.unexpectedField is not allowed')),
      'unknown packet field rejection names field',
      result.errors.join('; '),
    );
  }

  {
    const packet = validWorkPacket();
    const removedField = ['mission', 'Id'].join('');
    packet[removedField] = packet.sessionId;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects removed mission-era fields as unknown');
    assert(
      result.errors.some((error) => error.includes(`packet.${removedField} is not allowed`)),
      'removed packet field rejection names field',
      result.errors.join('; '),
    );
  }

  section('Workspace Result Ledger');

  {
    const result = validateResultArtifact(validResultArtifact(), { expectedSessionId: 'session-2026-05-04-example' });
    assert(result.ok === true, 'valid result artifact is accepted', result.errors.join('; '));
  }

  section('Workspace Executor Contract');

  {
    const result = validateExecutorContract(validExecutorContract(), {
      expectedSessionId: 'session-2026-05-04-example',
      expectedPacketRef: 'packets/bmad-work-packet.json',
      expectedRenderedPromptRef: 'packets/rendered-prompt.md',
    });
    assert(result.ok === true, 'valid executor contract is accepted', result.errors.join('; '));
  }

  {
    const contract = validExecutorContract();
    contract.schemaVersion = 2;
    const result = validateExecutorContract(contract);
    assert(result.ok === false, 'executor contract rejects unsupported schema version');
    assert(
      result.errors.some((error) => error.includes('schemaVersion')),
      'executor schema rejection names schemaVersion',
      result.errors.join('; '),
    );
  }

  {
    const contract = validExecutorContract();
    contract.packetRef = '../escape.json';
    const result = validateExecutorContract(contract);
    assert(result.ok === false, 'executor contract rejects unsafe packet refs');
    assert(
      result.errors.some((error) => error.includes('packetRef')),
      'unsafe packet ref rejection names packetRef',
      result.errors.join('; '),
    );
  }

  {
    const contract = validExecutorContract();
    contract.allowedWriteRoots = [];
    const result = validateExecutorContract(contract);
    assert(result.ok === false, 'executor contract rejects empty allowed write roots');
    assert(
      result.errors.some((error) => error.includes('allowedWriteRoots')),
      'empty roots rejection names allowedWriteRoots',
      result.errors.join('; '),
    );
  }

  {
    const contract = validExecutorContract();
    contract.allowedWriteRoots = ['relative-root'];
    const result = validateExecutorContract(contract);
    assert(result.ok === false, 'executor contract rejects relative write roots');
    assert(
      result.errors.some((error) => error.includes('absolute path')),
      'relative roots rejection names absolute path',
      result.errors.join('; '),
    );
  }

  {
    const contract = validExecutorContract();
    contract.forbiddenActions = contract.forbiddenActions.filter((action) => action !== 'workspace-run');
    const result = validateExecutorContract(contract);
    assert(result.ok === false, 'executor contract requires forbidden action constants');
    assert(
      result.errors.some((error) => error.includes('workspace-run')),
      'forbidden action rejection names missing constant',
      result.errors.join('; '),
    );
  }

  {
    const resultArtifact = validResultArtifact();
    resultArtifact.outcome = 'unknown';
    const result = validateResultArtifact(resultArtifact);
    assert(result.ok === false, 'result rejects invalid outcome');
    assert(
      result.errors.some((error) => error.includes('outcome')),
      'invalid outcome rejection names outcome',
      result.errors.join('; '),
    );
  }

  {
    const resultArtifact = validResultArtifact();
    resultArtifact.resultId = '../escape';
    const result = validateResultArtifact(resultArtifact);
    assert(result.ok === false, 'result rejects unsafe result id');
    assert(
      result.errors.some((error) => error.includes('resultId')),
      'unsafe result id rejection names resultId',
      result.errors.join('; '),
    );
  }

  {
    const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzABCDE';
    const findings = scanForSecrets(`{"token":"${token}"}`);
    assert(findings.length === 1, 'result secret scanner detects GitHub token');
    assert(!JSON.stringify(findings).includes(token), 'result secret scanner does not expose token');
  }

  section('Workspace Closeout');

  {
    const result = validateCloseoutArtifact(validCloseoutArtifact(), { expectedSessionId: 'session-2026-05-04-example' });
    assert(result.ok === true, 'valid closeout artifact is accepted', result.errors.join('; '));
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.kind = 'not-closeout';
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects invalid kind');
    assert(
      result.errors.some((error) => error.includes('kind')),
      'closeout kind rejection names kind',
      result.errors.join('; '),
    );
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.schemaVersion = 2;
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects unsupported schema version');
    assert(
      result.errors.some((error) => error.includes('schemaVersion')),
      'closeout schema rejection names schemaVersion',
      result.errors.join('; '),
    );
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.closeoutId = '../escape';
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects unsafe closeout id');
    assert(
      result.errors.some((error) => error.includes('closeoutId')),
      'closeout id rejection names closeoutId',
      result.errors.join('; '),
    );
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.outcome = 'approved';
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects invalid outcome');
    assert(
      result.errors.some((error) => error.includes('outcome')),
      'closeout outcome rejection names outcome',
      result.errors.join('; '),
    );
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.nextAction = 'merge';
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects forbidden next action');
    assert(
      result.errors.some((error) => error.includes('nextAction')),
      'closeout next action rejection names nextAction',
      result.errors.join('; '),
    );
  }

  {
    const closeout = validCloseoutArtifact();
    closeout.packetRef = '../escape.json';
    const result = validateCloseoutArtifact(closeout);
    assert(result.ok === false, 'closeout rejects unsafe refs');
    assert(
      result.errors.some((error) => error.includes('packetRef')),
      'closeout unsafe ref rejection names packetRef',
      result.errors.join('; '),
    );
  }

  {
    const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzABCDE';
    const findings = scanForSecrets(`{"summary":"${token}"}`);
    assert(findings.length === 1, 'closeout secret scanner detects GitHub token');
    assert(!JSON.stringify(findings).includes(token), 'closeout secret scanner does not expose token');
  }

  section('Workspace Review Manifest');

  {
    const result = validateReviewManifest(validReviewManifest(), { expectedSessionId: 'session-2026-05-04-example' });
    assert(result.ok === true, 'valid review manifest is accepted', result.errors.join('; '));
  }

  {
    const manifest = validReviewManifest();
    manifest.kind = 'not-review-manifest';
    const result = validateReviewManifest(manifest);
    assert(result.ok === false, 'review manifest rejects invalid kind');
    assert(
      result.errors.some((error) => error.includes('reviewManifest.kind')),
      'review manifest kind rejection names kind',
      result.errors.join('; '),
    );
  }

  {
    const manifest = validReviewManifest();
    manifest.sourceRefs.packet = '../escape.json';
    const result = validateReviewManifest(manifest);
    assert(result.ok === false, 'review manifest rejects unsafe refs');
    assert(
      result.errors.some((error) => error.includes('sourceRefs.packet')),
      'review manifest unsafe ref rejection names source ref',
      result.errors.join('; '),
    );
  }

  {
    const manifest = validReviewManifest();
    manifest.capabilities.forbidden = manifest.capabilities.forbidden.filter((action) => action !== 'restore');
    const result = validateReviewManifest(manifest);
    assert(result.ok === false, 'review manifest requires forbidden action constants');
    assert(
      result.errors.some((error) => error.includes('restore')),
      'review manifest forbidden action rejection names missing constant',
      result.errors.join('; '),
    );
  }

  section('Workspace Routing');

  {
    const catalog = createRouteableCatalog(catalogRows());
    assert(
      catalog.some((entry) => entry.skill === 'bmad-quick-dev'),
      'routeable catalog includes workflows',
    );
    assert(!catalog.some((entry) => entry.skill === 'bmad-agent-dev'), 'routeable catalog excludes agent skills');
    assert(!catalog.some((entry) => entry.skill === 'bmad-workspace'), 'routeable catalog excludes non-BMad Method rows');
    assert(catalog.filter((entry) => entry.skill === 'bmad-quick-dev').length === 1, 'routeable catalog collapses duplicates');
  }

  {
    const decision = routeWorkspace({ goal: 'Fix target repo bug.', catalogEntries: catalogRows(), workflowOverride: 'bmad-create-prd' });
    assert(
      decision.selectedWorkflow === 'bmad-create-prd',
      'workflow override selects requested workflow',
      JSON.stringify(decision, null, 2),
    );
    assert(decision.source === 'override', 'workflow override records override source', JSON.stringify(decision, null, 2));
    assert(decision.confidence === 'explicit', 'workflow override records explicit confidence', JSON.stringify(decision, null, 2));
  }

  {
    const decision = routeWorkspace({
      goal: 'Create next story.',
      catalogEntries: catalogRows(),
      workflowOverride: 'bmad-create-story:create',
    });
    assert(
      decision.selectedWorkflow === 'bmad-create-story',
      'workflow action override selects requested workflow',
      JSON.stringify(decision, null, 2),
    );
    assert(decision.selectedAction === 'create', 'workflow action override records requested action', JSON.stringify(decision, null, 2));
  }

  for (const [goal, expectedWorkflow] of [
    ['Create PRD for the workspace router.', 'bmad-create-prd'],
    ['Design system architecture for routing.', 'bmad-create-architecture'],
    ['Create UX design for session list.', 'bmad-create-ux-design'],
    ['Create next implementation story.', 'bmad-create-story'],
    ['Fix target repo bug.', 'bmad-quick-dev'],
    ['Run code review for the implementation.', 'bmad-code-review'],
    ['Run market research for competitors.', 'bmad-market-research'],
    ['Run technical research for feasibility.', 'bmad-technical-research'],
    ['Run domain research for terminology.', 'bmad-domain-research'],
    ['Document project structure.', 'bmad-document-project'],
    ['Generate project context.', 'bmad-generate-project-context'],
    ['Correct course after major change.', 'bmad-correct-course'],
  ]) {
    const decision = routeWorkspace({ goal, catalogEntries: catalogRows() });
    assert(decision.selectedWorkflow === expectedWorkflow, `router maps goal to ${expectedWorkflow}`, JSON.stringify(decision, null, 2));
  }

  {
    const decision = routeWorkspace({ goal: 'Fix target repo bug.', catalogEntries: catalogRows(), blockers: ['MISSING_INTAKE'] });
    assert(decision.confidence === 'blocked', 'router carries blockers in confidence', JSON.stringify(decision, null, 2));
    assert(
      decision.blockers.some((blocker) => blocker.code === 'MISSING_INTAKE'),
      'router records blocker codes',
      JSON.stringify(decision, null, 2),
    );
  }

  for (const [goal, expectedCode] of [
    ['', 'ROUTE_DECISION_REQUIRED'],
    ['Create PRD and architecture.', 'ROUTE_DECISION_REQUIRED'],
  ]) {
    try {
      routeWorkspace({ goal, catalogEntries: catalogRows() });
      assert(false, `router rejects ambiguous goal ${goal || '<empty>'}`);
    } catch (error) {
      assert(error.message.includes(expectedCode), `router names ${expectedCode}`, error.message);
    }
  }

  for (const workflowOverride of ['bmad-missing-workflow', 'bmad-agent-dev']) {
    try {
      routeWorkspace({ goal: 'Fix target repo bug.', catalogEntries: catalogRows(), workflowOverride });
      assert(false, `router rejects ${workflowOverride}`);
    } catch (error) {
      assert(
        error.message.includes('ROUTE_WORKFLOW_UNKNOWN'),
        `router rejects unknown or excluded override ${workflowOverride}`,
        error.message,
      );
    }
  }

  section('Capability Contract');

  {
    const result = validateCapabilityContract(validCapabilityContract());
    assert(result.ok === true, 'valid Graph Evidence Adapter capability is accepted', result.errors.join('; '));
  }

  {
    const contract = validCapabilityContract();
    contract.capabilities[0].forbiddenWrites = [];
    const result = validateCapabilityContract(contract);
    assert(result.ok === false, 'repo intake capability must forbid BMAD Workspace writes');
    assert(
      result.errors.some((error) => error.includes('forbiddenWrites')),
      'capability rejection names forbiddenWrites',
      result.errors.join('; '),
    );
  }

  {
    const contract = validCapabilityContract();
    contract.capabilities.push({
      id: 'executor.codex.manual',
      group: 'executor.codex',
      provider: 'codex',
      interface: 'manual-executor-contract',
      allowedInNormalSession: true,
      allowedInBaseImprovement: true,
      requiresGrant: true,
      writes: ['workspace-session/packets'],
      forbiddenWrites: ['workspace-base'],
      outputs: ['executor-contract.json'],
      upstreamGapProofRequired: false,
    });
    const result = validateCapabilityContract(contract);
    assert(result.ok === true, 'manual Codex executor capability is accepted', result.errors.join('; '));
  }

  {
    const contract = validCapabilityContract();
    contract.capabilities.push({
      id: 'runtime.session.custom-scheduler',
      group: 'runtime.session',
      provider: 'custom-scheduler',
      interface: 'scheduler',
      allowedInNormalSession: false,
      allowedInBaseImprovement: false,
      requiresGrant: true,
      writes: ['workspace-base'],
      forbiddenWrites: [],
      outputs: ['scheduler-state.json'],
      upstreamGapProofRequired: false,
    });
    const result = validateCapabilityContract(contract);
    assert(result.ok === false, 'engine-like adapter without upstream-gap proof is rejected');
    assert(
      result.errors.some((error) => error.includes('upstreamGapProofRequired')),
      'engine-like adapter rejection names upstreamGapProofRequired',
      result.errors.join('; '),
    );
  }

  section('Base Improvement Session Kit');

  {
    const templateRoot = path.join(__dirname, '..', 'docs', 'workspace', 'templates');
    const result = validateBaseImprovementSessionKit(templateRoot);
    assert(result.ok === true, 'Base Improvement Session kit validates', result.errors.join('; '));
  }

  {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-template-missing-'));
    try {
      const result = validateBaseImprovementSessionKit(tempRoot);
      assert(result.ok === false, 'Base Improvement Session kit rejects missing templates');
      assert(
        result.errors.some((error) => error.includes('bmad-work-packet.template.json')),
        'missing packet kit rejection names Work Packet template',
        result.errors.join('; '),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  section('Matt Pocock Vendor Snapshots');

  {
    const vendorRoot = path.join(__dirname, '..', 'docs', 'workspace', 'vendor', 'mattpocock-skills');
    const result = validateVendorSnapshots(vendorRoot);
    assert(result.ok === true, 'Matt Pocock skill vendor snapshots validate', result.errors.join('; '));
  }

  {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-vendor-missing-'));
    try {
      const result = validateVendorSnapshots(tempRoot);
      assert(result.ok === false, 'vendor snapshots reject missing manifest');
      assert(
        result.errors.some((error) => error.includes('MANIFEST.json')),
        'missing vendor rejection names manifest',
        result.errors.join('; '),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  section('Repo-Owned Source Skill');

  {
    const skillPath = path.join(__dirname, '..', 'src', 'core-skills', 'bmad-workspace', 'SKILL.md');
    const oldSkillName = ['bmad', 'workspace', 'di' + 'stro'].join('-');
    const oldSkillPath = path.join(__dirname, '..', 'src', 'core-skills', oldSkillName, 'SKILL.md');
    const moduleHelpPath = path.join(__dirname, '..', 'src', 'core-skills', 'module-help.csv');
    assert(fs.existsSync(skillPath), 'repo owns bmad-workspace source skill');
    assert(!fs.existsSync(oldSkillPath), 'repo does not own old workspace source skill');

    const skillContent = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
    assert(skillContent.includes('Workspace Session'), 'source skill uses Workspace Session language');
    assert(skillContent.includes('BMAD Work Packet'), 'source skill uses BMAD Work Packet language');
    assert(skillContent.includes('bmad workspace list'), 'source skill documents workspace list');
    assert(skillContent.includes('bmad workspace status'), 'source skill documents workspace status');
    assert(skillContent.includes('bmad workspace handoff'), 'source skill documents workspace handoff');
    assert(skillContent.includes('bmad workspace evidence'), 'source skill documents workspace evidence');
    assert(skillContent.includes('bmad workspace verify-capability'), 'source skill documents workspace verify-capability');
    assert(skillContent.includes('bmad workspace diff'), 'source skill documents workspace diff');
    assert(skillContent.includes('bmad workspace result'), 'source skill documents workspace result');
    assert(skillContent.includes('bmad workspace closeout'), 'source skill documents workspace closeout');
    assert(skillContent.includes('bmad workspace archive'), 'source skill documents workspace archive');
    assert(skillContent.includes('bmad workspace verify-archive'), 'source skill documents workspace verify-archive');
    assert(skillContent.includes('Executor Contract'), 'source skill documents Executor Contract');
    assert(skillContent.includes('Review Manifest'), 'source skill documents Review Manifest');
    assert(skillContent.includes('executionMode: manual'), 'source skill documents manual execution mode');
    assert(skillContent.includes('--workflow <skill[:action]>'), 'source skill documents workflow routing override');
    assert(skillContent.includes('routing.routingSchemaVersion'), 'source skill documents routing schema');
    assert(skillContent.includes('declared-contract compatibility check'), 'source skill documents capability verifier boundary');
    assert(
      skillContent.includes('docs/workspace/templates/capability-request.template.json'),
      'source skill links capability request template',
    );
    for (const text of [
      'Codex Operator Affordances',
      '`/goal`',
      'features.goals',
      'features.multi_agent',
      'features.codex_hooks',
      'operator-assist-only',
    ]) {
      assert(skillContent.includes(text), `source skill documents ${text}`, skillContent);
    }
    const moduleHelp = fs.readFileSync(moduleHelpPath, 'utf8');
    assert(moduleHelp.includes('Core,bmad-workspace,'), 'module-help registers bmad-workspace skill');
    assert(moduleHelp.includes('Core,bmad-workspace,BMAD Workspace,WS,'), 'module-help registers WS menu code');
    assert(moduleHelp.includes('archive diff'), 'module-help documents archive diff');
    assert(moduleHelp.includes('Review Manifest'), 'module-help documents Review Manifest');
    assert(!moduleHelp.includes(oldSkillName), 'module-help omits old workspace skill');
  }

  section('Workspace Current Contract');

  {
    const workspaceDocsRoot = path.join(repoRoot, 'docs', 'workspace');
    const indexPath = path.join(workspaceDocsRoot, 'index.md');
    const architecturePath = path.join(workspaceDocsRoot, 'architecture.md');
    const commandContractPath = path.join(workspaceDocsRoot, 'command-contract.md');
    const historyRoot = path.join(workspaceDocsRoot, 'history');
    const currentStatePath = path.join(workspaceDocsRoot, 'current-state.md');
    const sessionLifecyclePath = path.join(workspaceDocsRoot, 'session-lifecycle.md');
    const guardrailsPath = path.join(workspaceDocsRoot, 'guardrails.md');
    const releaseChecklistPath = path.join(workspaceDocsRoot, 'release-checklist.md');
    const selfImprovementCodexPath = path.join(workspaceDocsRoot, 'self-improvement-codex.md');
    const templateIndexPath = path.join(workspaceDocsRoot, 'templates', 'index.md');
    const capabilityRequestTemplatePath = path.join(workspaceDocsRoot, 'templates', 'capability-request.template.json');
    const qualityWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'quality.yaml');
    const packageJsonPath = path.join(repoRoot, 'package.json');
    const packageLockPath = path.join(repoRoot, 'package-lock.json');
    const yarnLockPath = path.join(repoRoot, 'yarn.lock');
    const workspaceCommandPath = path.join(repoRoot, 'tools', 'installer', 'commands', 'workspace.js');
    const workspaceCommandRegistryPath = path.join(repoRoot, 'tools', 'workspace', 'command-registry.js');
    const capabilityProfileRegistryPath = path.join(workspaceDocsRoot, 'capability-profile-registry.json');
    const buildDocsPath = path.join(repoRoot, 'tools', 'build-docs.mjs');
    const customizeSkillPath = path.join(repoRoot, 'src', 'core-skills', 'bmad-customize', 'SKILL.md');
    const selfImproveSkillPath = path.join(repoRoot, 'src', 'core-skills', 'bmad-self-improve', 'SKILL.md');

    for (const docName of [
      'index.md',
      'current-state.md',
      'session-lifecycle.md',
      'guardrails.md',
      'release-checklist.md',
      'command-contract.md',
      'operator-quickstart.md',
      'operator-guide.md',
      'architecture.md',
      'prd.md',
      'capability-contract.md',
      'self-improvement-codex.md',
      'release-note-6.6.0.md',
    ]) {
      assert(fs.existsSync(path.join(workspaceDocsRoot, docName)), `Current Workspace doc exists: ${docName}`);
    }
    assert(fs.existsSync(capabilityRequestTemplatePath), 'Capability Request template exists');
    assert(fs.existsSync(capabilityProfileRegistryPath), 'Capability profile registry exists');

    const historyFiles = fs.readdirSync(historyRoot);
    const historyArchivePath = path.join(historyRoot, 'compiled-bmads.md');
    const historyArchive = fs.readFileSync(historyArchivePath, 'utf8');
    const removedHistoryArtifactPattern = /^v\d+-(?:prd|implementation-backlog|backlog|acceptance-tests|traceability)\.md$/;
    assert(fs.existsSync(historyArchivePath), 'Compiled Workspace history archive exists');
    assert(
      !historyFiles.some((fileName) => removedHistoryArtifactPattern.test(fileName)),
      'Per-release Workspace history artifacts were compiled and removed',
    );

    const releaseChecklistPattern = /^v\d+-release-readiness\.md$/;
    assert(
      !fs.readdirSync(workspaceDocsRoot).some((fileName) => releaseChecklistPattern.test(fileName)),
      'Version checklist files stay out of current docs root',
    );
    assert(!historyFiles.some((fileName) => releaseChecklistPattern.test(fileName)), 'Version checklist files stay consolidated');

    const index = fs.readFileSync(indexPath, 'utf8');
    for (const link of [
      './current-state.md',
      './session-lifecycle.md',
      './guardrails.md',
      './release-checklist.md',
      './command-contract.md',
      './operator-quickstart.md',
      './operator-guide.md',
      './architecture.md',
      './capability-contract.md',
      './capability-profile-registry.json',
      './release-note-6.6.0.md',
      './history/index.md',
    ]) {
      assert(index.includes(link), `workspace index links ${link}`, index);
    }
    assert(!/\.\/v\d+-/.test(index), 'workspace index keeps version docs out of current flow', index);
    assert(index.includes('not current operator guidance'), 'workspace index labels historical artifacts', index);
    assert(index.includes('./templates/capability-request.template.json'), 'workspace index links capability request template', index);
    assert(
      index.includes('Capability Verification is declared-contract compatibility'),
      'workspace index defines verifier boundary',
      index,
    );

    const architecture = fs.readFileSync(architecturePath, 'utf8');
    assert(architecture.includes('The current system is'), 'architecture states current system', architecture);
    assert(architecture.includes('Capability Verifier'), 'architecture documents Capability Verifier module', architecture);
    assert(architecture.includes('## Evidence Index'), 'architecture documents Evidence Index', architecture);
    assert(architecture.includes('## Review Manifest'), 'architecture documents Review Manifest', architecture);
    assert(architecture.includes('## Workspace Diff'), 'architecture documents Workspace Diff', architecture);
    assert(architecture.includes('## Derived Lifecycle'), 'architecture documents derived lifecycle', architecture);
    assert(!/The V\d+ system is/.test(architecture), 'architecture omits stale release current-system framing', architecture);
    assert(
      !architecture.includes('workspace launch --repo <path> --goal <file> --grant <grant.json>'),
      'architecture omits stale interface sketch',
      architecture,
    );
    for (const lifecycle of [
      'launched',
      'intake-recorded',
      'packet-ready',
      'executor-ready',
      'result-recorded',
      'review-recorded',
      'closeout-recorded',
      'blocked',
    ]) {
      assert(architecture.includes(`\`${lifecycle}\``), `architecture documents lifecycle ${lifecycle}`, architecture);
    }
    for (const command of WORKSPACE_COMMAND_NAMES) {
      assert(architecture.includes(`bmad workspace ${command}`), `architecture documents command ${command}`, architecture);
    }

    const commandContract = fs.readFileSync(commandContractPath, 'utf8');
    for (const command of WORKSPACE_COMMAND_NAMES) {
      assert(commandContract.includes(`\`${command}\``), `command contract documents ${command}`, commandContract);
    }
    for (const text of [
      'handoff` writes Markdown',
      'every other command writes JSON',
      'Filesystem Effect',
      'Stable Error Families',
      'tools/workspace/command-registry.js',
      'command classes',
      'Current contract does not add `workspace run`',
      'Review Manifest Shape',
      'ARCHIVE_REVIEW_MANIFEST_INVALID',
      'REVIEW_MANIFEST_INVALID',
      'Diff Shape',
      'diffVersion: 1',
      'DIFF_ARCHIVE_INVALID',
      'DIFF_SOURCE_REQUIRED',
      'Evidence Index Shape',
      'archiveVersion: 2',
      'ARCHIVE_CHECKSUM_MISMATCH',
      'ARCHIVE_EVIDENCE_INDEX_INVALID',
      'CLOSEOUT_SECRET_DETECTED',
      'EXECUTOR_CONTRACT_INVALID',
      'ROUTE_WORKFLOW_UNKNOWN',
      'RESULT_SECRET_DETECTED',
      'Capability Verification Shape',
      'bmad-workspace-capability-verdict',
      'CAPABILITY_NOT_DECLARED',
      'CAPABILITY_ID_DUPLICATE',
      'requiresGrant',
      'Codex Operator Affordances',
      '`/goal`',
      'features.goals',
      'features.multi_agent',
      'features.codex_hooks',
      'affordances, not Workspace subcommands',
    ]) {
      assert(commandContract.includes(text), `command contract includes ${text}`, commandContract);
    }
    for (const command of WORKSPACE_COMMANDS) {
      assert(
        commandContract.includes(`| \`${command.name}\` | \`${command.class}\` |`),
        `command contract records ${command.name} class ${command.class}`,
        commandContract,
      );
    }

    const historyIndex = fs.readFileSync(path.join(historyRoot, 'index.md'), 'utf8');
    for (const text of ['Compiled BMAD Workspace History', 'PRD', 'Backlog', 'Acceptance', 'Traceability']) {
      assert(historyIndex.includes(text), `history index includes ${text}`, historyIndex);
    }

    assert(historyArchive.includes('Source artifacts compiled: 67'), 'history archive records source artifact count');
    assert(historyArchive.includes('Release groups compiled: 21'), 'history archive records release group count');
    assert(historyArchive.includes('Compact entries compiled: 4'), 'history archive records compact entry count');
    assert(historyArchive.includes('Traceability markers'), 'history archive preserves traceability markers');
    assert(historyArchive.includes('Old Artifact Removal'), 'history archive records old artifact removal');
    assert(historyArchive.includes('Codex operator affordances'), 'history records Codex operator affordance plan');
    assert(
      historyArchive.includes('Current Workspace packet, routing, executor, archive, and diff contracts'),
      'history records current contract plan',
    );
    assert(historyArchive.includes('Current archive manifest contract language'), 'history records archive manifest cleanup plan');
    assert(historyArchive.includes('Prompt Builder removal'), 'history records prompt builder removal plan');
    assert(historyArchive.includes(`${'V'}23 hardens Workspace for review and merge`), 'history records release hardening plan');
    for (const text of [
      'Codex operator affordances',
      '`/goal`',
      'not a second goal engine',
      'optional capability discovery',
      'No Workspace slash-command execution engine',
    ]) {
      assert(historyArchive.includes(text), `operator affordance history includes ${text}`, historyArchive);
    }

    const releaseReadiness = fs.readFileSync(releaseChecklistPath, 'utf8');
    for (const text of [
      'npm ci',
      'npm run test:workspace',
      'npm run validate:refs',
      'npm run validate:skills',
      'npm run quality',
      'bmad workspace',
      'review-manifest.json',
      'ARCHIVE_REVIEW_MANIFEST_INVALID',
      'DIFF_SOURCE_UNSUPPORTED',
      'diff',
      '--left',
      '--right',
      'evidence-index.json',
      'archiveVersion: 2',
      'DIFF_ARCHIVE_INVALID',
      'verify-archive',
      'package-lock.json',
      'yarn.lock',
      'tools/workspace/command-registry.js',
      'command classes',
      'Read-only commands leave Workspace Session artifacts unchanged',
      'unsafe archive paths',
      'Release Note 6.6.0',
      'manual, evidence-only',
      'hidden execution',
      'live adapter activation',
      'Historical delivery notes are compiled under',
      'stable contract names',
      'Capability Verifier',
    ]) {
      assert(releaseReadiness.includes(text), `release checklist includes ${text}`, releaseReadiness);
    }
    for (const text of [
      'Validator Owner And Manual Review Map',
      'Workspace Graph Evidence',
      'Route Trust And Advisory Evidence',
      'Planning Capabilities',
      'Capability Contract',
      'Self-Improve Safety Loop',
      'Exact Release Gate',
      'manual-review note',
    ]) {
      assert(releaseReadiness.includes(text), `release checklist maps validator owner for ${text}`, releaseReadiness);
    }

    const capabilityContract = fs.readFileSync(path.join(workspaceDocsRoot, 'capability-contract.md'), 'utf8');
    for (const text of [
      'operator.codex.affordance',
      'features.goals',
      'features.multi_agent',
      'features.codex_hooks',
      'Capability Verification',
      'bmad-workspace-capability-verdict',
      'requiresGrant',
      '_bmad/custom',
      'Capability Profile Registry',
      'support promotion',
    ]) {
      assert(capabilityContract.includes(text), `capability contract includes ${text}`, capabilityContract);
    }

    const capabilityProfileRegistry = JSON.parse(fs.readFileSync(capabilityProfileRegistryPath, 'utf8'));
    assert(capabilityProfileRegistry.schemaVersion === 1, 'capability profile registry uses schema version 1');
    assert(Array.isArray(capabilityProfileRegistry.profiles), 'capability profile registry has profiles array');
    assert(capabilityProfileRegistry.profiles.length === 2, 'capability profile registry seeds current declared capabilities');
    const supportedProfileStates = new Set(['proposed', 'experimental', 'supported', 'stale', 'deprecated', 'invalid', 'removed']);
    const declaredCapabilityIds = new Set(createCapabilityContract(repoRoot).capabilities.map((capability) => capability.id));
    const profileIds = new Set();
    for (const [index, profile] of capabilityProfileRegistry.profiles.entries()) {
      const label = `capability profile registry profiles[${index}]`;
      for (const field of ['profileId', 'capabilityId', 'toolName', 'supportState', 'trustBoundary', 'evidenceRefs', 'repairHint']) {
        assert(field in profile, `${label} includes ${field}`, JSON.stringify(profile, null, 2));
      }
      assert(!profileIds.has(profile.profileId), `${label} profileId is unique`, JSON.stringify(profile, null, 2));
      profileIds.add(profile.profileId);
      assert(declaredCapabilityIds.has(profile.capabilityId), `${label} maps to declared capability id`, JSON.stringify(profile, null, 2));
      assert(supportedProfileStates.has(profile.supportState), `${label} uses known support state`, JSON.stringify(profile, null, 2));
      assert(Array.isArray(profile.evidenceRefs), `${label} evidenceRefs is array`, JSON.stringify(profile, null, 2));
      if (profile.supportState === 'supported') {
        assert(profile.evidenceRefs.length > 0, `${label} supported profile has evidence refs`, JSON.stringify(profile, null, 2));
      }
      if (['stale', 'deprecated', 'invalid', 'removed'].includes(profile.supportState)) {
        assert(
          typeof profile.repairHint === 'string' && profile.repairHint.trim() !== '',
          `${label} non-supported profile has repair hint`,
          JSON.stringify(profile, null, 2),
        );
      }
    }

    const templateIndex = fs.readFileSync(templateIndexPath, 'utf8');
    assert(templateIndex.includes('capability-request.template.json'), 'template index links capability request template', templateIndex);

    const capabilityRequestTemplate = JSON.parse(fs.readFileSync(capabilityRequestTemplatePath, 'utf8'));
    assert(
      capabilityRequestTemplate.kind === 'bmad-workspace-capability-request',
      'Capability Request template uses request kind',
      JSON.stringify(capabilityRequestTemplate, null, 2),
    );
    assert(capabilityRequestTemplate.schemaVersion === 1, 'Capability Request template uses schema version 1');
    assert(
      capabilityRequestTemplate.observations.every((observation) => observation.details?.reviewedAt === '2026-05-05'),
      'Capability Request template pins reviewed date',
      JSON.stringify(capabilityRequestTemplate.observations, null, 2),
    );
    for (const sourceUrl of ['https://developers.openai.com/codex/config-advanced', 'https://developers.openai.com/codex/app-server']) {
      assert(
        capabilityRequestTemplate.observations.some((observation) => observation.details?.sourceUrl === sourceUrl),
        `Capability Request template cites official Codex doc ${sourceUrl}`,
        JSON.stringify(capabilityRequestTemplate.observations, null, 2),
      );
    }
    const capabilityTemplateVerdict = verifyCapabilityRequest(capabilityRequestTemplate);
    assert(
      capabilityTemplateVerdict.ok === true,
      'Capability Request template verifies successfully',
      JSON.stringify(capabilityTemplateVerdict, null, 2),
    );
    assert(
      capabilityTemplateVerdict.observations.some((observation) => observation.code === 'CODEX_CONFIG_ADVANCED_DOCS'),
      'Capability Request template keeps Codex docs advisory',
      JSON.stringify(capabilityTemplateVerdict, null, 2),
    );

    const operatorGuide = fs.readFileSync(path.join(workspaceDocsRoot, 'operator-guide.md'), 'utf8');
    for (const text of ['Codex Goals and Slash Commands', '`/goal`', 'goal file passed to', 'manual evidence']) {
      assert(operatorGuide.includes(text), `operator guide includes ${text}`, operatorGuide);
    }
    assert(operatorGuide.includes('# PSEUDO'), 'operator guide labels pseudo command sequence', operatorGuide);

    const operatorQuickstart = fs.readFileSync(path.join(workspaceDocsRoot, 'operator-quickstart.md'), 'utf8');
    for (const text of [
      'codex/bmad-workspace',
      '`codex/workspace` branch is absent',
      '## Runnable',
      '## PSEUDO',
      '# PSEUDO',
      '## Sample Output',
      '```mermaid',
      'verify-archive',
      'manual evidence only',
    ]) {
      assert(operatorQuickstart.includes(text), `operator quickstart includes ${text}`, operatorQuickstart);
    }

    const workspaceRunbook = fs.readFileSync(path.join(workspaceDocsRoot, 'templates', 'workspace-runbook.md'), 'utf8');
    for (const text of ['# BMAD Workspace Runbook', 'Setup Gate', 'Manual Execution', 'Review Manifest', 'Archive path']) {
      assert(workspaceRunbook.includes(text), `workspace runbook includes ${text}`, workspaceRunbook);
    }

    const releaseNote = fs.readFileSync(path.join(workspaceDocsRoot, 'release-note-6.6.0.md'), 'utf8');
    for (const text of [
      'BMAD Workspace Release Note 6.6.0',
      'manual, evidence-only',
      'does not include a runtime execution engine',
      'scheduler',
      'restore/replay',
      'merge',
      'promotion',
      'live adapter activation',
      'npm ci && npm run quality',
    ]) {
      assert(releaseNote.includes(text), `release note includes ${text}`, releaseNote);
    }

    const currentState = fs.readFileSync(currentStatePath, 'utf8');
    for (const text of ['Manual Executor Contract', 'Result Ledger', 'Review Manifest', 'archiveVersion: 2']) {
      assert(currentState.includes(text), `current state includes ${text}`, currentState);
    }
    assert(currentState.includes('Capability verification'), 'current state documents capability verification', currentState);

    const sessionLifecycle = fs.readFileSync(sessionLifecyclePath, 'utf8');
    for (const state of ['launched', 'intake-recorded', 'packet-ready', 'review-recorded', 'closeout-recorded', 'blocked']) {
      assert(sessionLifecycle.includes(`\`${state}\``), `session lifecycle documents ${state}`, sessionLifecycle);
    }

    const guardrails = fs.readFileSync(guardrailsPath, 'utf8');
    for (const text of [
      'workspace run',
      'workspace compare',
      'restore',
      'replay',
      'merge',
      'promotion',
      'live adapter',
      'slash-command or tool output treated as Workspace authority',
      'Codex slash command',
    ]) {
      assert(guardrails.includes(text), `guardrails document forbidden ${text}`, guardrails);
    }

    const selfImprovementCodex = fs.readFileSync(selfImprovementCodexPath, 'utf8');
    for (const text of ['Capability Verifier Boundary', 'declared-contract compatibility', 'continuation permission']) {
      assert(selfImprovementCodex.includes(text), `self-improvement Codex doc includes ${text}`, selfImprovementCodex);
    }

    const customizeSkill = fs.readFileSync(customizeSkillPath, 'utf8');
    for (const text of ['Capability Verification Authoring', 'capability-request.template.json', '_bmad/custom']) {
      assert(customizeSkill.includes(text), `bmad-customize source skill includes ${text}`, customizeSkill);
    }

    const selfImproveSkill = fs.readFileSync(selfImproveSkillPath, 'utf8');
    for (const text of ['Capability Verifier Boundary', 'declared-contract compatibility', 'Evidence Gate']) {
      assert(selfImproveSkill.includes(text), `bmad-self-improve source skill includes ${text}`, selfImproveSkill);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert(fs.existsSync(packageLockPath), 'npm lockfile exists');
    assert(!fs.existsSync(yarnLockPath), 'yarn lockfile is absent');
    assert(packageJson.scripts.quality.includes('npm run test:workspace'), 'quality script includes Workspace tests');
    assert(packageJson.scripts.quality.includes('npm run test:urls'), 'quality script includes URL tests');

    const qualityWorkflow = fs.readFileSync(qualityWorkflowPath, 'utf8');
    for (const command of [
      'npm run test:install',
      'npm run test:urls',
      'npm run test:workspace',
      'npm run validate:refs',
      'npm run validate:skills',
    ]) {
      assert(qualityWorkflow.includes(command), `quality workflow includes ${command}`, qualityWorkflow);
    }

    const workspaceCommand = fs.readFileSync(workspaceCommandPath, 'utf8');
    const workspaceCommandRegistry = fs.readFileSync(workspaceCommandRegistryPath, 'utf8');
    assert(workspaceCommand.includes('renderWorkspaceHelp'), 'workspace CLI uses command registry help', workspaceCommand);
    assert(workspaceCommand.includes('WORKSPACE_OPTIONS.map'), 'workspace CLI uses registry options', workspaceCommand);
    assert(workspaceCommand.includes('isWorkspaceCommand'), 'workspace CLI validates commands through registry', workspaceCommand);
    assert(
      JSON.stringify(WORKSPACE_COMMAND_NAMES) === JSON.stringify(EXPECTED_WORKSPACE_COMMAND_NAMES),
      'workspace command registry preserves public command sequence',
      JSON.stringify(WORKSPACE_COMMAND_NAMES),
    );
    for (const command of WORKSPACE_COMMAND_NAMES) {
      assert(
        workspaceCommandRegistry.includes(`name: '${command}'`),
        `workspace command registry includes ${command}`,
        workspaceCommandRegistry,
      );
    }
    for (const commandClass of ['read', 'write', 'destructive', 'grant-gated']) {
      assert(
        WORKSPACE_COMMANDS.some((command) => command.class === commandClass),
        `workspace command registry includes ${commandClass} class`,
        JSON.stringify(WORKSPACE_COMMANDS, null, 2),
      );
      assert(commandContract.includes(`\`${commandClass}\``), `command contract documents ${commandClass} class`, commandContract);
    }
    for (const option of WORKSPACE_OPTIONS) {
      assert(
        workspaceCommandRegistry.includes(option.flags),
        `workspace command registry includes option ${option.flags}`,
        workspaceCommandRegistry,
      );
    }
    assert(!workspaceCommandRegistry.includes("name: 'run'"), 'workspace command registry omits run command', workspaceCommandRegistry);
    assert(
      !workspaceCommandRegistry.includes("name: 'compare'"),
      'workspace command registry omits compare command',
      workspaceCommandRegistry,
    );

    const buildDocs = fs.readFileSync(buildDocsPath, 'utf8');
    assert(buildDocs.includes('workspace/history/'), 'LLM docs exclude Workspace history records', buildDocs);

    const releaseRefFindings = findWorkspaceReleaseRefsOutsideHistory();
    assert(releaseRefFindings.length === 0, 'Workspace release refs stay inside history artifacts', releaseRefFindings.join('\n'));
    const removedContractFindings = findWorkspaceRemovedContractRefsOutsideHistory();
    assert(
      removedContractFindings.length === 0,
      'removed Workspace contract refs stay out of current surfaces',
      removedContractFindings.join('\n'),
    );
    const archiveContractFindings = findWorkspaceArchiveContractDrift();
    assert(archiveContractFindings.length === 0, 'archive contract surfaces stay current', archiveContractFindings.join('\n'));
  }

  section('Workspace Capability Verifier');

  {
    const verdict = verifyCapabilityRequest(validCapabilityRequest());

    assert(
      verdict.kind === 'bmad-workspace-capability-verdict',
      'capability verifier returns verdict kind',
      JSON.stringify(verdict, null, 2),
    );
    assert(verdict.schemaVersion === 1, 'capability verifier returns schema version 1', JSON.stringify(verdict, null, 2));
    assert(
      verdict.ok === true,
      'capability verifier accepts exact declared id with compatible constraints',
      JSON.stringify(verdict, null, 2),
    );
    assert(verdict.request.id === 'evidence.graph.repo-intake', 'capability verifier echoes request id', JSON.stringify(verdict, null, 2));
    assert(
      verdict.matchedDeclaration.id === 'evidence.graph.repo-intake',
      'capability verifier records matched declaration',
      JSON.stringify(verdict, null, 2),
    );
    assert(verdict.errors.length === 0, 'capability verifier success has no errors', JSON.stringify(verdict, null, 2));
  }

  {
    const verdict = verifyCapabilityRequest(validCapabilityRequest({ request: { id: 'Evidence.Graph.Repo-Intake' } }));
    assert(verdict.ok === false, 'capability verifier rejects case-mismatched ids', JSON.stringify(verdict, null, 2));
    assert(verdict.matchedDeclaration === null, 'case mismatch has no matched declaration', JSON.stringify(verdict, null, 2));
    assert(
      verdict.errors.some((error) => error.code === 'CAPABILITY_NOT_DECLARED'),
      'case mismatch names CAPABILITY_NOT_DECLARED',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const capability = validCapabilityContract().capabilities[0];
    const verdict = verifyCapabilityRequest(validCapabilityRequest({ capabilities: [capability, { ...capability }] }));
    assert(verdict.ok === false, 'capability verifier rejects duplicate capability ids', JSON.stringify(verdict, null, 2));
    assert(
      verdict.errors.some((error) => error.code === 'CAPABILITY_ID_DUPLICATE'),
      'duplicate id rejection names CAPABILITY_ID_DUPLICATE',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const [capability] = validCapabilityContract().capabilities;
    const malformed = { ...capability };
    delete malformed.outputs;
    const verdict = verifyCapabilityRequest(validCapabilityRequest({ capabilities: [malformed] }));
    assert(verdict.ok === false, 'capability verifier rejects missing embedded declaration fields', JSON.stringify(verdict, null, 2));
    assert(
      verdict.errors.some((error) => error.code === 'REQUEST_INVALID' && error.path === '$.capabilities[0].outputs'),
      'missing embedded declaration field names REQUEST_INVALID and path',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const [capability] = validCapabilityContract().capabilities;
    const verdict = verifyCapabilityRequest(
      validCapabilityRequest({
        capabilities: [{ ...capability, allowedInNormalSession: 'true' }],
      }),
    );
    assert(verdict.ok === false, 'capability verifier rejects invalid embedded declaration fields', JSON.stringify(verdict, null, 2));
    assert(
      verdict.errors.some((error) => error.code === 'REQUEST_INVALID' && error.path === '$.capabilities[0].allowedInNormalSession'),
      'invalid embedded declaration field names REQUEST_INVALID and path',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const verdict = verifyCapabilityRequest(
      validCapabilityRequest({
        request: { id: ' evidence.graph.repo-intake' },
        extraFields: { runtimeAvailable: true },
      }),
    );
    assert(verdict.ok === false, 'capability verifier rejects malformed request fields', JSON.stringify(verdict, null, 2));
    assert(
      verdict.errors.some((error) => error.code === 'REQUEST_INVALID'),
      'malformed request names REQUEST_INVALID',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const [capability] = validCapabilityContract().capabilities;
    const verdict = verifyCapabilityRequest(
      validCapabilityRequest({
        request: { sessionType: 'base-improvement' },
        capabilities: [{ ...capability, allowedInBaseImprovement: false }],
      }),
    );
    assert(verdict.ok === false, 'capability verifier rejects disallowed session type', JSON.stringify(verdict, null, 2));
    assert(
      verdict.matchedDeclaration.id === capability.id,
      'session denial still records exact declaration',
      JSON.stringify(verdict, null, 2),
    );
    assert(
      verdict.errors.some((error) => error.code === 'SESSION_NOT_ALLOWED'),
      'session denial names SESSION_NOT_ALLOWED',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    for (const [field, code, value] of [
      ['group', 'GROUP_MISMATCH', 'evidence.docs'],
      ['provider', 'PROVIDER_MISMATCH', 'codex'],
      ['interface', 'INTERFACE_MISMATCH', 'app-server'],
    ]) {
      const verdict = verifyCapabilityRequest(validCapabilityRequest({ request: { [field]: value } }));
      assert(verdict.ok === false, `capability verifier rejects ${field} mismatch`, JSON.stringify(verdict, null, 2));
      assert(
        verdict.errors.some((error) => error.code === code),
        `${field} mismatch names ${code}`,
        JSON.stringify(verdict, null, 2),
      );
    }
  }

  {
    const undeclaredWrite = verifyCapabilityRequest(validCapabilityRequest({ request: { writes: ['workspace-base'] } }));
    assert(undeclaredWrite.ok === false, 'capability verifier rejects undeclared writes', JSON.stringify(undeclaredWrite, null, 2));
    assert(
      undeclaredWrite.errors.some((error) => error.code === 'WRITE_NOT_DECLARED'),
      'undeclared write names WRITE_NOT_DECLARED',
      JSON.stringify(undeclaredWrite, null, 2),
    );
    assert(
      undeclaredWrite.errors.some((error) => error.code === 'WRITE_FORBIDDEN'),
      'forbidden write names WRITE_FORBIDDEN',
      JSON.stringify(undeclaredWrite, null, 2),
    );

    const undeclaredOutput = verifyCapabilityRequest(validCapabilityRequest({ request: { outputs: ['runtime.json'] } }));
    assert(undeclaredOutput.ok === false, 'capability verifier rejects undeclared outputs', JSON.stringify(undeclaredOutput, null, 2));
    assert(
      undeclaredOutput.errors.some((error) => error.code === 'OUTPUT_NOT_DECLARED'),
      'undeclared output names OUTPUT_NOT_DECLARED',
      JSON.stringify(undeclaredOutput, null, 2),
    );
  }

  {
    const executorCapability = {
      id: 'executor.codex.manual',
      group: 'executor.codex',
      provider: 'codex',
      interface: 'manual-executor-contract',
      allowedInNormalSession: true,
      allowedInBaseImprovement: true,
      requiresGrant: true,
      writes: ['workspace-session/packets'],
      forbiddenWrites: ['workspace-base', 'target-repo'],
      outputs: ['executor-contract.json'],
      upstreamGapProofRequired: false,
    };
    const verdict = verifyCapabilityRequest(
      validCapabilityRequest({
        request: {
          id: 'executor.codex.manual',
          group: 'executor.codex',
          provider: 'codex',
          interface: 'manual-executor-contract',
          writes: ['workspace-session/packets'],
          outputs: ['executor-contract.json'],
        },
        capabilities: [executorCapability],
        observations: [
          {
            code: 'CODEX_DOCS_FIXTURE',
            message: 'Codex app-server docs reviewed for advisory tool awareness.',
            details: { sourceUrl: 'https://developers.openai.com/codex/app-server', reviewedAt: '2026-05-05' },
          },
        ],
      }),
    );
    assert(verdict.ok === true, 'capability verifier does not fail on requiresGrant', JSON.stringify(verdict, null, 2));
    assert(
      verdict.matchedDeclaration.requiresGrant === true,
      'capability verifier reports requiresGrant',
      JSON.stringify(verdict, null, 2),
    );
    assert(
      verdict.observations.some((observation) => observation.code === 'CAPABILITY_REQUIRES_GRANT'),
      'requiresGrant is advisory observation only',
      JSON.stringify(verdict, null, 2),
    );
    assert(
      verdict.observations.some((observation) => observation.code === 'CODEX_DOCS_FIXTURE'),
      'Codex tool awareness remains advisory observation',
      JSON.stringify(verdict, null, 2),
    );
  }

  {
    const contractsSource = fs.readFileSync(path.join(repoRoot, 'tools', 'workspace', 'contracts.js'), 'utf8');
    const verifierSource = fs.readFileSync(path.join(repoRoot, 'tools', 'workspace', 'capability-verifier.js'), 'utf8');
    for (const forbidden of [
      '_bmad/custom',
      '~/.codex',
      '.codex/config',
      'capability-profile-registry',
      'build-repository-graph',
      'node:child_process',
      'node:http',
      'node:https',
    ]) {
      assert(!contractsSource.includes(forbidden), `capability verifier does not depend on ${forbidden}`, contractsSource);
      assert(!verifierSource.includes(forbidden), `capability CLI wrapper does not depend on ${forbidden}`, verifierSource);
    }
  }

  section('Workspace Compiled History');

  {
    const historyRoot = path.join(repoRoot, 'docs', 'workspace', 'history');
    const historyArchive = fs.readFileSync(path.join(historyRoot, 'compiled-bmads.md'), 'utf8');
    const releaseSummaries = historyArchive.match(/^### V\d+$/gm) || [];
    assert(releaseSummaries.length >= 10, 'Compiled history preserves release summaries');
    assert(historyArchive.includes('Acceptance anchors'), 'Compiled history maps acceptance anchors');
    assert(historyArchive.includes('Traceability markers'), 'Compiled history points to evidence markers');
    assert(
      ['Evidence', 'First Code Surface', 'Test Target'].some((text) => historyArchive.includes(text)),
      'Compiled history points to evidence',
      historyArchive,
    );
  }

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
