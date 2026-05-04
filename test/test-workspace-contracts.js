/**
 * BMAD Workspace Contract Tests
 *
 * Public behavior checks for the BMAD Workspace V1 artifact contract.
 * Usage: node test/test-workspace-contracts.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateCapabilityContract, validateWorkPacket } = require('../tools/workspace/contracts');
const { buildSessionSetup } = require('../tools/workspace/packet');
const { validateBaseImprovementSessionKit, validateVendorSnapshots } = require('../tools/workspace/templates');

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

function runTests() {
  section('BMAD Work Packet');

  {
    const result = validateWorkPacket(validWorkPacket());
    assert(result.ok === true, 'valid session packet is accepted', result.errors.join('; '));
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
    assert(skillContent.includes('bmad workspace status'), 'source skill documents workspace status');
    assert(!skillContent.includes('--mission-id'), 'source skill omits legacy mission option');

    const moduleHelp = fs.readFileSync(moduleHelpPath, 'utf8');
    assert(moduleHelp.includes('Core,bmad-workspace,'), 'module-help registers bmad-workspace skill');
    assert(moduleHelp.includes('Core,bmad-workspace,BMAD Workspace,WS,'), 'module-help registers WS menu code');
    assert(!moduleHelp.includes(oldSkillName), 'module-help omits old workspace skill');
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

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
