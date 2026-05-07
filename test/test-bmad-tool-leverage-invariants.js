/**
 * Tool-Leverage Decision Record invariant tests.
 *
 * Usage: node test/test-bmad-tool-leverage-invariants.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

const tldrFields = [
  'task',
  'available_capabilities',
  'candidate_tools',
  'selected_capability',
  'chosen_tools',
  'decision',
  'rationale',
  'why_enough',
  'underused_risk',
  'overused_risk',
  'blocked_tools',
  'fallback',
  'next_action',
  'evidence',
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertTldrRecord(relativePath) {
  const content = read(relativePath);
  assert(content.includes('Tool-Leverage Decision Record'), `${relativePath} names TLDR`);
  assert(content.includes('decision: enough | underused | overused | blocked'), `${relativePath} records the canonical decision enum`);

  let cursor = -1;
  for (const field of tldrFields) {
    const index = content.indexOf(`${field}:`, cursor + 1);
    assert(index > cursor, `${relativePath} contains ${field} in canonical order`);
    cursor = index;
  }
}

function assertToolRelevantTldrSurface(relativePath) {
  const content = read(relativePath);
  assert(content.includes('For tool-relevant goals only'), `${relativePath} gates TLDR to tool-relevant goals`);
  assert(content.includes('Tool-Leverage Decision Record'), `${relativePath} names TLDR`);
  assert(content.includes('final plan or checkpoint'), `${relativePath} scopes TLDR output surface`);
}

assertTldrRecord('src/core-skills/bmad-tool-leverage-review-prompt/SKILL.md');
assertTldrRecord('docs/workspace/templates/tool-leverage-review-prompt.template.md');

const help = read('src/core-skills/bmad-help/SKILL.md');
assert(help.includes('when the user asks whether tool use is enough'), 'Help routes enough-tool-use questions');
assert(help.includes('bmad-tool-leverage-review-prompt'), 'Help uses the tool-leverage prompt first');
assert(
  help.includes('If TLDR decision is `underused`, do not invoke or recommend') &&
    help.includes('`bmad-highest-leverage-official-mcp-addition-prompt`'),
  'Help underused output does not auto-escalate to official MCP recommendation',
);

assertToolRelevantTldrSurface('src/core-skills/bmad-loop/SKILL.md');
assertToolRelevantTldrSurface('src/core-skills/bmad-self-improve/SKILL.md');
assertToolRelevantTldrSurface('docs/workspace/templates/bmad-loop-codex-prompt.md');
assertToolRelevantTldrSurface('docs/workspace/templates/self-improvement-codex-prompt.md');

console.log('BMAD Tool-Leverage invariant tests passed');
