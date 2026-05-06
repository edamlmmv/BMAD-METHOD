/**
 * Validates generic BMAD loop invariants.
 *
 * Usage:
 *   node tools/validate-bmad-loop-invariants.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');

const LOOP_REFUSAL_MESSAGE =
  'BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.';

const LOOP_FILES = {
  policy: {
    label: 'BMAD loop policy',
    relativePath: path.join('docs', 'workspace', 'bmad-loop-automation-policy.md'),
  },
  platform: {
    label: 'loop platform v1 doc',
    relativePath: path.join('docs', 'workspace', 'loop-platform-v1.md'),
  },
  candidates: {
    label: 'loop candidate registry',
    relativePath: path.join('docs', 'workspace', 'loop-candidate-registry.md'),
  },
  skill: {
    label: 'bmad-loop skill',
    relativePath: path.join('src', 'core-skills', 'bmad-loop', 'SKILL.md'),
  },
  customize: {
    label: 'bmad-loop customize surface',
    relativePath: path.join('src', 'core-skills', 'bmad-loop', 'customize.toml'),
  },
  guide: {
    label: 'BMAD loop runbook',
    relativePath: path.join('docs', 'workspace', 'bmad-loop.md'),
  },
  prompt: {
    label: 'BMAD loop prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'bmad-loop-codex-prompt.md'),
  },
  resume: {
    label: 'BMAD loop resume prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'bmad-loop-codex-resume-prompt.md'),
  },
  checkpoint: {
    label: 'BMAD loop checkpoint template',
    relativePath: path.join('docs', 'workspace', 'templates', 'bmad-loop-checkpoint.template.md'),
  },
  checkpointExample: {
    label: 'BMAD loop checkpoint example',
    relativePath: path.join('docs', 'workspace', 'templates', 'bmad-loop-checkpoint.example.md'),
  },
  bundleTemplate: {
    label: 'workflow bundle template',
    relativePath: path.join('docs', 'workspace', 'templates', 'workflow-bundle.template.md'),
  },
  partyGateTemplate: {
    label: 'loop party mode gate template',
    relativePath: path.join('docs', 'workspace', 'templates', 'loop-party-mode-gate.template.md'),
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

const LOOP_INVARIANTS = [
  {
    id: 'LOOP-AUTO-001',
    label: 'fresh non-main branch',
    policyTerms: ['fresh non-main branch', 'current `HEAD`', 'base_ref', 'created for the current run before improvement edits'],
  },
  { id: 'LOOP-AUTO-002', label: 'main and push guard', policyTerms: ['never pushes', 'remote', '`main`'] },
  { id: 'LOOP-AUTO-003', label: 'local conventional commits', policyTerms: ['local commits', 'Conventional Commits'] },
  {
    id: 'LOOP-AUTO-004',
    label: 'dirty worktree preservation',
    policyTerms: [
      'git status --porcelain --untracked-files=all',
      'high-confidence secrets',
      'huge generated artifacts',
      'abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits',
    ],
  },
  {
    id: 'LOOP-AUTO-005',
    label: 'full gates',
    policyTerms: ['configured quality command', 'on `HEAD` of the exact checkout', 'npm ci && npm run quality'],
  },
  { id: 'LOOP-AUTO-006', label: 'fix attempt cap', policyTerms: ['max_fix_attempts=5', 'marks continuation blocked'] },
  { id: 'LOOP-AUTO-007', label: 'iteration caps', policyTerms: ['max_iterations=1', 'max_iterations=3', 'daily_cap=3'] },
  {
    id: 'LOOP-AUTO-008',
    label: 'schedule-aware continuation',
    policyTerms: ['effective automation schedule/config', 'does not infer cadence', 'Continuation is allowed only after gates pass'],
  },
  {
    id: 'LOOP-AUTO-009',
    label: 'install and refresh evidence',
    policyTerms: ['repo-local or test targets first', 'source and installed SHA-256 hashes', 'refresh status'],
  },
  {
    id: 'LOOP-AUTO-010',
    label: 'loop-edit baseline gate',
    policyTerms: ['baseline rules captured at loop start', 'deterministic invariant validation'],
  },
  {
    id: 'LOOP-AUTO-011',
    label: 'party mode goal boundary',
    policyTerms: ['Party Mode may critique a plan and refine an instantiated goal', 'must not silently create a goal'],
  },
  { id: 'LOOP-AUTO-012', label: 'loop lock', policyTerms: ['automation.lock', 'stale lock', 'checkpointed failure evidence'] },
  {
    id: 'LOOP-AUTO-013',
    label: 'future hosted adapter boundary',
    policyTerms: ['Vercel Workflow WDK', 'future optional adapters', 'wrap this local policy'],
  },
];

const REQUIRED_CUSTOMIZE_TERMS = [
  'loop_skill = "bmad-loop"',
  'branch_prefix = "codex/loop-"',
  'checkpoint_subdir = "{output_folder}/loops"',
  'goal_ref = ""',
  'scope = ""',
  'prompt_template = "docs/workspace/templates/bmad-loop-codex-prompt.md"',
  'resume_prompt_template = "docs/workspace/templates/bmad-loop-codex-resume-prompt.md"',
  'checkpoint_template = "docs/workspace/templates/bmad-loop-checkpoint.template.md"',
  'quality_command = "npm ci && npm run quality"',
  'max_iterations = 1',
  'daily_cap = 1',
  'max_fix_attempts = 5',
];

const LOOP_RUN_CONFIG_FIELDS = [
  'loop_skill',
  'loop_slug',
  'goal_ref',
  'scope',
  'repo_path',
  'branch_prefix',
  'checkpoint_subdir',
  'allowed_write_roots',
  'policy_ref',
  'runbook_ref',
  'prompt_template',
  'resume_prompt_template',
  'checkpoint_template',
  'stop_condition',
  'quality_command',
  'max_iterations',
  'daily_cap',
  'max_fix_attempts',
  'persistent_facts',
  'activation_steps_prepend',
  'activation_steps_append',
  'on_complete',
];

const REQUIRED_STATE_TERMS = [
  'Input resolved',
  'Lock acquired',
  'Dirty preflight/scanned',
  'Branch ready',
  'Party Mode plan',
  'Party Mode critique',
  'TDD slices',
  'Quality gate',
  'Install/refresh evidence',
  'Local commit',
  'Checkpoint',
  'Complete, blocked, or continuation-ready',
];

function parseArgs(argv) {
  const args = { projectRoot: path.resolve(__dirname, '..') };
  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    switch (arg) {
      case '--project-root': {
        args.projectRoot = path.resolve(argv[++index]);

        break;
      }
      case '--checkpoint': {
        args.checkpoint = path.resolve(argv[++index]);

        break;
      }
      case '--require-continuation-allowed': {
        args.requireContinuationAllowed = true;

        break;
      }
      default: {
        throw new Error(`unknown argument: ${arg}`);
      }
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
    addError(errors, 'LOOP_FILE_MISSING', `missing required file: ${fileLabel}`, { file: fileLabel });
    return null;
  }
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    addError(errors, 'LOOP_FILE_READ_FAILED', `could not read required file: ${fileLabel}: ${error.message}`, { file: fileLabel });
    return null;
  }
}

function readOptional(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function hasTerm(content, term) {
  return content.toLowerCase().includes(term.toLowerCase());
}

function requireTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'LOOP_TERM_MISSING') {
  for (const term of terms) {
    if (!hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} missing required term: ${term}`, { file: fileLabel, field: term });
    }
  }
}

function requireNoTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'LOOP_FORBIDDEN_TERM') {
  for (const term of terms) {
    if (hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} contains forbidden generic-loop term: ${term}`, {
        file: fileLabel,
        field: term,
      });
    }
  }
}

function extractWorkflowAssignmentKeys(content) {
  const keys = [];
  let inWorkflow = false;
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const header = trimmed.match(/^\[([^[\]]+)\]$/u);
    if (header) {
      inWorkflow = header[1] === 'workflow';
      continue;
    }
    if (!inWorkflow) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

function validateWorkflowOverrideKeys(content, allowedFields, sourceName, fileLabel, errors, errorCode = 'LOOP_OVERRIDE_FIELD') {
  const allowed = new Set(allowedFields);
  for (const key of extractWorkflowAssignmentKeys(content)) {
    if (!allowed.has(key)) {
      addError(errors, errorCode, `${sourceName} contains unsupported workflow field: ${key}`, {
        file: fileLabel,
        field: key,
      });
    }
  }
}

function countIds(content, prefix) {
  const counts = new Map();
  for (const match of content.matchAll(new RegExp(`\\b${prefix}-\\d{3}\\b`, 'g'))) {
    counts.set(match[0], (counts.get(match[0]) || 0) + 1);
  }
  return counts;
}

function validateInvariantIds(content, sourceName, fileLabel, errors) {
  const requiredIds = new Set(LOOP_INVARIANTS.map((invariant) => invariant.id));
  const counts = countIds(content, 'LOOP-AUTO');
  for (const [id, count] of counts) {
    if (!requiredIds.has(id)) {
      addError(errors, 'LOOP_ID_UNKNOWN', `${sourceName} contains unknown invariant id ${id}`, { file: fileLabel, id });
    }
    if (count > 1) {
      addError(errors, 'LOOP_ID_DUPLICATE', `${sourceName} contains duplicate invariant id ${id}`, { file: fileLabel, id });
    }
  }
  for (const id of requiredIds) {
    if (!counts.has(id)) {
      addError(errors, 'LOOP_ID_MISSING', `${sourceName} missing invariant id ${id}`, { file: fileLabel, id });
    }
  }
}

function validateGoalResolution({ directGoal = '', workflow = {} } = {}) {
  const goal = String(directGoal || '').trim();
  const goalRef = String(workflow.goal_ref || '').trim();
  const scope = String(workflow.scope || '').trim();
  const stopCondition = String(workflow.stop_condition || '').trim();
  const qualityCommand = String(workflow.quality_command || '').trim();

  if (!stopCondition || !qualityCommand) {
    return { ok: false, error: LOOP_REFUSAL_MESSAGE, inputSource: null };
  }
  if (goal) return { ok: true, inputSource: 'direct_operator_goal', goal, constrainedByScope: Boolean(scope) };
  if (goalRef) return { ok: true, inputSource: 'workflow.goal_ref', goalRef, constrainedByScope: Boolean(scope) };
  if (scope) return { ok: true, inputSource: 'workflow.scope', scope, constrainedByScope: false };
  return { ok: false, error: LOOP_REFUSAL_MESSAGE, inputSource: null };
}

function validateCheckpointExample(content, sourceName, fileLabel, errors) {
  const evidenceBlocks = [...content.matchAll(/```yaml bmad_loop_checkpoint\n([\s\S]*?)```/g)];
  if (evidenceBlocks.length !== 1) {
    addError(errors, 'LOOP_CHECKPOINT_EVIDENCE', `${sourceName} must contain exactly one yaml bmad_loop_checkpoint block`, {
      file: fileLabel,
    });
  }
  requireTerms(
    content,
    ['activation_state:', 'resume_contract:', 'session_identity:', 'evidence_gates:', 'Final HEAD SHA:'],
    sourceName,
    errors,
    fileLabel,
    'LOOP_CHECKPOINT_CONTRACT',
  );
}

function validatePackageScripts(packageJsonContent, fileLabel, errors) {
  let packageJson = {};
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    addError(errors, 'LOOP_PACKAGE_JSON_INVALID', `package.json contains invalid JSON: ${error.message}`, { file: fileLabel });
    return;
  }
  const scripts = packageJson.scripts || {};
  if (scripts['validate:bmad-loop-invariants'] !== 'node tools/validate-bmad-loop-invariants.js') {
    addError(errors, 'LOOP_PACKAGE_SCRIPT', 'package.json missing validate:bmad-loop-invariants script', {
      file: fileLabel,
      field: 'validate:bmad-loop-invariants',
    });
  }
  if (!scripts.quality || !scripts.quality.includes('validate:bmad-loop-invariants')) {
    addError(errors, 'LOOP_PACKAGE_SCRIPT', 'package.json quality script must include validate:bmad-loop-invariants', {
      file: fileLabel,
      field: 'quality',
    });
  }
}

function validateBmadLoopInvariants(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];
  const files = Object.fromEntries(
    Object.entries(LOOP_FILES).map(([key, definition]) => [
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

  validateInvariantIds(contents.policy, 'BMAD loop policy', files.policy.relativePath, errors);
  validateInvariantIds(contents.skill, 'bmad-loop skill', files.skill.relativePath, errors);

  for (const invariant of LOOP_INVARIANTS) {
    requireTerms(contents.policy, invariant.policyTerms, `policy ${invariant.id}`, errors, files.policy.relativePath);
  }

  requireTerms(
    contents.platform,
    ['WorkflowBundle', 'LoopRunConfig', 'operator-assist only', 'no persisted recursion'],
    'loop platform v1 doc',
    errors,
    files.platform.relativePath,
  );
  requireTerms(
    contents.candidates,
    ['Optimization loop', 'Bug triage loop', 'Review-hardening loop', 'one candidate at a time'],
    'loop candidate registry',
    errors,
    files.candidates.relativePath,
  );
  requireTerms(
    contents.skill,
    [
      LOOP_REFUSAL_MESSAGE,
      'Customize may author instance defaults only',
      'WorkflowBundle',
      'LoopRunConfig',
      '/workflow-start',
      'no first-class queue or scheduler model',
      'State Machine',
    ],
    'bmad-loop skill',
    errors,
    files.skill.relativePath,
  );
  requireTerms(contents.customize, REQUIRED_CUSTOMIZE_TERMS, 'bmad-loop customize surface', errors, files.customize.relativePath);
  requireTerms(
    contents.guide,
    [LOOP_REFUSAL_MESSAGE, 'WorkflowBundle', 'LoopRunConfig', 'Template Contract', 'Customize Boundary', 'Codex Boundary'],
    'BMAD loop runbook',
    errors,
    files.guide.relativePath,
  );
  requireTerms(
    contents.prompt,
    [
      LOOP_REFUSAL_MESSAGE,
      'WorkflowBundle id:',
      'Run mode: one-shot|recurring',
      'prompt_template',
      'resume_prompt_template',
      'checkpoint_template',
      'Goal source:',
      'quality_command: npm ci && npm run quality',
    ],
    'BMAD loop prompt',
    errors,
    files.prompt.relativePath,
  );
  requireTerms(
    contents.resume,
    [
      'Resume the BMAD loop',
      'WorkflowBundle id:',
      'Run mode: one-shot|recurring',
      'Activation State',
      'Resume Contract',
      'Session Identity',
    ],
    'BMAD loop resume prompt',
    errors,
    files.resume.relativePath,
  );
  requireTerms(
    contents.checkpoint,
    [...REQUIRED_STATE_TERMS, 'Workflow Bundle', 'Run mode:', 'Party Mode Gate Output', 'Template contract'],
    'BMAD loop checkpoint template',
    errors,
    files.checkpoint.relativePath,
  );
  requireTerms(
    contents.bundleTemplate,
    [
      'Bundle id:',
      'Goal Input Contract',
      'prompt_template',
      'resume_prompt_template',
      'checkpoint_template',
      'Operator-assist-only reminder',
    ],
    'workflow bundle template',
    errors,
    files.bundleTemplate.relativePath,
  );
  requireTerms(
    contents.partyGateTemplate,
    ['Goal:', 'Success metric:', 'Chosen run mode:', 'Recommended BMAD route:', 'Deferred questions:'],
    'loop party mode gate template',
    errors,
    files.partyGateTemplate.relativePath,
  );
  requireTerms(
    contents.moduleHelp,
    ['Core,bmad-loop,', 'BMAD Loop,BL', 'WorkflowBundle'],
    'module-help.csv',
    errors,
    files.moduleHelp.relativePath,
  );
  validateCheckpointExample(contents.checkpointExample, 'BMAD loop checkpoint example', files.checkpointExample.relativePath, errors);
  validatePackageScripts(contents.packageJson, files.packageJson.relativePath, errors);

  for (const relativePath of [path.join('_bmad', 'custom', 'bmad-loop.toml'), path.join('_bmad', 'custom', 'bmad-loop.user.toml')]) {
    const filePath = path.join(projectRoot, relativePath);
    const overrideContent = readOptional(filePath);
    if (overrideContent !== null) {
      validateWorkflowOverrideKeys(overrideContent, LOOP_RUN_CONFIG_FIELDS, 'bmad-loop override', relativePath, errors);
    }
  }

  for (const key of [
    'policy',
    'platform',
    'candidates',
    'skill',
    'customize',
    'guide',
    'prompt',
    'resume',
    'checkpoint',
    'checkpointExample',
  ]) {
    requireNoTerms(
      contents[key],
      ['codex/self-improve-', '_bmad-output/self-improvement'],
      files[key].label,
      errors,
      files[key].relativePath,
    );
  }

  if (options.checkpoint) {
    const checkpoint = readRequired(options.checkpoint, errors, path.relative(projectRoot, options.checkpoint));
    if (checkpoint) {
      validateCheckpointExample(checkpoint, 'runtime checkpoint', path.relative(projectRoot, options.checkpoint), errors);
    }
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const args = parseArgs(process.argv);
  const result = validateBmadLoopInvariants(args);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`BMAD_LOOP_INVARIANT: ${error}`);
    }
    process.exit(1);
  }
  console.log('BMAD loop invariants valid.');
}

if (require.main === module) {
  main();
}

module.exports = {
  LOOP_FILES,
  LOOP_INVARIANTS,
  LOOP_RUN_CONFIG_FIELDS,
  LOOP_REFUSAL_MESSAGE,
  validateBmadLoopInvariants,
  validateGoalResolution,
  validateWorkflowOverrideKeys,
};
