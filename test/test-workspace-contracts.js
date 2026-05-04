/**
 * BMAD Workspace Contract Tests
 *
 * Public behavior checks for the BMAD Workspace V13 artifact contract.
 * Usage: node test/test-workspace-contracts.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateCapabilityContract, validateWorkPacket } = require('../tools/workspace/contracts');
const { validateCloseoutArtifact } = require('../tools/workspace/closeout');
const { FORBIDDEN_EXECUTOR_ACTIONS, validateExecutorContract } = require('../tools/workspace/executor-contract');
const { buildSessionSetup } = require('../tools/workspace/packet');
const { scanForSecrets, validateResultArtifact } = require('../tools/workspace/result');
const { createRouteableCatalog, routeWorkspace } = require('../tools/workspace/routing');
const { validateBaseImprovementSessionKit, validateVendorSnapshots } = require('../tools/workspace/templates');

const repoRoot = path.join(__dirname, '..');
const WORKSPACE_COMMANDS = [
  'launch',
  'intake',
  'packet',
  'list',
  'status',
  'handoff',
  'evidence',
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
    sessionSetup: {
      zoomOut: { status: 'complete', ref: 'docs/workspace/v4-zoom-out.md' },
      ubiquitousLanguage: { status: 'complete', ref: 'UBIQUITOUS_LANGUAGE.md' },
      grillDecisions: { status: 'skipped', skipReason: 'Decision already captured.' },
      tddPlan: { status: 'complete', ref: 'docs/workspace/v4-backlog.md#tdd-order' },
    },
    reviewPlan: 'Run BMAD Code Review after execution',
  };
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
    outcome: 'completed',
    nextAction: 'manual-target-review',
    summary: 'Manual work finished and review evidence is ready.',
    evidenceRefs: ['results/result-001.json', 'review/summary.json'],
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

function runTests() {
  section('BMAD Work Packet');

  {
    const result = validateWorkPacket(validWorkPacket());
    assert(result.ok === true, 'valid session packet is accepted', result.errors.join('; '));
  }

  {
    const packet = validWorkPacket();
    packet.routing = validRouting();
    const result = validateWorkPacket(packet);
    assert(result.ok === true, 'packet accepts V8 routing metadata', result.errors.join('; '));
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
      ref: 'docs/workspace/v4-zoom-out.md',
      refType: 'file',
      resolvedRef: '/tmp/docs/workspace/v4-zoom-out.md',
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
    assert(result.ok === true, 'packet accepts V5 setup ref metadata', result.errors.join('; '));
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
    packet.missionId = packet.sessionId;
    const result = validateWorkPacket(packet);
    assert(result.ok === false, 'packet rejects V3 mission fields');
    assert(
      result.errors.some((error) => error.includes('v3-workspace-artifact-unsupported')),
      'legacy packet rejection names v3-workspace-artifact-unsupported',
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
    assert(skillContent.includes('bmad workspace diff'), 'source skill documents workspace diff');
    assert(skillContent.includes('bmad workspace result'), 'source skill documents workspace result');
    assert(skillContent.includes('bmad workspace closeout'), 'source skill documents workspace closeout');
    assert(skillContent.includes('bmad workspace archive'), 'source skill documents workspace archive');
    assert(skillContent.includes('bmad workspace verify-archive'), 'source skill documents workspace verify-archive');
    assert(skillContent.includes('Executor Contract'), 'source skill documents Executor Contract');
    assert(skillContent.includes('executionMode: manual'), 'source skill documents manual execution mode');
    assert(skillContent.includes('--workflow <skill[:action]>'), 'source skill documents workflow routing override');
    assert(skillContent.includes('routing.routingSchemaVersion'), 'source skill documents routing schema');
    assert(!skillContent.includes('--mission-id'), 'source skill omits legacy mission option');

    const moduleHelp = fs.readFileSync(moduleHelpPath, 'utf8');
    assert(moduleHelp.includes('Core,bmad-workspace,'), 'module-help registers bmad-workspace skill');
    assert(moduleHelp.includes('Core,bmad-workspace,BMAD Workspace,WS,'), 'module-help registers WS menu code');
    assert(moduleHelp.includes('archive diff'), 'module-help documents archive diff');
    assert(!moduleHelp.includes(oldSkillName), 'module-help omits old workspace skill');
  }

  section('V15 Release Readiness Contract');

  {
    const workspaceDocsRoot = path.join(repoRoot, 'docs', 'workspace');
    const indexPath = path.join(workspaceDocsRoot, 'index.md');
    const architecturePath = path.join(workspaceDocsRoot, 'architecture.md');
    const commandContractPath = path.join(workspaceDocsRoot, 'command-contract.md');
    const releaseReadinessPath = path.join(workspaceDocsRoot, 'v15-release-readiness.md');
    const qualityWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'quality.yaml');
    const packageJsonPath = path.join(repoRoot, 'package.json');
    const packageLockPath = path.join(repoRoot, 'package-lock.json');
    const yarnLockPath = path.join(repoRoot, 'yarn.lock');
    const workspaceCommandPath = path.join(repoRoot, 'tools', 'installer', 'commands', 'workspace.js');

    for (const docName of [
      'v13-prd.md',
      'v13-backlog.md',
      'v13-acceptance-tests.md',
      'v13-traceability.md',
      'command-contract.md',
      'v13-release-readiness.md',
      'operator-guide.md',
      'v14-prd.md',
      'v14-backlog.md',
      'v14-acceptance-tests.md',
      'v14-traceability.md',
      'v14-release-readiness.md',
      'v15-prd.md',
      'v15-backlog.md',
      'v15-acceptance-tests.md',
      'v15-traceability.md',
      'v15-release-readiness.md',
    ]) {
      assert(fs.existsSync(path.join(workspaceDocsRoot, docName)), `Workspace artifact exists: ${docName}`);
    }

    const index = fs.readFileSync(indexPath, 'utf8');
    for (const link of [
      './command-contract.md',
      './v13-prd.md',
      './v13-acceptance-tests.md',
      './v13-backlog.md',
      './v13-traceability.md',
      './v13-release-readiness.md',
      './operator-guide.md',
      './v14-prd.md',
      './v14-acceptance-tests.md',
      './v14-backlog.md',
      './v14-traceability.md',
      './v14-release-readiness.md',
      './v15-prd.md',
      './v15-acceptance-tests.md',
      './v15-backlog.md',
      './v15-traceability.md',
      './v15-release-readiness.md',
    ]) {
      assert(index.includes(link), `workspace index links ${link}`, index);
    }

    const architecture = fs.readFileSync(architecturePath, 'utf8');
    assert(architecture.includes('The V15 system is'), 'architecture states V15 current system', architecture);
    assert(architecture.includes('## Evidence Index'), 'architecture documents Evidence Index', architecture);
    assert(architecture.includes('## Workspace Diff'), 'architecture documents Workspace Diff', architecture);
    assert(architecture.includes('## Derived Lifecycle'), 'architecture documents derived lifecycle', architecture);
    assert(!architecture.includes('The V4 system is'), 'architecture omits stale V4 current-system framing', architecture);
    assert(
      !architecture.includes('workspace launch --repo <path> --goal <file> --grant <grant.json>'),
      'architecture omits stale V1/V4 interface sketch',
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
    for (const command of WORKSPACE_COMMANDS) {
      assert(architecture.includes(`bmad workspace ${command}`), `architecture documents command ${command}`, architecture);
    }

    const commandContract = fs.readFileSync(commandContractPath, 'utf8');
    for (const command of WORKSPACE_COMMANDS) {
      assert(commandContract.includes(`\`${command}\``), `command contract documents ${command}`, commandContract);
    }
    for (const text of [
      'handoff` writes Markdown',
      'every other command writes JSON',
      'Filesystem Effect',
      'Stable Error Families',
      'V15 does not add `workspace run`',
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
    ]) {
      assert(commandContract.includes(text), `command contract includes ${text}`, commandContract);
    }

    const releaseReadiness = fs.readFileSync(releaseReadinessPath, 'utf8');
    for (const text of [
      'npm ci',
      'npm run test:workspace',
      'npm run validate:refs',
      'npm run validate:skills',
      'npm run quality',
      'bmad workspace',
      'diff',
      '--left',
      '--right',
      'evidence-index.json',
      'archiveVersion: 2',
      'DIFF_ARCHIVE_INVALID',
      'verify-archive',
      'package-lock.json',
      'yarn.lock',
      'hidden execution',
      'live adapter activation',
    ]) {
      assert(releaseReadiness.includes(text), `release checklist includes ${text}`, releaseReadiness);
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
    for (const command of WORKSPACE_COMMANDS) {
      assert(workspaceCommand.includes(`'${command}'`), `workspace command inventory includes ${command}`, workspaceCommand);
    }
    assert(!workspaceCommand.includes("'run'"), 'workspace command inventory omits run command', workspaceCommand);
    assert(!workspaceCommand.includes("'compare'"), 'workspace command inventory omits compare command', workspaceCommand);
  }

  section('V2 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v2-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V2 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT2-001', 'S12', 'test/test-workspace-cli.js', 'test/test-workspace-contracts.js']) {
      assert(traceability.includes(text), `V2 traceability maps ${text}`, traceability);
    }
  }

  section('V3 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v3-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V3 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT3-001', 'S20', 'test/test-workspace-cli.js', 'tools/workspace/']) {
      assert(traceability.includes(text), `V3 traceability maps ${text}`, traceability);
    }
  }

  section('V4 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v4-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V4 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT4-001', 'S25', 'test/test-workspace-cli.js', 'tools/workspace/']) {
      assert(traceability.includes(text), `V4 traceability maps ${text}`, traceability);
    }
    assert(!traceability.includes('| Planned |'), 'V4 traceability has no Planned story rows', traceability);
  }

  section('V5 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v5-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V5 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT5-001', 'S33', 'test/test-workspace-cli.js', 'tools/workspace/status.js']) {
      assert(traceability.includes(text), `V5 traceability maps ${text}`, traceability);
    }
  }

  section('V6 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v6-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V6 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT6-001', 'S43', 'tools/workspace/list.js', 'tools/workspace/handoff.js']) {
      assert(traceability.includes(text), `V6 traceability maps ${text}`, traceability);
    }
  }

  section('V7 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v7-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V7 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT7-001', 'S55', 'tools/workspace/archive.js', 'verify-archive']) {
      assert(traceability.includes(text), `V7 traceability maps ${text}`, traceability);
    }
  }

  section('V8 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v8-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V8 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT8-001', 'S72', 'tools/workspace/routing.js', 'ROUTE_WORKFLOW_UNKNOWN']) {
      assert(traceability.includes(text), `V8 traceability maps ${text}`, traceability);
    }
  }

  section('V9 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v9-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V9 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT9-001', 'S84', 'tools/workspace/result.js', 'RESULT_SECRET_DETECTED']) {
      assert(traceability.includes(text), `V9 traceability maps ${text}`, traceability);
    }
  }

  section('V10 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v10-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V10 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT10-001', 'S94', 'tools/workspace/executor-contract.js', 'EXECUTOR_CONTRACT_INVALID']) {
      assert(traceability.includes(text), `V10 traceability maps ${text}`, traceability);
    }
  }

  section('V12 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v12-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V12 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT12-001', 'S115', 'tools/workspace/closeout.js', 'CLOSEOUT_SECRET_DETECTED']) {
      assert(traceability.includes(text), `V12 traceability maps ${text}`, traceability);
    }
  }

  section('V13 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v13-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V13 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT13-001', 'S126', 'docs/workspace/command-contract.md', '.github/workflows/quality.yaml']) {
      assert(traceability.includes(text), `V13 traceability maps ${text}`, traceability);
    }
  }

  section('V14 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v14-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V14 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT14-001', 'S134', 'tools/workspace/evidence.js', 'ARCHIVE_EVIDENCE_INDEX_INVALID']) {
      assert(traceability.includes(text), `V14 traceability maps ${text}`, traceability);
    }
  }

  section('V15 Traceability');

  {
    const traceabilityPath = path.join(__dirname, '..', 'docs', 'workspace', 'v15-traceability.md');
    assert(fs.existsSync(traceabilityPath), 'V15 traceability artifact exists');

    const traceability = fs.existsSync(traceabilityPath) ? fs.readFileSync(traceabilityPath, 'utf8') : '';
    for (const text of ['AT15-001', 'S142', 'tools/workspace/diff.js', 'DIFF_ARCHIVE_INVALID']) {
      assert(traceability.includes(text), `V15 traceability maps ${text}`, traceability);
    }
  }

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
