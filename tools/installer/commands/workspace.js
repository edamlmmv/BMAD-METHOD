const { launchMission } = require('../../workspace-distro/launch');
const { runRepoIntake } = require('../../workspace-distro/intake');
const { buildMissionPacket } = require('../../workspace-distro/packet');

const WORKSPACE_HELP = `BMAD Workspace Distro mission lifecycle.

V1 subcommands:
  launch   create a disposable Mission Workspace for selected repo paths
  intake   record Repo Intake evidence and target repo provenance
  packet   create a BMAD Mission Packet from fresh intake and goal evidence
  review   emit Git worktree status and patch artifacts for review
  destroy  remove disposable runtime state without deleting target repo changes`;

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
    ['--goal <path>', 'Goal file path for Mission Workspace launch.'],
    ['--runtime-root <path>', 'Mission runtime root. Defaults to OS temp storage.'],
    ['--mission-id <id>', 'Deterministic mission id for tests and scripted runs.'],
  ],
  action: (workspaceCommand, missionId, options) => {
    if (!workspaceCommand) {
      printHelp();
      process.exit(0);
    }

    if (!['launch', 'intake', 'packet'].includes(workspaceCommand)) {
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
    return launchMission({
      repoPaths: options.repo,
      goalPath: options.goal,
      runtimeRoot: options.runtimeRoot,
      missionId: options.missionId,
      workspaceDistroPath: process.cwd(),
    });
  }

  if (workspaceCommand === 'intake') {
    return runRepoIntake({
      missionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  return buildMissionPacket({
    missionId,
    runtimeRoot: options.runtimeRoot,
  });
}
