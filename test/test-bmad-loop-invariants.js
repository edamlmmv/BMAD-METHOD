/**
 * BMAD Loop Invariant Tests
 *
 * Public behavior checks for the generic BMAD loop validator.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { LOOP_REFUSAL_MESSAGE, validateBmadLoopInvariants, validateGoalResolution } = require('../tools/validate-bmad-loop-invariants');

const repoRoot = path.join(__dirname, '..');
const validatorPath = path.join(repoRoot, 'tools', 'validate-bmad-loop-invariants.js');

function copyFile(root, relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);
  const targetPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-loop-invariants-'));
  for (const relativePath of [
    'docs/workspace/bmad-loop-automation-policy.md',
    'docs/workspace/bmad-loop.md',
    'docs/workspace/loop-platform-v1.md',
    'docs/workspace/loop-candidate-registry.md',
    'docs/workspace/templates/bmad-loop-codex-prompt.md',
    'docs/workspace/templates/bmad-loop-codex-resume-prompt.md',
    'docs/workspace/templates/bmad-loop-checkpoint.template.md',
    'docs/workspace/templates/bmad-loop-checkpoint.example.md',
    'docs/workspace/templates/workflow-bundle.template.md',
    'docs/workspace/templates/loop-party-mode-gate.template.md',
    'docs/workspace/templates/architecture-drift-review-prompt.template.md',
    'docs/workspace/templates/tool-leverage-review-prompt.template.md',
    'docs/workspace/templates/highest-leverage-official-mcp-addition-prompt.template.md',
    'docs/workspace/templates/capability-refactor-plan-prompt.template.md',
    'docs/workspace/templates/code-optimization-refactor-plan-prompt.template.md',
    'src/core-skills/bmad-architecture-drift-review-prompt/SKILL.md',
    'src/core-skills/bmad-tool-leverage-review-prompt/SKILL.md',
    'src/core-skills/bmad-highest-leverage-official-mcp-addition-prompt/SKILL.md',
    'src/core-skills/bmad-capability-refactor-plan-prompt/SKILL.md',
    'src/core-skills/bmad-code-optimization-refactor-plan-prompt/SKILL.md',
    'src/core-skills/module-help.csv',
    'src/core-skills/bmad-party-mode/SKILL.md',
    'src/core-skills/bmad-workspace/SKILL.md',
    'package.json',
  ]) {
    copyFile(root, relativePath);
  }
  copyDir(path.join(repoRoot, 'src/core-skills/bmad-loop'), path.join(root, 'src/core-skills/bmad-loop'));
  copyFile(root, 'tools/validate-bmad-loop-invariants.js');
  return root;
}

function replaceInFile(root, relativePath, search, replacement) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.replaceAll(search, replacement));
}

function assertInvalid(root, expectedFragment) {
  const result = validateBmadLoopInvariants({ projectRoot: root });
  assert.equal(result.ok, false, 'fixture should fail validation');
  assert(
    result.errors.some((error) => error.includes(expectedFragment)),
    `expected error containing "${expectedFragment}", got:\n${result.errors.join('\n')}`,
  );
}

function runValidatorCli(root) {
  return spawnSync(process.execPath, [validatorPath, '--project-root', root], {
    encoding: 'utf8',
    env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
  });
}

function testCurrentRepoValidates() {
  const result = validateBmadLoopInvariants({ projectRoot: repoRoot });
  assert.equal(result.ok, true, result.errors.join('\n'));
}

function testGoalResolutionRefusesEmptyGoal() {
  const result = validateGoalResolution({
    workflow: {
      goal_ref: '',
      scope: '',
      stop_condition: 'checkpoint written',
      quality_command: 'npm ci && npm run quality',
    },
  });
  assert.deepEqual(result, { ok: false, error: LOOP_REFUSAL_MESSAGE, inputSource: null });
}

function testGoalResolutionUsesDirectGoalFirst() {
  const result = validateGoalResolution({
    directGoal: 'Fix docs',
    workflow: {
      goal_ref: 'docs/goal.md',
      scope: 'docs only',
      stop_condition: 'checkpoint written',
      quality_command: 'npm ci && npm run quality',
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.inputSource, 'direct_operator_goal');
  assert.equal(result.goal, 'Fix docs');
  assert.equal(result.constrainedByScope, true);
}

function testGoalResolutionFallsBackToGoalRefThenScope() {
  const byRef = validateGoalResolution({
    workflow: {
      goal_ref: 'docs/goal.md',
      scope: 'docs only',
      stop_condition: 'checkpoint written',
      quality_command: 'npm ci && npm run quality',
    },
  });
  assert.equal(byRef.ok, true);
  assert.equal(byRef.inputSource, 'workflow.goal_ref');
  assert.equal(byRef.constrainedByScope, true);

  const byScope = validateGoalResolution({
    workflow: {
      goal_ref: '',
      scope: 'docs only',
      stop_condition: 'checkpoint written',
      quality_command: 'npm ci && npm run quality',
    },
  });
  assert.equal(byScope.ok, true);
  assert.equal(byScope.inputSource, 'workflow.scope');
}

function testMissingQualityCommandRefuses() {
  const result = validateGoalResolution({
    directGoal: 'Fix docs',
    workflow: {
      stop_condition: 'checkpoint written',
      quality_command: '',
    },
  });
  assert.deepEqual(result, { ok: false, error: LOOP_REFUSAL_MESSAGE, inputSource: null });
}

function testLoopInvariantCannotDisappear() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/bmad-loop-automation-policy.md', 'LOOP-AUTO-002', 'LOOP-AUTO-999');
  assertInvalid(root, 'LOOP_ID_UNKNOWN');
  assertInvalid(root, 'LOOP-AUTO-002');
}

function testGenericLoopRejectsSelfImproveDefaults() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-loop/customize.toml', 'codex/loop-', 'codex/self-improve-');
  assertInvalid(root, 'codex/self-improve-');
}

function testCheckpointExampleRequiresEvidenceBlock() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/bmad-loop-checkpoint.example.md', '```yaml bmad_loop_checkpoint', '```yaml');
  assertInvalid(root, 'bmad_loop_checkpoint');
}

function testCliUsesInvariantPrefix() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/bmad-loop-automation-policy.md', 'LOOP-AUTO-006', 'LOOP-AUTO-XXX');
  const result = runValidatorCli(root);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0, output);
  assert(output.includes('BMAD_LOOP_INVARIANT:'), output);
}

function testOverrideCannotInventUnsupportedWorkflowField() {
  const root = makeFixture();
  const overridePath = path.join(root, '_bmad', 'custom', 'bmad-loop.toml');
  fs.mkdirSync(path.dirname(overridePath), { recursive: true });
  fs.writeFileSync(overridePath, '[workflow]\nloop_queue = "bad"\n');
  assertInvalid(root, 'unsupported workflow field: loop_queue');
}

function testLoopDocsRejectAutomaticReadiness() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/bmad-loop.md',
    'Run `bmad-loop`; no automatic Implementation Readiness',
    'Run `bmad-check-implementation-readiness` for every loop',
  );
  assertInvalid(root, 'LOOP_READINESS_TRIGGER');
}

function testWorkspaceCannotOwnReadinessAuthority() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-workspace/SKILL.md',
    'BMAD remains the source of truth',
    'Workspace decides implementation readiness',
  );
  assertInvalid(root, 'LOOP_WORKSPACE_AUTHORITY');
}

function testCapabilityRefactorPlanDiscoveryAndBoundary() {
  const moduleHelp = fs.readFileSync(path.join(repoRoot, 'src/core-skills/module-help.csv'), 'utf8');
  assert(
    moduleHelp.includes('Core,bmad-capability-refactor-plan-prompt,Capability Refactor Plan Prompt,CBR,'),
    'module-help registers CBR capability refactor plan prompt skill',
  );
  assert.equal(moduleHelp.match(/,CBR,/g)?.length, 1, 'CBR menu code is unique');

  const templateIndex = fs.readFileSync(path.join(repoRoot, 'docs/workspace/templates/index.md'), 'utf8');
  assert(
    templateIndex.includes('capability-refactor-plan-prompt.template.md'),
    'template index exposes capability refactor plan prompt template',
  );

  const skillPath = path.join(repoRoot, 'src/core-skills/bmad-capability-refactor-plan-prompt/SKILL.md');
  assert(fs.existsSync(skillPath), 'capability refactor plan prompt source skill exists');
  const skill = fs.readFileSync(skillPath, 'utf8');
  for (const required of [
    'name: bmad-capability-refactor-plan-prompt',
    'planning-only',
    'local evidence refs',
    'no live tool calls',
    'does not edit files',
  ]) {
    assert(skill.includes(required), `capability refactor plan prompt skill declares ${required}`);
  }
  for (const required of [
    'Recommended Follow-Up',
    'Route:',
    'Why:',
    'Manual next step:',
    'Evidence still needed:',
    'bmad-capability-pack-forge',
    'bmad-self-improve',
    'bmad-workspace',
    'bmad-check-implementation-readiness',
    'bmad-agent-dev',
    'bmad-customize',
    'none',
  ]) {
    assert(skill.includes(required), `capability refactor plan prompt skill declares ${required}`);
  }
}

function testCapabilityImprovementToolkitPromptNamesAreExplicit() {
  const moduleHelp = fs.readFileSync(path.join(repoRoot, 'src/core-skills/module-help.csv'), 'utf8');
  for (const required of [
    'Core,bmad-architecture-drift-review-prompt,Architecture Drift Review Prompt,ADR,',
    'Core,bmad-tool-leverage-review-prompt,Tool Leverage Review Prompt,TLR,',
    'Core,bmad-highest-leverage-official-mcp-addition-prompt,Highest-Leverage Official MCP Addition Prompt,HMCP,',
    'Core,bmad-capability-refactor-plan-prompt,Capability Refactor Plan Prompt,CBR,',
    'Core,bmad-code-optimization-refactor-plan-prompt,Code Optimization Refactor Plan Prompt,OPT,',
  ]) {
    assert(moduleHelp.includes(required), `module-help registers explicit prompt name ${required}`);
  }

  for (const relativePath of [
    'src/core-skills/bmad-architecture-drift-review-prompt/SKILL.md',
    'src/core-skills/bmad-tool-leverage-review-prompt/SKILL.md',
    'src/core-skills/bmad-highest-leverage-official-mcp-addition-prompt/SKILL.md',
    'src/core-skills/bmad-capability-refactor-plan-prompt/SKILL.md',
    'src/core-skills/bmad-code-optimization-refactor-plan-prompt/SKILL.md',
  ]) {
    const skill = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert(skill.includes('prompt'), `${relativePath} declares prompt`);
  }
}

function testCodeOptimizationRefactorPlanPromptDiscoveryAndBoundary() {
  const moduleHelp = fs.readFileSync(path.join(repoRoot, 'src/core-skills/module-help.csv'), 'utf8');
  assert(
    moduleHelp.includes('Core,bmad-code-optimization-refactor-plan-prompt,Code Optimization Refactor Plan Prompt,OPT,'),
    'module-help registers OPT code optimization refactor plan prompt skill',
  );
  assert.equal(moduleHelp.match(/,OPT,/g)?.length, 1, 'OPT menu code is unique');

  const templateIndex = fs.readFileSync(path.join(repoRoot, 'docs/workspace/templates/index.md'), 'utf8');
  assert(
    templateIndex.includes('code-optimization-refactor-plan-prompt.template.md'),
    'template index exposes code optimization refactor plan prompt template',
  );

  const skillPath = path.join(repoRoot, 'src/core-skills/bmad-code-optimization-refactor-plan-prompt/SKILL.md');
  assert(fs.existsSync(skillPath), 'code optimization refactor plan prompt source skill exists');
  const skill = fs.readFileSync(skillPath, 'utf8');
  for (const required of [
    'name: bmad-code-optimization-refactor-plan-prompt',
    'Code Optimization Refactor Plan Prompt',
    'planning-only',
    'language-agnostic',
    'local evidence refs',
    'no live tool calls',
    'no live profiling',
    'does not edit files',
    'measurement before change',
    'public behavior preservation check',
    'smallest safe optimization',
    'readability, security, and operability',
    'approve / revise / block',
  ]) {
    assert(skill.includes(required), `code optimization refactor plan prompt skill declares ${required}`);
  }
}

function testLoopRequiresCapabilityImprovementToolkitSkills() {
  const root = makeFixture();
  fs.unlinkSync(path.join(root, 'src', 'core-skills', 'bmad-architecture-drift-review-prompt', 'SKILL.md'));
  assertInvalid(root, 'bmad-architecture-drift-review-prompt');
}

function testLoopRequiresCapabilityRefactorPlanToolkit() {
  const root = makeFixture();
  fs.unlinkSync(path.join(root, 'docs', 'workspace', 'templates', 'capability-refactor-plan-prompt.template.md'));
  assertInvalid(root, 'capability-refactor-plan-prompt.template.md');
}

function testLoopRequiresCapabilityImprovementToolkitPromptRouting() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/bmad-loop-codex-prompt.md',
    'skill:bmad-tool-leverage-review-prompt',
    'skill:bmad-tool-review',
  );
  assertInvalid(root, 'skill:bmad-tool-leverage-review-prompt');
}

function testPartyModeConsensusGateFieldsRequired() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/loop-party-mode-gate.template.md', 'round_count', 'rounds');
  assertInvalid(root, 'round_count');
}

function testPartyModeDecisionEnumRequired() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/loop-party-mode-gate.template.md', 'accept | change | block', 'accept | approve | block');
  assertInvalid(root, 'accept | change | block');
}

function testPartyModeCannotRunBeforeGoalResolution() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-loop/SKILL.md', 'after input is resolved', 'before input is resolved');
  assertInvalid(root, 'after input is resolved');
}

function testPartyModeTranscriptBoundaryRequired() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-party-mode/SKILL.md',
    'Do not include raw agent transcripts unless the user explicitly asks.',
    'Include raw agent transcripts by default.',
  );
  assertInvalid(root, 'Do not include raw agent transcripts unless the user explicitly asks.');
}

function testPartyModeForbiddenAuthorityExpansionFails() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-party-mode/SKILL.md',
    'Party Mode gates plan quality.',
    'Party Mode grants Workspace authority.',
  );
  assertInvalid(root, 'PARTY_MODE_FORBIDDEN');
}

function run() {
  const tests = [
    testCurrentRepoValidates,
    testGoalResolutionRefusesEmptyGoal,
    testGoalResolutionUsesDirectGoalFirst,
    testGoalResolutionFallsBackToGoalRefThenScope,
    testMissingQualityCommandRefuses,
    testLoopInvariantCannotDisappear,
    testGenericLoopRejectsSelfImproveDefaults,
    testCheckpointExampleRequiresEvidenceBlock,
    testCliUsesInvariantPrefix,
    testOverrideCannotInventUnsupportedWorkflowField,
    testLoopDocsRejectAutomaticReadiness,
    testWorkspaceCannotOwnReadinessAuthority,
    testCapabilityRefactorPlanDiscoveryAndBoundary,
    testCapabilityImprovementToolkitPromptNamesAreExplicit,
    testCodeOptimizationRefactorPlanPromptDiscoveryAndBoundary,
    testLoopRequiresCapabilityImprovementToolkitSkills,
    testLoopRequiresCapabilityRefactorPlanToolkit,
    testLoopRequiresCapabilityImprovementToolkitPromptRouting,
    testPartyModeConsensusGateFieldsRequired,
    testPartyModeDecisionEnumRequired,
    testPartyModeCannotRunBeforeGoalResolution,
    testPartyModeTranscriptBoundaryRequired,
    testPartyModeForbiddenAuthorityExpansionFails,
  ];
  for (const test of tests) {
    test();
  }
  console.log(`BMAD loop invariant tests passed (${tests.length}).`);
}

run();
