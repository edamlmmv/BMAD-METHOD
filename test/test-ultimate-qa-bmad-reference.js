/**
 * Ultimate QA BMAD reference tests
 *
 * Guards the repo-tracked QA BMAD reference so it continues to cover browser,
 * mobile, and desktop routing.
 *
 * Usage: node test/test-ultimate-qa-bmad-reference.js
 */

const fs = require('node:fs');
const path = require('node:path');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
};

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}\u2717${colors.reset} ${name} ${colors.red}${error.message}${colors.reset}`);
    failures.push({ name, message: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const projectRoot = path.join(__dirname, '..');
const referencePath = path.join(projectRoot, 'docs', 'reference', 'ultimate-qa-bmad.md');
const content = fs.readFileSync(referencePath, 'utf8');

console.log(`\n${colors.cyan}Ultimate QA BMAD Reference Tests${colors.reset}\n`);

test('reference includes OpenClaw browser coverage', () => {
  assert(content.includes('OpenClaw browser'), 'Expected the reference to mention OpenClaw browser.');
});

test('reference includes Playwright and Electron coverage', () => {
  assert(content.includes('Playwright'), 'Expected the reference to mention Playwright.');
  assert(content.includes('Electron'), 'Expected the reference to mention Electron.');
});

test('reference includes Detox for React Native', () => {
  assert(content.includes('Detox'), 'Expected the reference to mention Detox.');
});

test('reference includes Appium for native automation', () => {
  assert(content.includes('Appium'), 'Expected the reference to mention Appium.');
});

test('reference captures validated structural target patterns', () => {
  assert(content.includes('React Native mobile target'), 'Expected the reference to mention the React Native mobile target pattern.');
  assert(content.includes('Electron desktop target'), 'Expected the reference to mention the Electron desktop target pattern.');
  assert(content.includes('Playwright Electron'), 'Expected the reference to mention Playwright Electron.');
});

test('reference preserves repo selector contracts', () => {
  assert(content.includes('testID'), 'Expected the reference to mention the React Native testID contract.');
  assert(content.includes('data-test-id'), 'Expected the reference to mention the desktop data-test-id contract.');
  assert(content.includes('data-test-button'), 'Expected the reference to mention the desktop data-test-button contract.');
});

test('reference preserves repo-native layout and wrapper expectations', () => {
  assert(content.includes('`e2e/` layout'), 'Expected the reference to mention the mobile e2e layout.');
  assert(content.includes('platform-specific wrapper commands'), 'Expected the reference to mention wrapper commands.');
  assert(content.includes('playwright/test-suites'), 'Expected the reference to mention the desktop suite layout.');
});

test('reference avoids concrete project-name coupling', () => {
  assert(!content.includes('/Users/edam/Documents/TODA/'), 'Expected the reference to avoid machine-specific repo paths.');
  assert(!content.includes('repo_path: /Users/'), 'Expected the reference to keep example repo paths generic.');
});

test('reference includes evidence artifact expectations', () => {
  assert(content.includes('trace'), 'Expected the reference to mention traces.');
  assert(content.includes('screenshots'), 'Expected the reference to mention screenshots.');
});

test('reference includes an adapter manifest for downstream projects', () => {
  assert(content.includes('primary_harness'), 'Expected adapter manifest fields in the reference.');
  assert(content.includes('qa-runs/<timestamp>/generated-tests/'), 'Expected generated test artifact path in the reference.');
});

console.log(`\n${colors.cyan}${'═'.repeat(55)}${colors.reset}`);
console.log(`${colors.cyan}Test Results:${colors.reset}`);
console.log(`  Total:  ${totalTests}`);
console.log(`  Passed: ${colors.green}${passedTests}${colors.reset}`);
console.log(`  Failed: ${passedTests === totalTests ? colors.green : colors.red}${totalTests - passedTests}${colors.reset}`);
console.log(`${colors.cyan}${'═'.repeat(55)}${colors.reset}\n`);

if (failures.length > 0) {
  console.log(`${colors.red}FAILED TESTS:${colors.reset}\n`);
  for (const failure of failures) {
    console.log(`${colors.red}\u2717${colors.reset} ${failure.name}`);
    console.log(`  ${failure.message}\n`);
  }
  process.exit(1);
}

console.log(`${colors.green}All tests passed!${colors.reset}\n`);
