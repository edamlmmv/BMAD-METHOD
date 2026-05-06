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
    'docs/workspace/templates/bmad-loop-codex-prompt.md',
    'docs/workspace/templates/bmad-loop-codex-resume-prompt.md',
    'docs/workspace/templates/bmad-loop-checkpoint.template.md',
    'docs/workspace/templates/bmad-loop-checkpoint.example.md',
    'src/core-skills/module-help.csv',
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
  ];
  for (const test of tests) {
    test();
  }
  console.log(`BMAD loop invariant tests passed (${tests.length}).`);
}

run();
