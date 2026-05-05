/**
 * Validates BMAD self-improvement automation invariants.
 *
 * Usage:
 *   node tools/validate-self-improve-invariants.js [--project-root <path>] [--baseline-policy <path>]
 */

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_INVARIANTS = [
  {
    id: 'SI-AUTO-001',
    label: 'fresh non-main branch',
    policyTerms: [
      'fresh non-main branch',
      'current `HEAD`',
      'base_ref',
      'codex/self-improve-',
      'created for the current run before improvement edits',
    ],
  },
  { id: 'SI-AUTO-002', label: 'main and push guard', policyTerms: ['never', '`main`', 'never', 'pushes'] },
  { id: 'SI-AUTO-003', label: 'local conventional commits', policyTerms: ['local commits', 'Conventional Commits'] },
  {
    id: 'SI-AUTO-004',
    label: 'dirty worktree preservation',
    policyTerms: [
      'dirty',
      'git status --porcelain --untracked-files=all',
      'chore: preserve pre-automation worktree state',
      'secret',
      'huge generated artifact',
      'abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits',
    ],
  },
  {
    id: 'SI-AUTO-005',
    label: 'full gates',
    policyTerms: ['npm ci && npm run quality', 'on `HEAD` of the exact checkout'],
  },
  {
    id: 'SI-AUTO-006',
    label: 'fix attempt cap',
    policyTerms: ['max_fix_attempts=5', 'leaves the branch dirty', 'marks continuation blocked'],
  },
  { id: 'SI-AUTO-007', label: 'iteration caps', policyTerms: ['max_iterations=1', 'max_iterations=3', 'daily_cap=3'] },
  {
    id: 'SI-AUTO-008',
    label: 'schedule-aware continuation gate',
    policyTerms: [
      'effective automation schedule/config',
      'does not infer cadence',
      'install/refresh evidence',
      'checkpoint',
      'continuation',
    ],
  },
  {
    id: 'SI-AUTO-009',
    label: 'install and refresh evidence',
    policyTerms: ['/Users/edam/.agents', 'source and installed SHA-256 hashes', 'refresh status'],
  },
  {
    id: 'SI-AUTO-010',
    label: 'self-edit and policy-edit baseline gate',
    policyTerms: ['baseline rules captured at loop start', 'Developer and Architect', 'deterministic invariant checker'],
  },
  {
    id: 'SI-AUTO-011',
    label: 'party mode target choice',
    policyTerms: ['Party Mode may choose any BMAD repo target', 'fresh non-main branch'],
  },
  { id: 'SI-AUTO-012', label: 'loop lock', policyTerms: ['automation.lock', 'stale lock', 'checkpointed failure evidence'] },
  {
    id: 'SI-AUTO-013',
    label: 'future hosted adapter boundary',
    policyTerms: ['Vercel Workflow WDK', 'future optional hosted orchestrator adapter', 'no Vercel runtime dependency'],
  },
];

const REQUIRED_SKILL_TERMS = [
  'local Codex automation loop',
  'SELF_IMPROVE_BASE_REF',
  'automation.lock',
  'codex/self-improve-',
  'git status --porcelain --untracked-files=all',
  'never push',
  'max_fix_attempts=5',
  'npm ci && npm run quality',
  'on `HEAD` of the exact checkout',
  'npm run validate:self-improve-invariants',
  'Party Mode consensus',
  'effective automation schedule/config',
  'Vercel Workflow WDK',
];

const REQUIRED_PROMPT_TERMS = [
  'Mode: local Codex automation loop',
  'max_iterations: 3',
  'daily_cap: 3',
  'max_fix_attempts: 5',
  'Automation schedule/config',
  'git status --porcelain --untracked-files=all',
  'chore: preserve pre-automation worktree state',
  'npm ci && npm run quality',
  'npm run validate:self-improve-invariants',
  'Vercel Workflow WDK is not part of this run',
];

const REQUIRED_CHECKPOINT_TERMS = [
  'Base SHA',
  'Baseline policy hash',
  'Lock path',
  'Preflight status command',
  'Preflight scan result',
  'Self-improve branch',
  'Preservation commit',
  'Policy Consensus Evidence',
  'Full Gate Output',
  'source SHA-256',
  'installed SHA-256',
  'Continuation Decision',
  'Resume Command',
];

const FORBIDDEN_SELF_IMPROVE_PHRASES = [
  'operator-invoked BMAD skill, not Codex automation',
  'Missing automation is expected',
  'missing automation is expected',
  'does not create or run scheduler',
  'Cron or recurring automation',
  'bmad-loop remains observe/coordination only; no execution authority',
];

function parseArgs(argv) {
  const args = { projectRoot: path.resolve(__dirname, '..'), baselinePolicy: null };
  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--project-root') {
      args.projectRoot = path.resolve(argv[++index]);
    } else if (arg === '--baseline-policy') {
      args.baselinePolicy = path.resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing required file: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function hasTerm(content, term) {
  const lowerContent = content.toLowerCase();
  const lowerTerm = term.toLowerCase();
  if (/=\d$/.test(lowerTerm)) {
    let index = lowerContent.indexOf(lowerTerm);
    while (index !== -1) {
      const nextCharacter = lowerContent.at(index + lowerTerm.length);
      if (nextCharacter === undefined || nextCharacter < '0' || nextCharacter > '9') {
        return true;
      }
      index = lowerContent.indexOf(lowerTerm, index + 1);
    }
    return false;
  }
  return lowerContent.includes(lowerTerm);
}

function requireTerms(content, terms, sourceName, errors) {
  for (const term of terms) {
    if (!hasTerm(content, term)) {
      errors.push(`${sourceName} missing required term: ${term}`);
    }
  }
}

function requireNoTerms(content, terms, sourceName, errors) {
  for (const term of terms) {
    if (hasTerm(content, term)) {
      errors.push(`${sourceName} contains retired manual-only phrase: ${term}`);
    }
  }
}

function invariantIds(content) {
  const matches = content.matchAll(/\bSI-AUTO-\d{3}\b/g);
  return new Set([...matches].map((match) => match[0]));
}

function validateSelfImproveInvariants(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];
  const files = {
    policy: path.join(projectRoot, 'docs', 'workspace', 'self-improvement-automation-policy.md'),
    skill: path.join(projectRoot, 'src', 'core-skills', 'bmad-self-improve', 'SKILL.md'),
    guide: path.join(projectRoot, 'docs', 'workspace', 'self-improvement-codex.md'),
    prompt: path.join(projectRoot, 'docs', 'workspace', 'templates', 'self-improvement-codex-prompt.md'),
    resume: path.join(projectRoot, 'docs', 'workspace', 'templates', 'self-improvement-codex-resume-prompt.md'),
    checkpoint: path.join(projectRoot, 'docs', 'workspace', 'templates', 'self-improvement-checkpoint.template.md'),
    moduleHelp: path.join(projectRoot, 'src', 'core-skills', 'module-help.csv'),
    packageJson: path.join(projectRoot, 'package.json'),
  };

  const policy = readRequired(files.policy);
  const skill = readRequired(files.skill);
  const guide = readRequired(files.guide);
  const prompt = readRequired(files.prompt);
  const resume = readRequired(files.resume);
  const checkpoint = readRequired(files.checkpoint);
  const moduleHelp = readRequired(files.moduleHelp);
  const packageJson = JSON.parse(readRequired(files.packageJson));

  for (const invariant of REQUIRED_INVARIANTS) {
    if (!policy.includes(invariant.id)) {
      errors.push(`policy missing invariant id ${invariant.id} (${invariant.label})`);
    }
    if (!skill.includes(invariant.id)) {
      errors.push(`skill missing invariant id ${invariant.id} (${invariant.label})`);
    }
    requireTerms(policy, invariant.policyTerms, `policy ${invariant.id}`, errors);
  }

  if (options.baselinePolicy) {
    const baseline = readRequired(options.baselinePolicy);
    const candidateIds = invariantIds(policy);
    for (const baselineId of invariantIds(baseline)) {
      if (!candidateIds.has(baselineId)) {
        errors.push(`candidate policy removed baseline invariant id: ${baselineId}`);
      }
    }
  }

  requireTerms(skill, REQUIRED_SKILL_TERMS, 'bmad-self-improve skill', errors);
  requireTerms(prompt, REQUIRED_PROMPT_TERMS, 'self-improvement prompt', errors);
  requireTerms(checkpoint, REQUIRED_CHECKPOINT_TERMS, 'checkpoint template', errors);
  requireTerms(guide, ['local Codex automation loop', 'Self-Improvement Automation Policy', 'Vercel Workflow WDK'], 'runbook', errors);
  requireTerms(resume, ['automation.lock', 'max_fix_attempts=5', 'continuation state'], 'resume prompt', errors);
  requireTerms(moduleHelp, ['local Codex automation-capable BMAD self-improvement', 'continuation'], 'module-help.csv', errors);
  requireNoTerms([skill, guide, prompt].join('\n'), FORBIDDEN_SELF_IMPROVE_PHRASES, 'self-improvement docs', errors);

  const scripts = packageJson.scripts || {};
  if (scripts['validate:self-improve-invariants'] !== 'node tools/validate-self-improve-invariants.js') {
    errors.push('package.json missing validate:self-improve-invariants script');
  }
  if (!scripts.quality || !scripts.quality.includes('validate:self-improve-invariants')) {
    errors.push('package.json quality script must include validate:self-improve-invariants');
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const args = parseArgs(process.argv);
  const result = validateSelfImproveInvariants({ projectRoot: args.projectRoot, baselinePolicy: args.baselinePolicy });
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`SELF_IMPROVE_INVARIANT: ${error}`);
    }
    process.exit(1);
  }
  console.log('Self-improvement automation invariants valid.');
}

if (require.main === module) {
  main();
}

module.exports = { REQUIRED_INVARIANTS, validateSelfImproveInvariants };
