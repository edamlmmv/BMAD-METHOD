/**
 * BMAD Self-Improve Invariant Tests
 *
 * Public behavior checks for self-improve as a bmad-loop instance.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { LOOP_REFUSAL_MESSAGE, validateGoalResolution } = require('../tools/validate-bmad-loop-invariants');
const { REQUIRED_INVARIANTS, validateSelfImproveInvariants } = require('../tools/validate-self-improve-invariants');

const repoRoot = path.join(__dirname, '..');
const validatorPath = path.join(repoRoot, 'tools', 'validate-self-improve-invariants.js');

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

function copyFile(root, relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);
  const targetPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-self-improve-invariants-'));
  for (const relativePath of [
    'tools/bmad-planning-capabilities.json',
    'tools/validate-bmad-planning-capabilities.js',
    'tools/validate-bmad-loop-invariants.js',
    'tools/validate-self-improve-invariants.js',
    'tools/workspace/packet.js',
    'docs/workspace/bmad-loop-automation-policy.md',
    'docs/workspace/bmad-loop.md',
    'docs/workspace/loop-platform-v1.md',
    'docs/workspace/loop-candidate-registry.md',
    'docs/workspace/self-improvement-codex.md',
    'docs/workspace/templates/bmad-loop-codex-prompt.md',
    'docs/workspace/templates/bmad-loop-codex-resume-prompt.md',
    'docs/workspace/templates/bmad-loop-checkpoint.template.md',
    'docs/workspace/templates/bmad-loop-checkpoint.example.md',
    'docs/workspace/templates/workflow-bundle.template.md',
    'docs/workspace/templates/loop-party-mode-gate.template.md',
    'docs/workspace/templates/index.md',
    'docs/workspace/templates/architecture-drift-review.template.md',
    'docs/workspace/templates/tool-leverage-review.template.md',
    'docs/workspace/templates/highest-leverage-official-mcp-addition.template.md',
    'docs/workspace/templates/capability-refactor-plan.template.md',
    'src/core-skills/bmad-architecture-drift-review/SKILL.md',
    'src/core-skills/bmad-tool-leverage-review/SKILL.md',
    'src/core-skills/bmad-highest-leverage-official-mcp-addition/SKILL.md',
    'src/core-skills/bmad-capability-refactor-plan/SKILL.md',
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'docs/workspace/templates/self-improvement-checkpoint.example.md',
    'src/core-skills/bmad-help/SKILL.md',
    'src/core-skills/bmad-party-mode/SKILL.md',
    'src/core-skills/bmad-workspace/SKILL.md',
    'src/core-skills/bmad-customize/SKILL.md',
    'src/core-skills/module-help.csv',
    'package.json',
  ]) {
    copyFile(root, relativePath);
  }
  copyDir(path.join(repoRoot, 'src/core-skills/bmad-loop'), path.join(root, 'src/core-skills/bmad-loop'));
  copyDir(path.join(repoRoot, 'src/core-skills/bmad-self-improve'), path.join(root, 'src/core-skills/bmad-self-improve'));
  copyDir(path.join(repoRoot, 'docs/workspace/vendor/mattpocock-skills'), path.join(root, 'docs/workspace/vendor/mattpocock-skills'));
  fs.mkdirSync(path.join(root, '_bmad', 'custom'), { recursive: true });
  return root;
}

function replaceInFile(root, relativePath, search, replacement) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.replaceAll(search, replacement));
}

function assertInvalid(root, expectedFragment) {
  const result = validateSelfImproveInvariants({ projectRoot: root });
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

function resolveWorkflow(root) {
  const result = spawnSync(
    'python3',
    [
      path.join(repoRoot, '_bmad', 'scripts', 'resolve_customization.py'),
      '--skill',
      path.join(root, 'src', 'core-skills', 'bmad-self-improve'),
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function testCurrentRepoValidates() {
  const result = validateSelfImproveInvariants({ projectRoot: repoRoot });
  assert.equal(result.ok, true, result.errors.join('\n'));
}

function testRequiredInvariantAliasesExist() {
  assert.equal(REQUIRED_INVARIANTS.length, 13);
  assert.deepEqual(
    REQUIRED_INVARIANTS.map((item) => item.id),
    [
      'SI-AUTO-001',
      'SI-AUTO-002',
      'SI-AUTO-003',
      'SI-AUTO-004',
      'SI-AUTO-005',
      'SI-AUTO-006',
      'SI-AUTO-007',
      'SI-AUTO-008',
      'SI-AUTO-009',
      'SI-AUTO-010',
      'SI-AUTO-011',
      'SI-AUTO-012',
      'SI-AUTO-013',
    ],
  );
}

function testSelfImproveCustomizeSurfaceShipsEmptyGoal() {
  const customize = fs.readFileSync(path.join(repoRoot, 'src/core-skills/bmad-self-improve/customize.toml'), 'utf8');
  for (const required of [
    'loop_skill = "bmad-loop"',
    'loop_slug = "self-improve"',
    'branch_prefix = "codex/self-improve-"',
    'checkpoint_subdir = "{output_folder}/self-improvement"',
  ]) {
    assert(customize.includes(required), `self-improve customize includes ${required}`);
  }
  for (const inherited of ['goal_ref = ""', 'scope = ""', 'quality_command = "npm ci && npm run quality"', 'max_fix_attempts = 5']) {
    assert(!customize.includes(inherited), `self-improve customize inherits ${inherited}`);
  }
}

function testEmptySelfImproveGoalRefuses() {
  const result = validateGoalResolution({
    workflow: {
      goal_ref: '',
      scope: '',
      stop_condition: 'checkpoint written or max caps reached',
      quality_command: 'npm ci && npm run quality',
    },
  });
  assert.deepEqual(result, { ok: false, error: LOOP_REFUSAL_MESSAGE, inputSource: null });
}

function testAliasRemovalFails() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-self-improve/SKILL.md', 'SI-AUTO-011', 'SI-AUTO-REMOVED');
  assertInvalid(root, 'SI_ALIAS');
  assertInvalid(root, 'SI-AUTO-011');
}

function testLoopCoreWeakeningFailsSelfImprove() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/bmad-loop-automation-policy.md', 'LOOP-AUTO-002', 'LOOP-AUTO-999');
  assertInvalid(root, 'SI_LOOP_CORE');
  assertInvalid(root, 'LOOP-AUTO-002');
}

function testPartyModeCannotCreateGoalTextDisappear() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-self-improve/SKILL.md',
    'Party Mode must not silently create a goal',
    'Party Mode can pick a goal',
  );
  assertInvalid(root, 'Party Mode must not silently create a goal');
}

function testPromptRequiresGoalSource() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/self-improvement-codex-prompt.md', 'Goal source:', 'Goal:');
  assertInvalid(root, 'Goal source:');
}

function testCapabilityImprovementToolkitPromptRequired() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    'Capability Improvement Toolkit',
    'Capability Planning Kit',
  );
  assertInvalid(root, 'Capability Improvement Toolkit');
}

function testHighestLeverageOfficialMcpTemplateRequired() {
  const root = makeFixture();
  fs.unlinkSync(path.join(root, 'docs', 'workspace', 'templates', 'highest-leverage-official-mcp-addition.template.md'));
  assertInvalid(root, 'highest-leverage-official-mcp-addition.template.md');
}

function testCapabilityRefactorPlanTemplateRequired() {
  const root = makeFixture();
  fs.unlinkSync(path.join(root, 'docs', 'workspace', 'templates', 'capability-refactor-plan.template.md'));
  assertInvalid(root, 'capability-refactor-plan.template.md');
}

function testCapabilityImprovementToolkitSkillsRequired() {
  const root = makeFixture();
  fs.unlinkSync(path.join(root, 'src', 'core-skills', 'bmad-tool-leverage-review', 'SKILL.md'));
  assertInvalid(root, 'bmad-tool-leverage-review');
}

function testCliUsesInvariantPrefix() {
  const root = makeFixture();
  const overridePath = path.join(root, '_bmad', 'custom', 'bmad-self-improve.toml');
  fs.writeFileSync(overridePath, '[workflow]\ngoal_pointer = "bad"\n');
  const result = runValidatorCli(root);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0, output);
  assert(output.includes('SELF_IMPROVE_INVARIANT:'), output);
  assert(output.includes('goal_pointer'), output);
}

function testSelfImproveInheritsFutureLoopField() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-loop/customize.toml',
    'max_fix_attempts = 5',
    'max_fix_attempts = 5\nfuture_contract_field = "pass-through"',
  );
  const resolved = resolveWorkflow(root);
  assert.equal(resolved.workflow.future_contract_field, 'pass-through');
}

function testSelfImproveMayOverrideInheritedFutureLoopField() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-loop/customize.toml',
    'max_fix_attempts = 5',
    'max_fix_attempts = 5\nfuture_contract_field = "base"',
  );
  replaceInFile(
    root,
    'src/core-skills/bmad-self-improve/customize.toml',
    'loop_slug = "self-improve"',
    'loop_slug = "self-improve"\nfuture_contract_field = "instance"',
  );
  const resolved = resolveWorkflow(root);
  assert.equal(resolved.workflow.future_contract_field, 'instance');
}

function run() {
  const tests = [
    testCurrentRepoValidates,
    testRequiredInvariantAliasesExist,
    testSelfImproveCustomizeSurfaceShipsEmptyGoal,
    testEmptySelfImproveGoalRefuses,
    testAliasRemovalFails,
    testLoopCoreWeakeningFailsSelfImprove,
    testPartyModeCannotCreateGoalTextDisappear,
    testPromptRequiresGoalSource,
    testCapabilityImprovementToolkitPromptRequired,
    testHighestLeverageOfficialMcpTemplateRequired,
    testCapabilityRefactorPlanTemplateRequired,
    testCapabilityImprovementToolkitSkillsRequired,
    testCliUsesInvariantPrefix,
    testSelfImproveInheritsFutureLoopField,
    testSelfImproveMayOverrideInheritedFutureLoopField,
  ];
  for (const test of tests) {
    test();
  }
  console.log(`BMAD self-improve invariant tests passed (${tests.length}).`);
}

run();
