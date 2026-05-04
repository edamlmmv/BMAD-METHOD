const { launchSession } = require('../../workspace/launch');
const { runRepoIntake } = require('../../workspace/intake');
const { buildWorkPacket } = require('../../workspace/packet');
const { runWorktreeReview } = require('../../workspace/review');
const { destroySession } = require('../../workspace/destroy');
const { authorizeDurableWrite } = require('../../workspace/grant-guard');
const { readSessionStatus } = require('../../workspace/status');

const WORKSPACE_HELP = `BMAD Workspace Session lifecycle.

Workspace subcommands:
  launch   create a disposable Workspace Session for selected repo paths
  intake   record Repo Intake evidence and target repo provenance
  packet   create a BMAD Work Packet from fresh intake and goal evidence
  status   inspect Workspace Session state without writing or fetching
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

    if (!['launch', 'intake', 'packet', 'status', 'review', 'destroy', 'authorize'].includes(workspaceCommand)) {
      process.stderr.write(`Workspace command not implemented: ${workspaceCommand}\n`);
      process.exit(1);
    }

    try {
      const result = runWorkspaceCommand(workspaceCommand, sessionId, options);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`Workspace ${workspaceCommand} failed: ${error.message}\n`);
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

  if (workspaceCommand === 'status') {
    return readSessionStatus({
      sessionId,
      runtimeRoot: options.runtimeRoot,
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
  });
}
