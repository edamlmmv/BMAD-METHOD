/**
 * Validates BMAD self-improve instance invariants.
 *
 * Usage:
 *   node tools/validate-self-improve-invariants.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  CONSENSUS_GATE_FIELDS,
  CONSENSUS_GATE_TERMS,
  LOOP_REFUSAL_MESSAGE,
  LOOP_RUN_CONFIG_FIELDS,
  validateBmadLoopInvariants,
  validateGoalResolution,
  validateWorkflowOverrideKeys,
} = require('./validate-bmad-loop-invariants');
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
  templateIndex: {
    label: 'workspace template index',
    relativePath: path.join('docs', 'workspace', 'templates', 'index.md'),
  },
  architectureDriftReview: {
    label: 'architecture drift review template',
    relativePath: path.join('docs', 'workspace', 'templates', 'architecture-drift-review.template.md'),
  },
  toolLeverageReview: {
    label: 'tool leverage review template',
    relativePath: path.join('docs', 'workspace', 'templates', 'tool-leverage-review.template.md'),
  },
  highestLeverageOfficialMcpAddition: {
    label: 'highest-leverage official MCP addition template',
    relativePath: path.join('docs', 'workspace', 'templates', 'highest-leverage-official-mcp-addition.template.md'),
  },
  capabilityRefactorPlan: {
    label: 'capability refactor plan prompt template',
    relativePath: path.join('docs', 'workspace', 'templates', 'capability-refactor-plan-prompt.template.md'),
  },
  codeOptimizationRefactorPlan: {
    label: 'code optimization refactor plan prompt template',
    relativePath: path.join('docs', 'workspace', 'templates', 'code-optimization-refactor-plan-prompt.template.md'),
  },
  architectureDriftReviewSkill: {
    label: 'architecture drift review skill',
    relativePath: path.join('src', 'core-skills', 'bmad-architecture-drift-review', 'SKILL.md'),
  },
  toolLeverageReviewSkill: {
    label: 'tool leverage review skill',
    relativePath: path.join('src', 'core-skills', 'bmad-tool-leverage-review', 'SKILL.md'),
  },
  highestLeverageOfficialMcpAdditionSkill: {
    label: 'highest-leverage official MCP addition skill',
    relativePath: path.join('src', 'core-skills', 'bmad-highest-leverage-official-mcp-addition', 'SKILL.md'),
  },
  capabilityRefactorPlanSkill: {
    label: 'capability refactor plan prompt skill',
    relativePath: path.join('src', 'core-skills', 'bmad-capability-refactor-plan-prompt', 'SKILL.md'),
  },
  codeOptimizationRefactorPlanSkill: {
    label: 'code optimization refactor plan prompt skill',
    relativePath: path.join('src', 'core-skills', 'bmad-code-optimization-refactor-plan-prompt', 'SKILL.md'),
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
      'WorkflowBundle',
      'LoopRunConfig',
      'Direct operator goal wins',
      'Party Mode must not silently create a goal',
      'after resolving a valid goal source',
      'Party Mode never instantiates, mutates, or persists the Self-Improve goal',
      'does not define a separate engine or new authority layer',
      'BMM Phase 3 to Phase 4 planning gate',
      'Do not run Implementation Readiness for every Self-Improve loop',
      'skills/list',
      'forceReload: true',
    ],
    'bmad-self-improve skill',
    errors,
    files.skill.relativePath,
  );
  requireTerms(contents.skill, CONSENSUS_GATE_TERMS, 'bmad-self-improve skill consensus gate', errors, files.skill.relativePath);
  requireTerms(
    contents.customize,
    [
      'loop_skill = "bmad-loop"',
      'loop_slug = "self-improve"',
      'repo_path = "{project-root}"',
      'branch_prefix = "codex/self-improve-"',
      'checkpoint_subdir = "{output_folder}/self-improvement"',
      'runbook_ref = "docs/workspace/self-improvement-codex.md"',
      'prompt_template = "docs/workspace/templates/self-improvement-codex-prompt.md"',
      'resume_prompt_template = "docs/workspace/templates/self-improvement-codex-resume-prompt.md"',
      'checkpoint_template = "docs/workspace/templates/self-improvement-checkpoint.template.md"',
    ],
    'bmad-self-improve customize surface',
    errors,
    files.customize.relativePath,
  );
  requireNoTerms(
    contents.customize,
    [
      'goal_ref = ""',
      'scope = ""',
      'quality_command = "npm ci && npm run quality"',
      'max_iterations = 1',
      'daily_cap = 1',
      'max_fix_attempts = 5',
    ],
    'bmad-self-improve customize surface',
    errors,
    files.customize.relativePath,
    'SI_INSTANCE_DRIFT',
  );
  requireTerms(
    contents.guide,
    [
      'bmad-loop',
      'Migration Notes',
      LOOP_REFUSAL_MESSAGE,
      'Old baked self-improve goal selection is removed',
      'SI-AUTO-* invariant names remain compatibility aliases only',
      'WorkflowBundle',
      'LoopRunConfig',
      'inherits from `bmad-loop`',
      'does not define a separate engine or new authority layer',
      'BMM Phase 3 to Phase 4 planning gate',
      'Do not run Implementation Readiness for every Self-Improve loop',
    ],
    'self-improve runbook',
    errors,
    files.guide.relativePath,
  );
  requireTerms(
    contents.prompt,
    [
      LOOP_REFUSAL_MESSAGE,
      'WorkflowBundle id: self-improvement',
      'LoopRunConfig inheritance: unspecified fields resolve from `bmad-loop`',
      'Goal source:',
      'Capability Improvement Toolkit',
      'Party Mode consensus before plan finalization',
      'explicit direct goal, readable workflow.goal_ref, or non-empty workflow.scope',
      'Do not let Party Mode silently create a goal',
      'after input is resolved and repo facts have been gathered',
      'If no valid direct operator goal, readable workflow.goal_ref, or non-empty workflow.scope exists, stop with the refusal message before Party Mode.',
      'architecture-drift-review.template.md',
      'tool-leverage-review.template.md',
      'highest-leverage-official-mcp-addition.template.md',
      'capability-refactor-plan-prompt.template.md',
      'code-optimization-refactor-plan-prompt.template.md',
      'skill:bmad-architecture-drift-review',
      'skill:bmad-tool-leverage-review',
      'skill:bmad-highest-leverage-official-mcp-addition',
      'skill:bmad-capability-refactor-plan-prompt',
      'skill:bmad-code-optimization-refactor-plan-prompt',
      'npm run validate:bmad-loop-invariants',
    ],
    'self-improve prompt',
    errors,
    files.prompt.relativePath,
  );
  requireTerms(contents.prompt, CONSENSUS_GATE_TERMS, 'self-improve prompt consensus gate', errors, files.prompt.relativePath);
  requireTerms(
    contents.templateIndex,
    [
      'architecture-drift-review.template.md',
      'tool-leverage-review.template.md',
      'highest-leverage-official-mcp-addition.template.md',
      'capability-refactor-plan-prompt.template.md',
      'code-optimization-refactor-plan-prompt.template.md',
      'capability/refactor-plan/prompt/best-practice/tdd/forge',
      'optimization/refactor-plan/prompt/performance/measurement/tdd',
    ],
    'workspace template index',
    errors,
    files.templateIndex.relativePath,
  );
  requireTerms(
    contents.architectureDriftReview,
    [
      'Capability Improvement Toolkit',
      'Architecture Drift Review',
      'intended architecture docs',
      'allowed dependencies',
      'known exceptions',
      'changed files',
      'drift finding',
      'evidence',
      'impact',
      'fix path',
      'confidence',
      'proposed test/check',
      'does not perform static analysis',
      'does not enforce policy',
      'explicit user goal',
    ],
    'architecture drift review template',
    errors,
    files.architectureDriftReview.relativePath,
  );
  requireTerms(
    contents.toolLeverageReview,
    [
      'Capability Improvement Toolkit',
      'Tool Leverage Review',
      'user goal',
      'available BMAD skills',
      'repo scripts',
      'MCPs',
      'browser affordances',
      'automation',
      'use / skip / enhance',
      'OpenAI developer docs MCP',
      'OpenAI developer-product work',
    ],
    'tool leverage review template',
    errors,
    files.toolLeverageReview.relativePath,
  );
  requireTerms(
    contents.highestLeverageOfficialMcpAddition,
    [
      'Capability Improvement Toolkit',
      'highest-leverage-official-mcp-addition',
      'official MCP',
      'official source proof',
      'recurring use case',
      'leverage score',
      'security/auth boundary',
      'owner',
      'fallback',
      'approve / reject / defer',
      'higher leverage than existing scripts/docs/skills',
      'one-off lookups',
      'unofficial sources',
    ],
    'highest-leverage official MCP addition template',
    errors,
    files.highestLeverageOfficialMcpAddition.relativePath,
  );
  requireTerms(
    contents.capabilityRefactorPlan,
    [
      'Capability Improvement Toolkit',
      'Capability Refactor Plan Prompt',
      'Capability Pack Forge',
      'local evidence refs',
      'planning-only',
      'prompt',
      'no live tool calls',
      'does not edit files',
      'public behavior test first',
      'smallest green change',
      'refactor after green',
      'Recommended Follow-Up',
      'bmad-capability-pack-forge',
      'bmad-self-improve',
      'bmad-workspace',
      'bmad-check-implementation-readiness',
      'bmad-agent-dev',
      'bmad-customize',
      'approve / revise / block',
    ],
    'capability refactor plan template',
    errors,
    files.capabilityRefactorPlan.relativePath,
  );
  requireTerms(
    contents.codeOptimizationRefactorPlan,
    [
      'Capability Improvement Toolkit',
      'Code Optimization Refactor Plan Prompt',
      'planning-only',
      'prompt',
      'language-agnostic',
      'local evidence refs',
      'no live tool calls',
      'no live profiling',
      'does not edit files',
      'measurement before change',
      'public behavior preservation check',
      'smallest safe optimization',
      'readability, security, and operability',
      'approve / revise / block',
    ],
    'code optimization refactor plan prompt template',
    errors,
    files.codeOptimizationRefactorPlan.relativePath,
  );
  requireTerms(
    contents.architectureDriftReviewSkill,
    [
      'name: bmad-architecture-drift-review',
      'Architecture Drift Review',
      'Capability Improvement Toolkit',
      'intended architecture docs',
      'drift finding',
      'does not perform static analysis',
    ],
    'architecture drift review skill',
    errors,
    files.architectureDriftReviewSkill.relativePath,
  );
  requireTerms(
    contents.toolLeverageReviewSkill,
    [
      'name: bmad-tool-leverage-review',
      'Tool Leverage Review',
      'Capability Improvement Toolkit',
      'use / skip / enhance',
      'OpenAI developer docs MCP',
    ],
    'tool leverage review skill',
    errors,
    files.toolLeverageReviewSkill.relativePath,
  );
  requireTerms(
    contents.highestLeverageOfficialMcpAdditionSkill,
    [
      'name: bmad-highest-leverage-official-mcp-addition',
      'highest-leverage-official-mcp-addition',
      'Capability Improvement Toolkit',
      'official MCP',
      'approve / reject / defer',
    ],
    'highest-leverage official MCP addition skill',
    errors,
    files.highestLeverageOfficialMcpAdditionSkill.relativePath,
  );
  requireTerms(
    contents.capabilityRefactorPlanSkill,
    [
      'name: bmad-capability-refactor-plan-prompt',
      'Capability Refactor Plan Prompt',
      'Capability Improvement Toolkit',
      'Capability Pack Forge',
      'local evidence refs',
      'planning-only',
      'prompt',
      'no live tool calls',
      'does not edit files',
      'public behavior test first',
      'smallest green change',
      'refactor after green',
      'Recommended Follow-Up',
      'Manual next step:',
      'Evidence still needed:',
      'bmad-capability-pack-forge',
      'bmad-self-improve',
      'bmad-workspace',
      'bmad-check-implementation-readiness',
      'bmad-agent-dev',
      'bmad-customize',
      'approve / revise / block',
    ],
    'capability refactor plan skill',
    errors,
    files.capabilityRefactorPlanSkill.relativePath,
  );
  requireTerms(
    contents.codeOptimizationRefactorPlanSkill,
    [
      'name: bmad-code-optimization-refactor-plan-prompt',
      'Code Optimization Refactor Plan Prompt',
      'Capability Improvement Toolkit',
      'planning-only',
      'prompt',
      'language-agnostic',
      'local evidence refs',
      'no live tool calls',
      'no live profiling',
      'does not edit files',
      'measurement before change',
      'public behavior preservation check',
      'smallest safe optimization',
      'readability, security, and operability',
      'approve / revise / block',
    ],
    'code optimization refactor plan prompt skill',
    errors,
    files.codeOptimizationRefactorPlanSkill.relativePath,
  );
  requireTerms(
    contents.resume,
    [
      'Resume `bmad-self-improve`',
      'WorkflowBundle id: self-improvement',
      'LoopRunConfig inheritance: unspecified fields resolve from `bmad-loop`',
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
    [
      'Resolved Input',
      'Goal created by Party Mode: false',
      'State Machine',
      'npm run validate:bmad-loop-invariants',
      ...CONSENSUS_GATE_FIELDS,
    ],
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
    [
      'Core,bmad-self-improve,',
      'predefined bmad-loop instance',
      'goal_ref',
      'scope',
      'Core,bmad-capability-refactor-plan-prompt,',
      'Capability Refactor Plan Prompt,CBR',
      'Core,bmad-code-optimization-refactor-plan-prompt,',
      'Code Optimization Refactor Plan Prompt,OPT',
    ],
    'module-help.csv',
    errors,
    files.moduleHelp.relativePath,
  );
  validatePackageScripts(contents.packageJson, files.packageJson.relativePath, errors);

  for (const relativePath of [
    path.join('_bmad', 'custom', 'bmad-self-improve.toml'),
    path.join('_bmad', 'custom', 'bmad-self-improve.user.toml'),
  ]) {
    const filePath = path.join(projectRoot, relativePath);
    if (fs.existsSync(filePath)) {
      validateWorkflowOverrideKeys(
        fs.readFileSync(filePath, 'utf8'),
        LOOP_RUN_CONFIG_FIELDS,
        'bmad-self-improve override',
        relativePath,
        errors,
        'SI_OVERRIDE_FIELD',
      );
    }
  }

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
