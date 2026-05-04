const WORKSPACE_HELP = `BMAD Workspace Distro mission lifecycle.

V1 subcommands:
  launch   create a disposable Mission Workspace for selected repo paths
  intake   record Repo Intake evidence and target repo provenance
  packet   create a BMAD Mission Packet from fresh intake and goal evidence
  review   emit Git worktree status and patch artifacts for review
  destroy  remove disposable runtime state without deleting target repo changes`;

module.exports = {
  command: 'workspace',
  description: WORKSPACE_HELP,
  options: [],
  action: () => {
    process.stdout.write(`${WORKSPACE_HELP}\n`);
    process.exit(0);
  },
};
