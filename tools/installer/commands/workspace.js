const { launchMission } = require('../../workspace-distro/launch');
const { runRepoIntake } = require('../../workspace-distro/intake');
const { buildMissionPacket } = require('../../workspace-distro/packet');
const { runWorktreeReview } = require('../../workspace-distro/review');
const { destroyMission } = require('../../workspace-distro/destroy');
const { authorizeDurableWrite } = require('../../workspace-distro/grant-guard');
const { resolveLaunchSessionId, withSessionAliases } = require('../../workspace-distro/session');

const WORKSPACE_HELP = `BMAD Workspace Distro Workspace Session lifecycle.

V2 session-compatible subcommands:
  launch   create a disposable Workspace Session for selected repo paths
  intake   record Repo Intake evidence and target repo provenance
  packet   create a BMAD Work Packet from fresh intake and goal evidence
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
  command: 'workspace [workspaceCommand] [missionId]',
  description: WORKSPACE_HELP,
  options: [
    ['--repo <path>', 'Target Git repo path. Repeat for multiple repos.', collect, []],
    ['--goal <path>', 'Goal file path for Workspace Session launch.'],
    ['--runtime-root <path>', 'Workspace Session runtime root. Defaults to OS temp storage.'],
    ['--session-id <id>', 'Deterministic session id for tests and scripted runs.'],
    ['--mission-id <id>', 'Legacy alias for --session-id.'],
    ['--grant <path>', 'Base Mutation Grant file for Base Improvement Session launch.'],
    ['--keep-review', 'Retain review artifacts after destroying runtime state.'],
    ['--write-path <path>', 'Durable write path to validate through Grant Guard.'],
    ['--base-improvement', 'Launch a Base Improvement Session; requires explicit Base Mutation Grant.'],
  ],
  action: (workspaceCommand, missionId, options) => {
    if (!workspaceCommand) {
      printHelp();
      process.exit(0);
    }

    if (!['launch', 'intake', 'packet', 'review', 'destroy', 'authorize'].includes(workspaceCommand)) {
      process.stderr.write(`Workspace command not implemented in V1 yet: ${workspaceCommand}\n`);
      process.exit(1);
    }

    try {
      const result = runWorkspaceCommand(workspaceCommand, missionId, options);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`Workspace ${workspaceCommand} failed: ${error.message}\n`);
      process.exit(1);
    }

    process.exit(0);
  },
};

function runWorkspaceCommand(workspaceCommand, missionId, options) {
  if (workspaceCommand === 'launch') {
    return withSessionAliases(
      launchMission({
        repoPaths: options.repo,
        goalPath: options.goal,
        runtimeRoot: options.runtimeRoot,
        missionId: resolveLaunchSessionId({
          missionId: options.missionId,
          sessionId: options.sessionId,
        }),
        workspaceDistroPath: process.cwd(),
        baseImprovement: options.baseImprovement,
        grantPath: options.grant,
      }),
    );
  }

  if (workspaceCommand === 'intake') {
    return withSessionAliases(
      runRepoIntake({
        missionId,
        runtimeRoot: options.runtimeRoot,
      }),
    );
  }

  if (workspaceCommand === 'review') {
    return withSessionAliases(
      runWorktreeReview({
        missionId,
        runtimeRoot: options.runtimeRoot,
      }),
    );
  }

  if (workspaceCommand === 'destroy') {
    return withSessionAliases(
      destroyMission({
        missionId,
        runtimeRoot: options.runtimeRoot,
        keepReview: options.keepReview,
      }),
    );
  }

  if (workspaceCommand === 'authorize') {
    return withSessionAliases(
      authorizeDurableWrite({
        missionId,
        writePath: options.writePath,
        runtimeRoot: options.runtimeRoot,
      }),
    );
  }

  return withSessionAliases(
    buildMissionPacket({
      missionId,
      runtimeRoot: options.runtimeRoot,
    }),
  );
}
