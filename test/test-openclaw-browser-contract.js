/**
 * OpenClaw browser contract tests
 *
 * Ensures the repo-side runtime template keeps the bundled browser surface
 * available for personal-QA/browser-worker flows.
 *
 * Usage: node test/test-openclaw-browser-contract.js
 */

const fs = require('node:fs');
const path = require('node:path');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
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

function renderOpenClawTemplate(template) {
  return template
    .replaceAll('{{gateway_port}}', '18789')
    .replaceAll('{{gateway_token_env}}', 'OPENCLAW_GATEWAY_TOKEN')
    .replaceAll('{{openclaw_workspace}}', '/tmp/openclaw-workspace')
    .replaceAll('{{timezone}}', 'America/Toronto')
    .replaceAll('{{openclaw_cron_store}}', '/tmp/openclaw-cron.json');
}

const projectRoot = path.join(__dirname, '..');
const templatePath = path.join(projectRoot, 'tools', 'runtime', 'templates', 'openclaw.json.template');
const docsPath = path.join(projectRoot, 'docs', 'how-to', 'use-openclaw-hermes-bmad.md');

console.log(`\n${colors.cyan}OpenClaw Browser Contract Tests${colors.reset}\n`);

const templateRaw = fs.readFileSync(templatePath, 'utf8');
const renderedTemplate = renderOpenClawTemplate(templateRaw);
const config = JSON.parse(renderedTemplate);
const docs = fs.readFileSync(docsPath, 'utf8');

test('openclaw runtime template parses as JSON after placeholder substitution', () => {
  assert(typeof config === 'object' && config !== null, 'Rendered config did not parse to an object.');
});

test('browser support is explicitly enabled in the starter config', () => {
  assert(config.browser?.enabled === true, 'Expected browser.enabled to be true.');
});

test('isolated OpenClaw browser profile is the default browser mode', () => {
  assert(config.browser?.defaultProfile === 'openclaw', 'Expected browser.defaultProfile to equal "openclaw".');
});

test('bundled browser plugin is not explicitly disabled', () => {
  assert(config.plugins?.entries?.browser?.enabled !== false, 'Expected bundled browser plugin to remain enabled.');
});

test('restrictive plugin allowlist does not exclude browser support', () => {
  const allowlist = config.plugins?.allow;
  assert(!Array.isArray(allowlist) || allowlist.includes('browser'), 'plugins.allow is present but does not include "browser".');
});

test('operator guide explains that browser automation uses the browser tool', () => {
  assert(docs.includes('`openclaw browser`'), 'Expected docs/how-to/use-openclaw-hermes-bmad.md to mention `openclaw browser`.');
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
