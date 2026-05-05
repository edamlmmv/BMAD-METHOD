/**
 * Ubiquitous Language validator tests.
 *
 * Public behavior checks for the root UBIQUITOUS_LANGUAGE.md contract.
 * Usage: node test/test-ubiquitous-language.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');
const validatorPath = path.join(repoRoot, 'tools', 'validate-ubiquitous-language.js');

function copyFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-ubiquitous-language-'));
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  for (const relativePath of ['UBIQUITOUS_LANGUAGE.md', 'tools/validate-ubiquitous-language.js', 'package.json']) {
    const sourcePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(sourcePath)) continue;
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  for (const [relativePath, content] of Object.entries(overrides)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }
  return root;
}

function runValidator(root = repoRoot) {
  return spawnSync(process.execPath, [validatorPath, '--project-root', root], {
    encoding: 'utf8',
    env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1', NO_COLOR: '1' },
  });
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

function assertValid(root) {
  const result = runValidator(root);
  assert.equal(result.status, 0, combinedOutput(result));
  assert(combinedOutput(result).includes('Ubiquitous Language valid.'), combinedOutput(result));
}

function assertInvalid(root, fragments) {
  const result = runValidator(root);
  const output = combinedOutput(result);
  assert.notEqual(result.status, 0, output);
  for (const fragment of fragments) {
    assert(output.includes(fragment), `expected "${fragment}" in:\n${output}`);
  }
}

function withoutSection(content, heading) {
  const pattern = new RegExp(`\\n## ${heading}\\n[\\s\\S]*?(?=\\n## |\\n$)`);
  return content.replace(pattern, '');
}

function currentGlossary() {
  return fs.readFileSync(path.join(repoRoot, 'UBIQUITOUS_LANGUAGE.md'), 'utf8');
}

function testCurrentGlossarySatisfiesCapabilityContract() {
  const result = runValidator();
  const output = combinedOutput(result);
  assert.equal(result.status, 0, output);
  assert(output.includes('Ubiquitous Language valid.'), output);
}

function testMissingRequiredSectionFailsWithStableCode() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': withoutSection(currentGlossary(), 'Coding workflow'),
  });
  assertInvalid(root, ['UL_MISSING_SECTION', 'Coding workflow']);
}

function testMissingRequiredTermFailsWithStableCode() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': currentGlossary().replaceAll('Public Behavior Test', 'Behavior Check'),
  });
  assertInvalid(root, ['UL_MISSING_TERM', 'Public Behavior Test']);
}

function testConfigAuthorityCannotBeWeakened() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': currentGlossary().replaceAll('Config Authority', 'Config Guidance'),
  });
  assertInvalid(root, ['UL_CONFIG_AUTHORITY_WEAKENED', 'Config Authority']);
}

function testForbiddenAuthorityClaimFailsWithStableCode() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': `${currentGlossary()}\n\nCodex config grants Workspace authority.\n`,
  });
  assertInvalid(root, ['UL_FORBIDDEN_AUTHORITY_CLAIM', 'Codex config grants Workspace authority']);
}

function testHiddenAutomationClaimFailsWithStableCode() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': `${currentGlossary()}\n\nAgents automatically improve BMAD without review.\n`,
  });
  assertInvalid(root, ['UL_HIDDEN_AUTOMATION_CLAIM', 'automatically improve BMAD without review']);
}

function testValidatorOutputOrderIsDeterministic() {
  const root = copyFixture({
    'UBIQUITOUS_LANGUAGE.md': withoutSection(currentGlossary(), 'Coding workflow').replaceAll('Config Authority', 'Config Guidance'),
  });
  const first = runValidator(root);
  const second = runValidator(root);
  assert.notEqual(first.status, 0, combinedOutput(first));
  assert.equal(combinedOutput(first), combinedOutput(second));
}

function run() {
  const tests = [
    testCurrentGlossarySatisfiesCapabilityContract,
    testMissingRequiredSectionFailsWithStableCode,
    testMissingRequiredTermFailsWithStableCode,
    testConfigAuthorityCannotBeWeakened,
    testForbiddenAuthorityClaimFailsWithStableCode,
    testHiddenAutomationClaimFailsWithStableCode,
    testValidatorOutputOrderIsDeterministic,
  ];

  for (const test of tests) {
    test();
    console.log(`✓ ${test.name}`);
  }
}

run();
