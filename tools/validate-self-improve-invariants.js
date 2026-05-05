/**
 * Validates BMAD self-improvement automation invariants.
 *
 * Usage:
 *   node tools/validate-self-improve-invariants.js [--project-root <path>] [--baseline-policy <path>]
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const { validateBmadPlanningCapabilities } = require('./validate-bmad-planning-capabilities');

const CONTRACT_FILES = {
  policy: {
    label: 'policy',
    relativePath: path.join('docs', 'workspace', 'self-improvement-automation-policy.md'),
  },
  skill: {
    label: 'bmad-self-improve skill',
    relativePath: path.join('src', 'core-skills', 'bmad-self-improve', 'SKILL.md'),
  },
  partyMode: {
    label: 'bmad-party-mode skill',
    relativePath: path.join('src', 'core-skills', 'bmad-party-mode', 'SKILL.md'),
  },
  guide: {
    label: 'runbook',
    relativePath: path.join('docs', 'workspace', 'self-improvement-codex.md'),
  },
  prompt: {
    label: 'self-improvement prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-prompt.md'),
  },
  resume: {
    label: 'resume prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-resume-prompt.md'),
  },
  checkpoint: {
    label: 'checkpoint template',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-checkpoint.template.md'),
  },
  checkpointExample: {
    label: 'checkpoint example',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-checkpoint.example.md'),
  },
  moduleHelp: {
    label: 'module-help.csv',
    relativePath: path.join('src', 'core-skills', 'module-help.csv'),
  },
  packageJson: {
    label: 'package.json',
    relativePath: 'package.json',
  },
};

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
      'Continuation is allowed only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, and refresh state is known_good.',
      'refresh_state: unknown never allows continuation',
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
  'Activation State',
  'Resume Contract',
  'Session Identity',
  'active skill hash matches expected',
  'refresh state is known_good',
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
  'Activation State',
  'Resume Contract',
  'Session Identity',
  'refresh_state: unknown never allows continuation',
  'Vercel Workflow WDK is not part of this run',
];

const REQUIRED_CHECKPOINT_TERMS = [
  'Objective',
  'Question',
  'Mode and Inputs',
  '`repo_path`:',
  '`base_ref`:',
  '`scope`:',
  '`stop_condition`:',
  'effective automation schedule/config consulted:',
  'explicit operator schedule/cap overrides:',
  '`max_iterations`:',
  '`daily_cap`:',
  '`max_fix_attempts`:',
  'Baseline Evidence',
  'Base SHA',
  'Original branch',
  'Baseline policy hash',
  'Baseline policy path',
  'Final HEAD SHA',
  'Lock Evidence',
  'Lock path',
  'Lock acquired',
  'Stale lock handling',
  'Lock released',
  'Branch Evidence',
  'Branch created from',
  'Main guard result',
  'Push guard result',
  'Dirty Worktree Preservation',
  'Dirty files before loop',
  'Preflight status command',
  'Preflight status output',
  'Preflight scan result',
  'Branch mutation blocked before scan pass',
  'Secret/huge generated artifact scan',
  'Self-improve branch',
  'Preservation commit',
  'Party Mode Decision',
  'Plan Status',
  'Party Mode Critique',
  'Policy Consensus Evidence',
  'Implementation Evidence',
  'Changed Files',
  'Tests Run',
  'Pass/Fail Output',
  'Full Gate Output',
  'compile/install Evidence',
  'Refresh Evidence',
  'source SHA-256',
  'installed SHA-256',
  'Activation State',
  'activation_state:',
  'repo_quality: pass|fail|unknown',
  'repo_local_install: pass|fail|unknown',
  'active_user_install: pass|fail|blocked|unknown',
  'active_skill_hash: match|mismatch|unknown',
  'refresh_state: known_good|failed|blocked|unknown',
  'Resume Contract',
  'resume_contract:',
  'continuation_allowed: true|false',
  'required_before_resume:',
  'Session Identity',
  'session_identity:',
  'codex_thread_id: string|null',
  'workspace_session_id: string|null',
  'classification: valid_workspace_session|codex_thread_only|session_not_found|unknown',
  'Continuation Decision',
  'Local Commits',
  'Resume Command',
  'Next Operator Decision',
  'Risks',
];

const REQUIRED_PARTY_MODE_CONTRACTS = [
  {
    label: 'thread/session hygiene',
    terms: [
      'thread/session hygiene',
      'close stale Party Mode threads',
      'start fresh threads for new consensus loops',
      'orphan threads',
      'task-scoped',
    ],
  },
  {
    label: 'Codex agent budget',
    terms: ['[agents].max_threads', 'max_threads=6', 'max_depth=1', '2-4', 'max_threads', 'max_depth'],
  },
  {
    label: 'Codex config boundary',
    terms: [
      'subagents are enabled by default',
      '~/.codex/agents',
      '.codex/agents',
      'project .codex/config.toml',
      'trusted projects',
      'features.codex_hooks',
      'no repo .codex/config.toml',
    ],
  },
  {
    label: 'TDD voice injection',
    terms: ['TDD voice injection', 'red-green-refactor', 'one failing behavior test', 'public behavior', 'implementation planning'],
  },
];

const FORBIDDEN_SELF_IMPROVE_PHRASES = [
  'operator-invoked BMAD skill, not Codex automation',
  'Missing automation is expected',
  'missing automation is expected',
  'does not create or run scheduler',
  'Cron or recurring automation',
  'bmad-loop remains observe/coordination only; no execution authority',
];

const ALLOWED_TEMPLATE_PLACEHOLDERS = new Set(['skill-root', 'project-root', 'output_folder']);
const CHECKPOINT_EVIDENCE_INFO_STRING = 'yaml self_improvement_checkpoint';
const CHECKPOINT_EVIDENCE_TOP_LEVEL_KEYS = Object.freeze(['activation_state', 'resume_contract', 'session_identity', 'evidence_gates']);
const CHECKPOINT_EVIDENCE_ENUMS = Object.freeze({
  'activation_state.repo_quality': ['pass', 'fail', 'unknown'],
  'activation_state.repo_local_install': ['pass', 'fail', 'unknown'],
  'activation_state.active_user_install': ['pass', 'fail', 'blocked', 'unknown'],
  'activation_state.active_skill_hash': ['match', 'mismatch', 'unknown'],
  'activation_state.refresh_state': ['known_good', 'failed', 'blocked', 'unknown'],
  'session_identity.classification': ['valid_workspace_session', 'codex_thread_only', 'session_not_found', 'unknown'],
  'evidence_gates.quality_gate': ['pass', 'fail', 'unknown'],
  'evidence_gates.repo_local_install_gate': ['pass', 'fail', 'unknown'],
  'evidence_gates.active_user_install_gate': ['pass', 'fail', 'blocked', 'unknown'],
  'evidence_gates.hash_gate': ['match', 'mismatch', 'unknown'],
  'evidence_gates.refresh_gate': ['known_good', 'failed', 'blocked', 'unknown'],
});

const CHECKPOINT_CONTINUATION_PASSING_VALUES = Object.freeze({
  'activation_state.repo_quality': 'pass',
  'activation_state.repo_local_install': 'pass',
  'activation_state.active_user_install': 'pass',
  'activation_state.active_skill_hash': 'match',
  'activation_state.refresh_state': 'known_good',
  'evidence_gates.quality_gate': 'pass',
  'evidence_gates.repo_local_install_gate': 'pass',
  'evidence_gates.active_user_install_gate': 'pass',
  'evidence_gates.hash_gate': 'match',
  'evidence_gates.refresh_gate': 'known_good',
});

const REQUIRED_SEQUENCE_CONTRACTS = [
  {
    sourceKey: 'skill',
    sectionHeading: '## Required Sequence',
    stopHeading: '## Self-Edit and Policy-Edit Gate',
    steps: [
      ['policy', 'Read `docs/workspace/self-improvement-automation-policy.md`'],
      ['baseline', 'record `SELF_IMPROVE_BASE_REF=$(git rev-parse HEAD)`'],
      ['schedule', 'Read the effective automation schedule/config'],
      ['lock', 'Acquire `{output_folder}/self-improvement/automation.lock`'],
      ['dirty preflight', 'Run `git status --porcelain --untracked-files=all` before branch creation'],
      ['dirty preservation', 'preserve the current checkout'],
      ['fresh branch', 'Create or switch to a fresh non-main `codex/self-improve-*` branch'],
      ['party decision', 'Run `skill:bmad-party-mode` before writing any plan'],
      ['plan', 'Write a decision-complete plan'],
      ['party critique', 'Run `skill:bmad-party-mode` again before implementation'],
      ['tdd', 'Implement with TDD'],
      ['targeted validation', 'Run targeted validation'],
      ['full gate', 'Run `npm ci && npm run quality`'],
      ['invariant validator', 'Run `npm run validate:self-improve-invariants`'],
      ['install', 'compile/install updated BMAD skills'],
      ['refresh', 'Verify Codex refresh behavior'],
      ['activation state', 'Record Activation State'],
      ['resume contract', 'Record Resume Contract'],
      ['session identity', 'Record Session Identity'],
      ['commit', 'Commit passing work locally'],
      ['checkpoint', 'Write final checkpoint'],
      ['continuation', 'Allow continuation only'],
    ],
  },
  {
    sourceKey: 'guide',
    sectionHeading: '## What It Does',
    stopHeading: '## Preflight Contract',
    steps: [
      ['baseline', 'Baseline policy capture'],
      ['dirty preflight', 'Dirty worktree preflight'],
      ['dirty preservation', 'Dirty worktree preservation'],
      ['fresh branch', 'Fresh non-main branch creation'],
      ['party decision', 'Party Mode target decision'],
      ['plan', 'Plan'],
      ['party critique', 'Party Mode critique'],
      ['tdd', 'TDD implementation'],
      ['full gate', '`npm ci && npm run quality`'],
      ['install', 'BMAD compile/install'],
      ['refresh', 'Codex refresh evidence'],
      ['activation state', 'Activation State'],
      ['commit', 'Local Conventional Commit'],
      ['checkpoint', 'Final checkpoint'],
      ['continuation', 'Continuation decision'],
    ],
  },
  {
    sourceKey: 'prompt',
    sectionHeading: 'Required policy:',
    stopHeading: 'Failure behavior:',
    steps: [
      ['dirty preflight', 'Before branch creation, run `git status --porcelain --untracked-files=all`'],
      ['dirty scan', 'If the worktree is dirty, scan pending files'],
      ['scan failure', 'If the scan fails, abort before preservation'],
      ['dirty preservation', 'If the scan passes, preserve non-ignored dirty state'],
      ['fresh branch', 'Create or switch to the fresh branch'],
      ['party decision', 'Run `skill:bmad-party-mode` before writing any plan'],
      ['plan', 'Write a decision-complete plan'],
      ['party critique', 'Run `skill:bmad-party-mode` again before implementation'],
      ['tdd', 'Implement with TDD'],
      ['full gate', 'Run `npm ci && npm run quality`'],
      ['invariant validator', 'Run `npm run validate:self-improve-invariants`'],
      ['install', 'compile/install updated BMAD skills'],
      ['refresh', 'Actively request Codex skill reload'],
      ['activation state', 'Record Activation State'],
      ['commit', 'Commit passing work locally'],
      ['checkpoint', 'Write checkpoint evidence'],
      ['continuation', 'Allow continuation only'],
    ],
  },
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

function addError(errors, code, message, details = {}) {
  const metadata = [];
  if (details.file) metadata.push(`file=${details.file}`);
  if (details.field) metadata.push(`field=${details.field}`);
  if (details.id) metadata.push(`id=${details.id}`);
  const suffix = metadata.length > 0 ? ` [${metadata.join(' ')}]` : '';
  errors.push(`${code} ${message}${suffix}`);
}

function readRequired(filePath, errors, fileLabel = filePath) {
  if (!fs.existsSync(filePath)) {
    addError(errors, 'SI_FILE_MISSING', `missing required file: ${fileLabel}`, { file: fileLabel });
    return null;
  }
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    addError(errors, 'SI_FILE_READ_FAILED', `could not read required file: ${fileLabel}: ${error.message}`, { file: fileLabel });
    return null;
  }
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

function requireTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'SI_TERM_MISSING') {
  for (const term of terms) {
    if (!hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} missing required term: ${term}`, { file: fileLabel, field: term });
    }
  }
}

function requireNoTerms(content, terms, sourceName, errors, fileLabel) {
  for (const term of terms) {
    if (hasTerm(content, term)) {
      addError(errors, 'SI_RETIRED_PHRASE', `${sourceName} contains retired manual-only phrase: ${term}`, {
        file: fileLabel,
        field: term,
      });
    }
  }
}

function requireConceptGroups(content, groups, sourceName, errors, fileLabel) {
  for (const group of groups) {
    const missingTerms = group.terms.filter((term) => !hasTerm(content, term));
    if (missingTerms.length > 0) {
      addError(errors, 'SI_PARTY_MODE_CONTRACT', `${sourceName} missing required concept: ${group.label}`, {
        file: fileLabel,
        field: group.label,
      });
    }
  }
}

function invariantIds(content) {
  const matches = content.matchAll(/\bSI-AUTO-\d{3}\b/g);
  return new Set([...matches].map((match) => match[0]));
}

function countInvariantIds(content) {
  const counts = new Map();
  for (const match of content.matchAll(/\bSI-AUTO-\d{3}\b/g)) {
    counts.set(match[0], (counts.get(match[0]) || 0) + 1);
  }
  return counts;
}

function validateInvariantIds(content, sourceName, fileLabel, errors) {
  const requiredIds = new Set(REQUIRED_INVARIANTS.map((invariant) => invariant.id));
  const counts = countInvariantIds(content);
  for (const [id, count] of counts) {
    if (!requiredIds.has(id)) {
      addError(errors, 'SI_ID_UNKNOWN', `${sourceName} contains unknown invariant id ${id}`, { file: fileLabel, id });
    }
    if (count > 1) {
      addError(errors, 'SI_ID_DUPLICATE', `${sourceName} contains duplicate invariant id ${id}`, { file: fileLabel, id });
    }
  }
}

function validatePlaceholders(content, sourceName, fileLabel, errors) {
  for (const match of content.matchAll(/\{([A-Za-z0-9_-]+)\}/g)) {
    const placeholder = match[1];
    if (!ALLOWED_TEMPLATE_PLACEHOLDERS.has(placeholder)) {
      addError(errors, 'SI_PLACEHOLDER_UNKNOWN', `${sourceName} contains unknown placeholder {${placeholder}}`, {
        file: fileLabel,
        field: `{${placeholder}}`,
      });
    }
  }
}

function validateFenceBalance(content, sourceName, fileLabel, errors) {
  const fenceCount = (content.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    addError(errors, 'SI_MARKDOWN_FENCE_UNBALANCED', `${sourceName} has unbalanced markdown code fences`, {
      file: fileLabel,
    });
  }
}

function sliceSection(content, sectionHeading, stopHeading) {
  const start = content.indexOf(sectionHeading);
  if (start === -1) {
    return '';
  }
  const bodyStart = start + sectionHeading.length;
  const stop = stopHeading ? content.indexOf(stopHeading, bodyStart) : -1;
  return content.slice(bodyStart, stop === -1 ? undefined : stop);
}

function validateOrderedSequence(content, contract, sourceName, fileLabel, errors) {
  const section = sliceSection(content, contract.sectionHeading, contract.stopHeading);
  if (!section) {
    addError(errors, 'SI_SEQUENCE_SECTION_MISSING', `${sourceName} missing ordered sequence section: ${contract.sectionHeading}`, {
      file: fileLabel,
      field: contract.sectionHeading,
    });
    return;
  }

  let previousIndex = -1;
  let previousStep = null;
  for (const [stepName, term] of contract.steps) {
    const index = section.indexOf(term);
    if (index === -1) {
      addError(errors, 'SI_SEQUENCE_STEP_MISSING', `${sourceName} missing ordered sequence step: ${stepName}`, {
        file: fileLabel,
        field: stepName,
      });
      continue;
    }
    if (index < previousIndex) {
      addError(errors, 'SI_SEQUENCE_ORDER', `${sourceName} ordered sequence step "${stepName}" appears before "${previousStep}"`, {
        file: fileLabel,
        field: stepName,
      });
    }
    previousIndex = index;
    previousStep = stepName;
  }
}

function getPathValue(object, fieldPath) {
  return fieldPath.split('.').reduce((value, key) => {
    if (value && typeof value === 'object' && Object.hasOwn(value, key)) {
      return value[key];
    }
    return;
  }, object);
}

function validateCheckpointEvidence(content, sourceName, fileLabel, errors) {
  const blocks = [...content.matchAll(/^```yaml self_improvement_checkpoint[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm)].map((match) => match[1]);

  if (blocks.length === 0) {
    addError(errors, 'SI_CHECKPOINT_EVIDENCE_MISSING', `${sourceName} missing ${CHECKPOINT_EVIDENCE_INFO_STRING} block`, {
      file: fileLabel,
      field: CHECKPOINT_EVIDENCE_INFO_STRING,
    });
    return;
  }

  if (blocks.length > 1) {
    addError(
      errors,
      'SI_CHECKPOINT_EVIDENCE_MALFORMED',
      `${sourceName} must contain exactly one ${CHECKPOINT_EVIDENCE_INFO_STRING} block`,
      {
        file: fileLabel,
        field: CHECKPOINT_EVIDENCE_INFO_STRING,
      },
    );
    return;
  }

  let parsed;
  try {
    parsed = yaml.parse(blocks[0]);
  } catch (error) {
    addError(errors, 'SI_CHECKPOINT_EVIDENCE_MALFORMED', `${sourceName} checkpoint evidence YAML is invalid: ${error.message}`, {
      file: fileLabel,
      field: CHECKPOINT_EVIDENCE_INFO_STRING,
    });
    return;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    addError(errors, 'SI_CHECKPOINT_EVIDENCE_MALFORMED', `${sourceName} checkpoint evidence must be a YAML mapping`, {
      file: fileLabel,
      field: CHECKPOINT_EVIDENCE_INFO_STRING,
    });
    return;
  }

  for (const key of CHECKPOINT_EVIDENCE_TOP_LEVEL_KEYS) {
    if (!parsed[key] || typeof parsed[key] !== 'object' || Array.isArray(parsed[key])) {
      addError(errors, 'SI_CHECKPOINT_EVIDENCE_MALFORMED', `${sourceName} checkpoint evidence missing mapping: ${key}`, {
        file: fileLabel,
        field: key,
      });
    }
  }

  for (const [fieldPath, allowedValues] of Object.entries(CHECKPOINT_EVIDENCE_ENUMS)) {
    const value = getPathValue(parsed, fieldPath);
    if (!allowedValues.includes(value)) {
      addError(
        errors,
        'SI_CHECKPOINT_INVALID_ENUM',
        `${sourceName} checkpoint evidence ${fieldPath} must be one of: ${allowedValues.join('|')}`,
        {
          file: fileLabel,
          field: fieldPath,
        },
      );
    }
  }

  const continuationAllowed = getPathValue(parsed, 'resume_contract.continuation_allowed');
  if (typeof continuationAllowed !== 'boolean') {
    addError(errors, 'SI_CHECKPOINT_EVIDENCE_MALFORMED', `${sourceName} resume_contract.continuation_allowed must be boolean`, {
      file: fileLabel,
      field: 'resume_contract.continuation_allowed',
    });
    return;
  }

  if (!continuationAllowed) {
    return;
  }

  for (const [fieldPath, expectedValue] of Object.entries(CHECKPOINT_CONTINUATION_PASSING_VALUES)) {
    const actualValue = getPathValue(parsed, fieldPath);
    if (actualValue !== expectedValue) {
      addError(
        errors,
        'SI_CHECKPOINT_UNSAFE_CONTINUATION',
        `${sourceName} resume_contract.continuation_allowed requires ${fieldPath}=${expectedValue}`,
        {
          file: fileLabel,
          field: fieldPath,
        },
      );
    }
  }
}

function validateSelfImproveInvariants(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];
  const files = Object.fromEntries(
    Object.entries(CONTRACT_FILES).map(([key, definition]) => [
      key,
      {
        ...definition,
        filePath: path.join(projectRoot, definition.relativePath),
      },
    ]),
  );

  const contents = {};
  for (const [key, definition] of Object.entries(files)) {
    contents[key] = readRequired(definition.filePath, errors, definition.relativePath);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const { policy, skill, partyMode, guide, prompt, resume, checkpoint, checkpointExample, moduleHelp } = contents;
  let packageJson = {};
  try {
    packageJson = JSON.parse(contents.packageJson);
  } catch (error) {
    addError(errors, 'SI_PACKAGE_JSON_INVALID', `package.json contains invalid JSON: ${error.message}`, {
      file: files.packageJson.relativePath,
    });
    return { ok: false, errors };
  }

  validateInvariantIds(policy, 'policy', files.policy.relativePath, errors);
  validateInvariantIds(skill, 'bmad-self-improve skill', files.skill.relativePath, errors);

  for (const invariant of REQUIRED_INVARIANTS) {
    if (!policy.includes(invariant.id)) {
      addError(errors, 'SI_ID_MISSING', `policy missing invariant id ${invariant.id} (${invariant.label})`, {
        file: files.policy.relativePath,
        id: invariant.id,
      });
    }
    if (!skill.includes(invariant.id)) {
      addError(errors, 'SI_ID_MISSING', `skill missing invariant id ${invariant.id} (${invariant.label})`, {
        file: files.skill.relativePath,
        id: invariant.id,
      });
    }
    requireTerms(policy, invariant.policyTerms, `policy ${invariant.id}`, errors, files.policy.relativePath);
  }

  if (options.baselinePolicy) {
    const baseline = readRequired(options.baselinePolicy, errors, path.relative(projectRoot, options.baselinePolicy));
    if (baseline) {
      const candidateIds = invariantIds(policy);
      for (const baselineId of invariantIds(baseline)) {
        if (!candidateIds.has(baselineId)) {
          addError(errors, 'SI_BASELINE_ID_REMOVED', `candidate policy removed baseline invariant id: ${baselineId}`, {
            file: files.policy.relativePath,
            id: baselineId,
          });
        }
      }
    }
  }

  requireTerms(skill, REQUIRED_SKILL_TERMS, 'bmad-self-improve skill', errors, files.skill.relativePath);
  requireTerms(prompt, REQUIRED_PROMPT_TERMS, 'self-improvement prompt', errors, files.prompt.relativePath);
  requireTerms(
    checkpoint,
    REQUIRED_CHECKPOINT_TERMS,
    'checkpoint template',
    errors,
    files.checkpoint.relativePath,
    'SI_CHECKPOINT_CONTRACT',
  );
  requireTerms(
    guide,
    [
      'local Codex automation loop',
      'Self-Improvement Automation Policy',
      'Foreground Resume Quickstart',
      'Activation State',
      'Resume Contract',
      'Session Identity',
      'Vercel Workflow WDK',
    ],
    'runbook',
    errors,
    files.guide.relativePath,
  );
  validateCheckpointEvidence(checkpointExample, 'checkpoint example', files.checkpointExample.relativePath, errors);
  requireTerms(
    resume,
    [
      'Foreground Resume Quickstart',
      'automation.lock',
      'max_fix_attempts=5',
      'continuation state',
      'Activation State',
      'Resume Contract',
      'Session Identity',
    ],
    'resume prompt',
    errors,
    files.resume.relativePath,
  );
  requireTerms(
    moduleHelp,
    ['local Codex automation-capable BMAD self-improvement', 'continuation'],
    'module-help.csv',
    errors,
    files.moduleHelp.relativePath,
  );
  requireConceptGroups(partyMode, REQUIRED_PARTY_MODE_CONTRACTS, 'bmad-party-mode skill', errors, files.partyMode.relativePath);

  for (const key of ['policy', 'skill', 'guide', 'prompt', 'resume', 'checkpoint', 'checkpointExample', 'moduleHelp']) {
    validatePlaceholders(contents[key], files[key].label, files[key].relativePath, errors);
  }
  for (const key of ['policy', 'skill', 'partyMode', 'guide', 'prompt', 'resume', 'checkpoint', 'checkpointExample']) {
    validateFenceBalance(contents[key], files[key].label, files[key].relativePath, errors);
  }
  for (const contract of REQUIRED_SEQUENCE_CONTRACTS) {
    const definition = files[contract.sourceKey];
    validateOrderedSequence(contents[contract.sourceKey], contract, definition.label, definition.relativePath, errors);
  }
  for (const key of ['policy', 'skill', 'partyMode', 'guide', 'prompt', 'resume', 'checkpoint', 'checkpointExample', 'moduleHelp']) {
    requireNoTerms(contents[key], FORBIDDEN_SELF_IMPROVE_PHRASES, files[key].label, errors, files[key].relativePath);
  }

  const scripts = packageJson.scripts || {};
  if (scripts['validate:self-improve-invariants'] !== 'node tools/validate-self-improve-invariants.js') {
    addError(errors, 'SI_PACKAGE_SCRIPT', 'package.json missing validate:self-improve-invariants script', {
      file: files.packageJson.relativePath,
      field: 'validate:self-improve-invariants',
    });
  }
  if (!scripts.quality || !scripts.quality.includes('validate:self-improve-invariants')) {
    addError(errors, 'SI_PACKAGE_SCRIPT', 'package.json quality script must include validate:self-improve-invariants', {
      file: files.packageJson.relativePath,
      field: 'quality',
    });
  }

  const planningCapabilityResult = validateBmadPlanningCapabilities({ projectRoot });
  if (!planningCapabilityResult.ok) {
    errors.push(...planningCapabilityResult.errors);
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
