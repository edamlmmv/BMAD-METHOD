/**
 * BMAD Workspace Contract Tests
 *
 * Public behavior checks for the BMAD Workspace V1 artifact contract.
 * Usage: node test/test-workspace-contracts.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateCapabilityContract, validateMissionPacket } = require('../tools/workspace/contracts');
const { validateSelfImprovementPacketKit } = require('../tools/workspace/templates');

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

function validMissionPacket() {
  return {
    id: 'mission-2026-05-04-example',
    bmadWorkflow: 'bmad-quick-dev',
    goal: 'Fix the reported bug',
    repoIntakeRefs: ['intake/repo-intake.json'],
    constraints: ['Do not mutate Workspace Base'],
    grants: ['grants.json'],
    acceptanceCriteria: ['Tests pass', 'Worktree Review ready'],
    capabilityContractRef: 'capabilities.json',
    renderedPromptRef: 'packets/rendered-prompt.md',
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
        allowedInNormalMission: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['mission-workspace/intake'],
        forbiddenWrites: ['workspace-base'],
        outputs: ['repo-intake.json', 'graph.json', 'provenance.json'],
        upstreamGapProofRequired: false,
      },
    ],
  };
}

function runTests() {
  section('BMAD Mission Packet');

  {
    const result = validateMissionPacket(validMissionPacket());
    assert(result.ok === true, 'valid mission packet is accepted', result.errors.join('; '));
  }

  {
    const packet = validMissionPacket();
    delete packet.acceptanceCriteria;
    const result = validateMissionPacket(packet);
    assert(result.ok === false, 'packet without acceptanceCriteria is rejected');
    assert(
      result.errors.some((error) => error.includes('acceptanceCriteria')),
      'packet rejection names acceptanceCriteria',
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
      allowedInNormalMission: false,
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

  section('Self-Improvement Packet Kit');

  {
    const templateRoot = path.join(__dirname, '..', 'docs', 'workspace', 'templates');
    const result = validateSelfImprovementPacketKit(templateRoot);
    assert(result.ok === true, 'self-improvement packet kit validates', result.errors.join('; '));
  }

  {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-template-missing-'));
    try {
      const result = validateSelfImprovementPacketKit(tempRoot);
      assert(result.ok === false, 'self-improvement packet kit rejects missing templates');
      assert(
        result.errors.some((error) => error.includes('bmad-work-packet.template.json')),
        'missing packet kit rejection names Work Packet template',
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
    assert(skillContent.includes('Compatibility'), 'source skill confines legacy mission language to compatibility guidance');

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

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
