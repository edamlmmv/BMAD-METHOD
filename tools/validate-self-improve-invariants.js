/**
 * Validates BMAD self-improve instance invariants.
 *
 * Usage:
 *   node tools/validate-self-improve-invariants.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');
const { LOOP_REFUSAL_MESSAGE, validateBmadLoopInvariants, validateGoalResolution } = require('./validate-bmad-loop-invariants');
const { validateBmadPlanningCapabilities } = require('./validate-bmad-planning-capabilities');

const REQUIRED_INVARIANTS = [
  { id: 'SI-AUTO-001', loopId: 'LOOP-AUTO-001', label: 'fresh non-main branch' },
  { id: 'SI-AUTO-002', loopId: 'LOOP-AUTO-002', label: 'main and push guard' },
  { id: 'SI-AUTO-003', loopId: 'LOOP-AUTO-003', label: 'local conventional commits' },
  { id: 'SI-AUTO-004', loopId: 'LOOP-AUTO-004', label: 'dirty worktree preservation' },
  { id: 'SI-AUTO-005', loopId: 'LOOP-AUTO-005', label: 'full gates' },
  { id: 'SI-AUTO-006', loopId: 'LOOP-AUTO-006', label: 'fix attempt cap' },
  { id: 'SI-AUTO-007', loopId: 'LOOP-AUTO-007', label: 'iteration caps' },
  { id: 'SI-AUTO-008', loopId: 'LOOP-AUTO-008', label: 'schedule-aware continuation' },
  { id: 'SI-AUTO-009', loopId: 'LOOP-AUTO-009', label: 'install and refresh evidence' },
  { id: 'SI-AUTO-010', loopId: 'LOOP-AUTO-010', label: 'loop-edit baseline gate' },
  { id: 'SI-AUTO-011', loopId: 'LOOP-AUTO-011', label: 'party mode goal boundary' },
  { id: 'SI-AUTO-012', loopId: 'LOOP-AUTO-012', label: 'loop lock' },
  { id: 'SI-AUTO-013', loopId: 'LOOP-AUTO-013', label: 'future hosted adapter boundary' },
];

const SELF_FILES = {
  skill: {
    label: 'bmad-self-improve skill',
    relativePath: path.join('src', 'core-skills', 'bmad-self-improve', 'SKILL.md'),
  },
  customize: {
    label: 'bmad-self-improve customize surface',
    relativePath: path.join('src', 'core-skills', 'bmad-self-improve', 'customize.toml'),
  },
  guide: {
    label: 'self-improve runbook',
    relativePath: path.join('docs', 'workspace', 'self-improvement-codex.md'),
  },
  prompt: {
    label: 'self-improve prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-prompt.md'),
  },
  resume: {
    label: 'self-improve resume prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-resume-prompt.md'),
  },
  checkpoint: {
    label: 'self-improve checkpoint template',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-checkpoint.template.md'),
  },
  checkpointExample: {
    label: 'self-improve checkpoint example',
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
      case '--baseline-policy': {
        index += 1;

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
  return content.toLowerCase().includes(term.toLowerCase());
}

function requireTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'SI_TERM_MISSING') {
  for (const term of terms) {
    if (!hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} missing required term: ${term}`, { file: fileLabel, field: term });
    }
  }
}

function requireNoTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'SI_FORBIDDEN_TERM') {
  for (const term of terms) {
    if (hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} contains forbidden self-improve term: ${term}`, {
        file: fileLabel,
        field: term,
      });
    }
  }
}

function validatePackageScripts(packageJsonContent, fileLabel, errors) {
  let packageJson = {};
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    addError(errors, 'SI_PACKAGE_JSON_INVALID', `package.json contains invalid JSON: ${error.message}`, { file: fileLabel });
    return;
  }
  const scripts = packageJson.scripts || {};
  if (scripts['validate:self-improve-invariants'] !== 'node tools/validate-self-improve-invariants.js') {
    addError(errors, 'SI_PACKAGE_SCRIPT', 'package.json missing validate:self-improve-invariants script', {
      file: fileLabel,
      field: 'validate:self-improve-invariants',
    });
  }
  if (!scripts.quality || !scripts.quality.includes('validate:self-improve-invariants')) {
    addError(errors, 'SI_PACKAGE_SCRIPT', 'package.json quality script must include validate:self-improve-invariants', {
      file: fileLabel,
      field: 'quality',
    });
  }
}

function validateSelfImproveInvariants(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];

  const loopResult = validateBmadLoopInvariants({
    projectRoot,
    checkpoint: options.checkpoint,
    requireContinuationAllowed: options.requireContinuationAllowed,
  });
  if (!loopResult.ok) {
    errors.push(...loopResult.errors.map((error) => `SI_LOOP_CORE ${error}`));
  }

  const files = Object.fromEntries(
    Object.entries(SELF_FILES).map(([key, definition]) => [
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
  if (errors.some((error) => error.startsWith('SI_FILE_'))) {
    return { ok: false, errors };
  }

  for (const invariant of REQUIRED_INVARIANTS) {
    requireTerms(
      contents.skill,
      [invariant.id, invariant.loopId],
      `self-improve alias ${invariant.id}`,
      errors,
      files.skill.relativePath,
      'SI_ALIAS',
    );
  }

  requireTerms(
    contents.skill,
    [
      'skill:bmad-loop',
      LOOP_REFUSAL_MESSAGE,
      'Direct operator goal wins',
      'Party Mode must not silently create a goal',
      'skills/list',
      'forceReload: true',
    ],
    'bmad-self-improve skill',
    errors,
    files.skill.relativePath,
  );
  requireTerms(
    contents.customize,
    [
      'loop_skill = "bmad-loop"',
      'loop_slug = "self-improve"',
      'goal_ref = ""',
      'scope = ""',
      'repo_path = "{project-root}"',
      'branch_prefix = "codex/self-improve-"',
      'checkpoint_subdir = "{output_folder}/self-improvement"',
      'quality_command = "npm ci && npm run quality"',
      'max_fix_attempts = 5',
    ],
    'bmad-self-improve customize surface',
    errors,
    files.customize.relativePath,
  );
  requireTerms(
    contents.guide,
    [
      'bmad-loop',
      'Migration Notes',
      LOOP_REFUSAL_MESSAGE,
      'Old baked self-improve goal selection is removed',
      'SI-AUTO-* invariant names remain compatibility aliases only',
    ],
    'self-improve runbook',
    errors,
    files.guide.relativePath,
  );
  requireTerms(
    contents.prompt,
    [LOOP_REFUSAL_MESSAGE, 'Goal source:', 'Do not let Party Mode silently create a goal', 'npm run validate:bmad-loop-invariants'],
    'self-improve prompt',
    errors,
    files.prompt.relativePath,
  );
  requireTerms(
    contents.resume,
    [
      'Resume `bmad-self-improve`',
      'Activation State',
      'Resume Contract',
      'Session Identity',
      'Party Mode decisions refine an instantiated goal',
    ],
    'self-improve resume prompt',
    errors,
    files.resume.relativePath,
  );
  requireTerms(
    contents.checkpoint,
    ['Resolved Input', 'Goal created by Party Mode: false', 'State Machine', 'npm run validate:bmad-loop-invariants'],
    'self-improve checkpoint template',
    errors,
    files.checkpoint.relativePath,
  );
  requireTerms(
    contents.checkpointExample,
    ['Direct operator goal:', 'Goal created by Party Mode: false', 'yaml self_improvement_checkpoint'],
    'self-improve checkpoint example',
    errors,
    files.checkpointExample.relativePath,
  );
  requireTerms(
    contents.moduleHelp,
    ['Core,bmad-self-improve,', 'predefined bmad-loop instance', 'goal_ref', 'scope'],
    'module-help.csv',
    errors,
    files.moduleHelp.relativePath,
  );
  validatePackageScripts(contents.packageJson, files.packageJson.relativePath, errors);

  requireNoTerms(
    `${contents.skill}\n${contents.guide}\n${contents.prompt}`,
    ['Scope: any BMAD repo target selected by Party Mode', 'Party Mode chooses targets'],
    'self-improve surfaces',
    errors,
    files.skill.relativePath,
    'SI_GOAL_BOUNDARY',
  );

  const emptyGoalResult = validateGoalResolution({
    workflow: {
      goal_ref: '',
      scope: '',
      stop_condition: 'checkpoint written or max caps reached',
      quality_command: 'npm ci && npm run quality',
    },
  });
  if (emptyGoalResult.ok || emptyGoalResult.error !== LOOP_REFUSAL_MESSAGE) {
    addError(errors, 'SI_EMPTY_GOAL', 'empty self-improve goal must refuse with canonical loop refusal message', {
      file: files.customize.relativePath,
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
  const result = validateSelfImproveInvariants(args);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`SELF_IMPROVE_INVARIANT: ${error}`);
    }
    process.exit(1);
  }
  console.log('BMAD self-improve invariants valid.');
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_INVARIANTS,
  validateSelfImproveInvariants,
};
