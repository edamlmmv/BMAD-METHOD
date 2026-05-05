/**
 * BMAD Self-Improve Invariant Tests
 *
 * Public behavior checks for the self-improvement automation policy validator.
 * Usage: node test/test-self-improve-invariants.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { REQUIRED_INVARIANTS, validateSelfImproveInvariants } = require('../tools/validate-self-improve-invariants');

const repoRoot = path.join(__dirname, '..');

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
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-self-improve-invariants-'));
  for (const relativePath of [
    'docs/workspace/self-improvement-automation-policy.md',
    'docs/workspace/self-improvement-codex.md',
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'src/core-skills/module-help.csv',
    'package.json',
  ]) {
    const sourcePath = path.join(repoRoot, relativePath);
    const targetPath = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  copyDir(path.join(repoRoot, 'src/core-skills/bmad-self-improve'), path.join(fixtureRoot, 'src/core-skills/bmad-self-improve'));
  return fixtureRoot;
}

function replaceInFile(root, relativePath, search, replacement) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.replaceAll(search, replacement));
}

function validate(root, extra = {}) {
  return validateSelfImproveInvariants({ projectRoot: root, ...extra });
}

function assertInvalid(root, expectedFragment, extra = {}) {
  const result = validate(root, extra);
  assert.equal(result.ok, false, 'fixture should fail validation');
  assert(
    result.errors.some((error) => error.includes(expectedFragment)),
    `expected error containing "${expectedFragment}", got:\n${result.errors.join('\n')}`,
  );
}

function testCurrentRepoValidates() {
  const result = validate(repoRoot);
  assert.deepEqual(result, { ok: true, errors: [] });
}

function testRequiredInvariantIdsExist() {
  const ids = REQUIRED_INVARIANTS.map((item) => item.id);
  assert.equal(ids.length, 13);
  assert.deepEqual([...new Set(ids)], ids);
}

function testNeverMainInvariantCannotBeRemoved() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'SI-AUTO-002', 'SI-AUTO-XXX');
  assertInvalid(root, 'policy missing invariant id SI-AUTO-002');
}

function testNeverPushTermCannotBeRemoved() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'pushes to any remote', 'publishes when useful');
  assertInvalid(root, 'policy SI-AUTO-002 missing required term: pushes');
}

function testMaxFixAttemptsCannotBeWeakened() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'max_fix_attempts=5', 'max_fix_attempts=50');
  assertInvalid(root, 'policy SI-AUTO-006 missing required term: max_fix_attempts=5');
}

function testContinuationGateCannotBeRemoved() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'install/refresh evidence', 'operator vibes');
  assertInvalid(root, 'policy SI-AUTO-008 missing required term: install/refresh evidence');
}

function testScheduleAwarenessCannotBeRemoved() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'effective automation schedule/config', 'weekly schedule');
  assertInvalid(root, 'policy SI-AUTO-008 missing required term: effective automation schedule/config');
}

function testInstallRefreshFailureContractCannotDisappear() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'source and installed SHA-256 hashes', 'basic note');
  assertInvalid(root, 'policy SI-AUTO-009 missing required term: source and installed SHA-256 hashes');
}

function testFailClosedAmbiguityCannotDisappear() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'deterministic invariant checker', 'manual skim');
  assertInvalid(root, 'policy SI-AUTO-010 missing required term: deterministic invariant checker');
}

function testSelfEditContractRequiresSkillTerms() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-self-improve/SKILL.md', 'Party Mode consensus', 'group chat');
  assertInvalid(root, 'bmad-self-improve skill missing required term: Party Mode consensus');
}

function testPolicyBaselineBlocksRemovedIds() {
  const root = makeFixture();
  const baselinePath = path.join(root, 'baseline-policy.md');
  fs.copyFileSync(path.join(root, 'docs/workspace/self-improvement-automation-policy.md'), baselinePath);
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'SI-AUTO-012', 'SI-AUTO-999');
  assertInvalid(root, 'candidate policy removed baseline invariant id: SI-AUTO-012', { baselinePolicy: baselinePath });
}

function testRetiredManualOnlyPhrasesStayRemoved() {
  const root = makeFixture();
  replaceInFile(
    root,
    'src/core-skills/bmad-self-improve/SKILL.md',
    '# BMAD Self-Improve',
    '# BMAD Self-Improve\n\nMissing automation is expected.',
  );
  assertInvalid(root, 'contains retired manual-only phrase: Missing automation is expected');
}

function run() {
  const tests = [
    testCurrentRepoValidates,
    testRequiredInvariantIdsExist,
    testNeverMainInvariantCannotBeRemoved,
    testNeverPushTermCannotBeRemoved,
    testMaxFixAttemptsCannotBeWeakened,
    testContinuationGateCannotBeRemoved,
    testScheduleAwarenessCannotBeRemoved,
    testInstallRefreshFailureContractCannotDisappear,
    testFailClosedAmbiguityCannotDisappear,
    testSelfEditContractRequiresSkillTerms,
    testPolicyBaselineBlocksRemovedIds,
    testRetiredManualOnlyPhrasesStayRemoved,
  ];

  for (const test of tests) {
    test();
    console.log(`✓ ${test.name}`);
  }
}

run();
