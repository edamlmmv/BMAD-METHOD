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
const { spawnSync } = require('node:child_process');

const { REQUIRED_INVARIANTS, validateSelfImproveInvariants } = require('../tools/validate-self-improve-invariants');

const repoRoot = path.join(__dirname, '..');
const validatorPath = path.join(repoRoot, 'tools', 'validate-self-improve-invariants.js');

/*
 * Contract source map:
 *
 * AC-SI-001 missing files: validator file loader, all contract files, temp fixture deletion.
 * AC-SI-002 invariant identity: policy Non-Negotiable Invariants, duplicate id fixture.
 * AC-SI-003 checkpoint contract: checkpoint template fields/enums, missing field fixture.
 * AC-SI-004 template parseability: prompt/resume/checkpoint placeholders and fences, malformed template fixtures.
 * AC-SI-005 ordered sequence: bmad-self-improve Required Sequence plus runbook/prompt ordering fixtures.
 * AC-SI-006 retired phrases: self-improve contract file denylist, scoped fixture injection.
 * AC-SI-007 package wiring: package scripts, quality path fixture mutations.
 * AC-SI-008 Party Mode contract: thread lifecycle, Codex agent budget/config boundary, and TDD voice injection.
 * AC-SI-009 shared BMAD planning capabilities: registry, setup refs, public surface anchors, and vendored snapshots.
 */

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
    'tools/bmad-planning-capabilities.json',
    'tools/validate-bmad-planning-capabilities.js',
    'tools/workspace/packet.js',
    'docs/workspace/self-improvement-automation-policy.md',
    'docs/workspace/self-improvement-codex.md',
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'src/core-skills/bmad-help/SKILL.md',
    'src/core-skills/bmad-party-mode/SKILL.md',
    'src/core-skills/bmad-workspace/SKILL.md',
    'src/core-skills/module-help.csv',
    'package.json',
  ]) {
    const sourcePath = path.join(repoRoot, relativePath);
    const targetPath = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  copyDir(path.join(repoRoot, 'src/core-skills/bmad-self-improve'), path.join(fixtureRoot, 'src/core-skills/bmad-self-improve'));
  copyDir(
    path.join(repoRoot, 'docs/workspace/vendor/mattpocock-skills'),
    path.join(fixtureRoot, 'docs/workspace/vendor/mattpocock-skills'),
  );
  return fixtureRoot;
}

function replaceInFile(root, relativePath, search, replacement) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.replaceAll(search, replacement));
}

function deleteFixtureFile(root, relativePath) {
  fs.unlinkSync(path.join(root, relativePath));
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

function assertInvalidWithAll(root, expectedFragments, extra = {}) {
  const result = validate(root, extra);
  assert.equal(result.ok, false, 'fixture should fail validation');
  for (const expectedFragment of expectedFragments) {
    assert(
      result.errors.some((error) => error.includes(expectedFragment)),
      `expected error containing "${expectedFragment}", got:\n${result.errors.join('\n')}`,
    );
  }
}

function runValidatorCli(root) {
  return spawnSync(process.execPath, [validatorPath, '--project-root', root], {
    encoding: 'utf8',
    env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
  });
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

function testMissingRequiredFileReportsStableError() {
  const root = makeFixture();
  deleteFixtureFile(root, 'docs/workspace/templates/self-improvement-codex-resume-prompt.md');
  assertInvalidWithAll(root, [
    'SI_FILE_MISSING',
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    'missing required file',
  ]);
}

function testCliMissingRequiredFileUsesInvariantPrefix() {
  const root = makeFixture();
  deleteFixtureFile(root, 'docs/workspace/templates/self-improvement-codex-resume-prompt.md');
  const result = runValidatorCli(root);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0, output);
  assert(output.includes('SELF_IMPROVE_INVARIANT: SI_FILE_MISSING'), output);
  assert(output.includes('docs/workspace/templates/self-improvement-codex-resume-prompt.md'), output);
}

function testDuplicatePolicyInvariantIdsFail() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/self-improvement-automation-policy.md',
    '### SI-AUTO-007: Iteration Caps',
    '### SI-AUTO-007: Iteration Caps\n\n### SI-AUTO-007: Duplicate Iteration Caps',
  );
  assertInvalidWithAll(root, ['SI_ID_DUPLICATE', 'SI-AUTO-007']);
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

function testDirtyPreflightPorcelainDefinitionCannotDisappear() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'git status --porcelain --untracked-files=all', 'git status');
  assertInvalid(root, 'policy SI-AUTO-004 missing required term: git status --porcelain --untracked-files=all');
}

function testDirtyPreflightBranchMutationGuardCannotDisappear() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/self-improvement-automation-policy.md',
    'abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits',
    'abort later',
  );
  assertInvalid(
    root,
    'policy SI-AUTO-004 missing required term: abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits',
  );
}

function testFreshBranchCurrentRunDefinitionCannotDisappear() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/self-improvement-automation-policy.md',
    'created for the current run before improvement edits',
    'created sometime before edits',
  );
  assertInvalid(root, 'policy SI-AUTO-001 missing required term: created for the current run before improvement edits');
}

function testExactCheckoutGateCannotDisappear() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/self-improvement-automation-policy.md', 'on `HEAD` of the exact checkout', 'on the checkout');
  assertInvalid(root, 'policy SI-AUTO-005 missing required term: on `HEAD` of the exact checkout');
}

function testCheckpointRequiresActivationStateContract() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/self-improvement-checkpoint.template.md', '## Activation State', '## Runtime State');
  assertInvalid(root, 'checkpoint template missing required term: Activation State');
}

function testCheckpointRequiresResumeContract() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/self-improvement-checkpoint.template.md', 'resume_contract:', 'resume_next:');
  assertInvalid(root, 'checkpoint template missing required term: resume_contract:');
}

function testRefreshUnknownCannotAllowContinuation() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'refresh_state: known_good|failed|blocked|unknown',
    'refresh: unknown',
  );
  assertInvalid(root, 'checkpoint template missing required term: refresh_state: known_good|failed|blocked|unknown');
}

function testActiveHashMismatchBlocksContinuation() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'active_skill_hash: match|mismatch|unknown',
    'active_skill_hash: match|unknown',
  );
  assertInvalid(root, 'checkpoint template missing required term: active_skill_hash: match|mismatch|unknown');
}

function testSessionIdentityClassifiesCodexThreads() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-checkpoint.template.md',
    'classification: valid_workspace_session|codex_thread_only|session_not_found|unknown',
    'classification: valid_workspace_session|unknown',
  );
  assertInvalid(
    root,
    'checkpoint template missing required term: classification: valid_workspace_session|codex_thread_only|session_not_found|unknown',
  );
}

function testCheckpointRequiresFinalHeadSha() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/templates/self-improvement-checkpoint.template.md', '- Final HEAD SHA:', '- Final SHA:');
  assertInvalidWithAll(root, ['SI_CHECKPOINT_CONTRACT', 'Final HEAD SHA']);
}

function testPromptRejectsUnknownPlaceholders() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    '[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]',
    '[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]\n{bad-placeholder}',
  );
  assertInvalidWithAll(root, ['SI_PLACEHOLDER_UNKNOWN', '{bad-placeholder}']);
}

function testResumePromptRejectsUnbalancedMarkdownFences() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    'remaining risks\n```',
    'remaining risks\n```\n```',
  );
  assertInvalidWithAll(root, ['SI_MARKDOWN_FENCE_UNBALANCED', 'self-improvement-codex-resume-prompt.md']);
}

function testRequiredSequenceOrderCannotRegress() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-codex-prompt.md',
    '7. Before branch creation',
    '7. Create or switch to the fresh branch before preflight.\n8. Before branch creation',
  );
  assertInvalidWithAll(root, ['SI_SEQUENCE_ORDER', 'fresh branch']);
}

function testContinuationRequiresAllActivationGates() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/self-improvement-automation-policy.md',
    'Continuation is allowed only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, and refresh state is known_good.',
    'Continuation is allowed when quality passes.',
  );
  assertInvalid(
    root,
    'policy SI-AUTO-008 missing required term: Continuation is allowed only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, and refresh state is known_good.',
  );
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

function testPartyModeRequiresThreadLifecycleContract() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-party-mode/SKILL.md', 'Close stale Party Mode threads', 'Reuse stale Party Mode threads');
  assertInvalidWithAll(root, ['SI_PARTY_MODE_CONTRACT', 'thread/session hygiene']);
}

function testPartyModeRequiresCodexAgentBudgetContract() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-party-mode/SKILL.md', 'max_threads', 'thread_limit');
  assertInvalidWithAll(root, ['SI_PARTY_MODE_CONTRACT', 'Codex agent budget']);
}

function testPartyModeRequiresCodexConfigBoundaryContract() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-party-mode/SKILL.md', 'features.codex_hooks', 'feature hooks');
  assertInvalidWithAll(root, ['SI_PARTY_MODE_CONTRACT', 'Codex config boundary']);
}

function testPartyModeRequiresTddVoiceInjectionContract() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-party-mode/SKILL.md', 'red-green-refactor', 'test later');
  assertInvalidWithAll(root, ['SI_PARTY_MODE_CONTRACT', 'TDD voice injection']);
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

function testRetiredManualOnlyPhrasesAreRejectedAcrossContractFiles() {
  const root = makeFixture();
  replaceInFile(
    root,
    'docs/workspace/templates/self-improvement-codex-resume-prompt.md',
    '# Self-Improvement Resume Prompt',
    '# Self-Improvement Resume Prompt\n\nMissing automation is expected.',
  );
  assertInvalidWithAll(root, ['SI_RETIRED_PHRASE', 'self-improvement-codex-resume-prompt.md', 'Missing automation is expected']);
}

function testPackageWiringUsesStableErrorCode() {
  const root = makeFixture();
  replaceInFile(
    root,
    'package.json',
    '"validate:self-improve-invariants": "node tools/validate-self-improve-invariants.js"',
    '"validate:self-improve-invariants": "node tools/other-validator.js"',
  );
  assertInvalidWithAll(root, ['SI_PACKAGE_SCRIPT', 'validate:self-improve-invariants']);
}

function testPlanningCapabilityRegistryIsRequired() {
  const root = makeFixture();
  deleteFixtureFile(root, 'tools/bmad-planning-capabilities.json');
  assertInvalidWithAll(root, ['BPC_FILE_MISSING', 'tools/bmad-planning-capabilities.json']);
}

function testPlanningCapabilityValidatorAcceptsSharedRegistryPath() {
  const root = makeFixture();
  const result = spawnSync('npm', ['run', '--silent', 'validate:bmad-planning-capabilities', '--', '--project-root', root], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function testPlanningCapabilityMissingSurfaceFails() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/bmad-help/SKILL.md', 'capability:grill-me', 'capability:removed-grill');
  assertInvalidWithAll(root, ['BPC_SURFACE', 'capability:grill-me', 'bmad-help skill']);
}

function testPlanningCapabilitySetupRefMismatchFails() {
  const root = makeFixture();
  replaceInFile(root, 'tools/bmad-planning-capabilities.json', '"setupGateRef": "tddPlan"', '"setupGateRef": "tdd"');
  assertInvalidWithAll(root, ['BPC_SETUP_REF', 'tdd', 'tddPlan']);
}

function testPlanningCapabilityModuleHelpRowsRequired() {
  const root = makeFixture();
  replaceInFile(root, 'src/core-skills/module-help.csv', 'capability:zoom-out', 'capability:removed-zoom');
  assertInvalidWithAll(root, ['BPC_MODULE_HELP', 'bmad-help', 'capability:zoom-out']);
}

function testPlanningCapabilityVendorManifestEntryRequired() {
  const root = makeFixture();
  replaceInFile(root, 'docs/workspace/vendor/mattpocock-skills/MANIFEST.json', '"name": "grill-me"', '"name": "grill-missing"');
  assertInvalidWithAll(root, ['BPC_VENDOR', 'grill-me']);
}

function run() {
  const tests = [
    testCurrentRepoValidates,
    testRequiredInvariantIdsExist,
    testMissingRequiredFileReportsStableError,
    testCliMissingRequiredFileUsesInvariantPrefix,
    testDuplicatePolicyInvariantIdsFail,
    testNeverMainInvariantCannotBeRemoved,
    testNeverPushTermCannotBeRemoved,
    testMaxFixAttemptsCannotBeWeakened,
    testDirtyPreflightPorcelainDefinitionCannotDisappear,
    testDirtyPreflightBranchMutationGuardCannotDisappear,
    testFreshBranchCurrentRunDefinitionCannotDisappear,
    testExactCheckoutGateCannotDisappear,
    testCheckpointRequiresActivationStateContract,
    testCheckpointRequiresResumeContract,
    testRefreshUnknownCannotAllowContinuation,
    testActiveHashMismatchBlocksContinuation,
    testSessionIdentityClassifiesCodexThreads,
    testCheckpointRequiresFinalHeadSha,
    testPromptRejectsUnknownPlaceholders,
    testResumePromptRejectsUnbalancedMarkdownFences,
    testRequiredSequenceOrderCannotRegress,
    testContinuationRequiresAllActivationGates,
    testContinuationGateCannotBeRemoved,
    testScheduleAwarenessCannotBeRemoved,
    testInstallRefreshFailureContractCannotDisappear,
    testFailClosedAmbiguityCannotDisappear,
    testSelfEditContractRequiresSkillTerms,
    testPartyModeRequiresThreadLifecycleContract,
    testPartyModeRequiresCodexAgentBudgetContract,
    testPartyModeRequiresCodexConfigBoundaryContract,
    testPartyModeRequiresTddVoiceInjectionContract,
    testPolicyBaselineBlocksRemovedIds,
    testRetiredManualOnlyPhrasesStayRemoved,
    testRetiredManualOnlyPhrasesAreRejectedAcrossContractFiles,
    testPackageWiringUsesStableErrorCode,
    testPlanningCapabilityRegistryIsRequired,
    testPlanningCapabilityValidatorAcceptsSharedRegistryPath,
    testPlanningCapabilityMissingSurfaceFails,
    testPlanningCapabilitySetupRefMismatchFails,
    testPlanningCapabilityModuleHelpRowsRequired,
    testPlanningCapabilityVendorManifestEntryRequired,
  ];

  for (const test of tests) {
    test();
    console.log(`✓ ${test.name}`);
  }
}

run();
