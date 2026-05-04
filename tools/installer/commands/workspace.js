const { launchSession } = require('../../workspace/launch');
const { runRepoIntake } = require('../../workspace/intake');
const { buildWorkPacket } = require('../../workspace/packet');
const { runWorktreeReview } = require('../../workspace/review');
const { destroySession } = require('../../workspace/destroy');
const { authorizeDurableWrite } = require('../../workspace/grant-guard');
const { readSessionStatus } = require('../../workspace/status');
const { listSessions } = require('../../workspace/list');
const { renderSessionHandoff } = require('../../workspace/handoff');
const { archiveSession, verifyArchive } = require('../../workspace/archive');
const { recordSessionResult } = require('../../workspace/result');
const { recordSessionCloseout } = require('../../workspace/closeout');
const { readEvidenceIndex } = require('../../workspace/evidence');
const { nextManualActionForError } = require('../../workspace/next-action');

const WORKSPACE_HELP = `BMAD Workspace Session lifecycle.

Workspace subcommands:
  launch   create a disposable Workspace Session for selected repo paths
  intake   record Repo Intake evidence and target repo provenance
  packet   create a BMAD Work Packet from fresh intake and goal evidence
  list     inventory Workspace Sessions without writing or fetching
  status   inspect Workspace Session state without writing or fetching
  handoff  emit copy-ready Codex continuation context
  evidence emit read-only evidence index with artifact checksums and next actions
  result   record a manual execution result artifact without executing commands
  closeout record a manual Session closeout artifact without executing commands
  archive  create a portable Session evidence bundle
  verify-archive verify a portable Session archive without writing or fetching
  review   emit Git worktree status and patch artifacts for review
  destroy  remove disposable runtime state without deleting target repo changes
  authorize validate a durable write path against Workspace Session grants`;

function collect(value, previous) {
  return [...(previous || []), value];
}

function printHelp() {
  process.stdout.write(`${WORKSPACE_HELP}\n`);
}

module.exports = {
  command: 'workspace [workspaceCommand] [sessionId]',
  description: WORKSPACE_HELP,
  options: [
    ['--repo <path>', 'Target Git repo path. Repeat for multiple repos.', collect, []],
    ['--goal <path>', 'Goal file path for Workspace Session launch.'],
    ['--runtime-root <path>', 'Workspace Session runtime root. Defaults to OS temp storage.'],
    ['--session-id <id>', 'Deterministic session id for tests and scripted runs.'],
    ['--grant <path>', 'Base Mutation Grant file for Base Improvement Session launch.'],
    ['--keep-review', 'Retain review artifacts after destroying runtime state.'],
    ['--write-path <path>', 'Durable write path to validate through Grant Guard.'],
    ['--base-improvement', 'Launch a Base Improvement Session; requires explicit Base Mutation Grant.'],
    ['--output <path>', 'Output directory for Workspace archive.'],
    ['--input <path>', 'Manual Workspace result JSON input.'],
    ['--result-id <id>', 'Deterministic Workspace result id.'],
    ['--closeout-id <id>', 'Deterministic Workspace closeout id.'],
    ['--workflow <skill[:action]>', 'Explicit BMAD workflow route for Work Packet creation.'],
    ['--zoom-out-ref <ref>', 'Setup Gate artifact ref for zoom-out.'],
    ['--ubiquitous-language-ref <ref>', 'Setup Gate artifact ref for ubiquitous language.'],
    ['--grill-decisions-ref <ref>', 'Setup Gate artifact ref for grill decisions.'],
    ['--tdd-plan-ref <ref>', 'Setup Gate artifact ref for TDD plan.'],
    ['--skip-setup <step=reason>', 'Explicitly skip a Setup Gate step with a reason. Repeatable.', collect, []],
  ],
  action: (workspaceCommand, sessionId, options) => {
    if (!workspaceCommand) {
      printHelp();
      process.exit(0);
    }

    if (
      ![
        'launch',
        'intake',
        'packet',
        'list',
        'status',
        'handoff',
        'evidence',
        'result',
        'closeout',
        'archive',
        'verify-archive',
        'review',
        'destroy',
        'authorize',
      ].includes(workspaceCommand)
    ) {
      process.stderr.write(`Workspace command not implemented: ${workspaceCommand}\n`);
      process.exit(1);
    }

    try {
      const result = runWorkspaceCommand(workspaceCommand, sessionId, options);
      if (workspaceCommand === 'handoff') {
        process.stdout.write(`${result}\n`);
      } else {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      }
    } catch (error) {
      process.stderr.write(`Workspace ${workspaceCommand} failed: ${error.message}\n`);
      process.stderr.write(
        `Next manual action: ${nextManualActionForError(error.message, { sessionId, runtimeRoot: options.runtimeRoot })}\n`,
      );
      process.exit(1);
    }

    process.exit(0);
  },
};

function runWorkspaceCommand(workspaceCommand, sessionId, options) {
  if (workspaceCommand === 'launch') {
    return launchSession({
      repoPaths: options.repo,
      goalPath: options.goal,
      runtimeRoot: options.runtimeRoot,
      sessionId: options.sessionId,
      workspaceBasePath: process.cwd(),
      baseImprovement: options.baseImprovement,
      grantPath: options.grant,
    });
  }

  if (workspaceCommand === 'intake') {
    return runRepoIntake({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'review') {
    return runWorktreeReview({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'list') {
    return listSessions({
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'status') {
    return readSessionStatus({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'handoff') {
    return renderSessionHandoff({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'evidence') {
    return readEvidenceIndex({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'result') {
    return recordSessionResult({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      inputPath: options.input,
      resultId: options.resultId,
    });
  }

  if (workspaceCommand === 'closeout') {
    return recordSessionCloseout({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      inputPath: options.input,
      closeoutId: options.closeoutId,
    });
  }

  if (workspaceCommand === 'archive') {
    return archiveSession({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      outputPath: options.output,
    });
  }

  if (workspaceCommand === 'verify-archive') {
    return verifyArchive({
      archivePath: sessionId,
    });
  }

  if (workspaceCommand === 'destroy') {
    return destroySession({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      keepReview: options.keepReview,
    });
  }

  if (workspaceCommand === 'authorize') {
    return authorizeDurableWrite({
      sessionId,
      writePath: options.writePath,
      runtimeRoot: options.runtimeRoot,
    });
  }

  return buildWorkPacket({
    sessionId,
    runtimeRoot: options.runtimeRoot,
    setupRefs: {
      zoomOut: options.zoomOutRef,
      ubiquitousLanguage: options.ubiquitousLanguageRef,
      grillDecisions: options.grillDecisionsRef,
      tddPlan: options.tddPlanRef,
    },
    setupSkips: options.skipSetup,
    workflowOverride: options.workflow,
  });
}
