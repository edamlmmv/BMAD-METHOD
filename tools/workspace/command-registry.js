const WORKSPACE_COMMANDS = Object.freeze([
  {
    name: 'launch',
    class: 'write',
    description: 'create a disposable Workspace Session for selected repo paths',
  },
  {
    name: 'intake',
    class: 'write',
    description: 'record Repo Intake evidence and target repo provenance',
  },
  {
    name: 'packet',
    class: 'write',
    description: 'create a BMAD Work Packet from fresh intake and goal evidence',
  },
  {
    name: 'list',
    class: 'read',
    description: 'inventory Workspace Sessions without writing or fetching',
  },
  {
    name: 'status',
    class: 'read',
    description: 'inspect Workspace Session state without writing or fetching',
  },
  {
    name: 'handoff',
    class: 'read',
    description: 'emit copy-ready Codex continuation context',
  },
  {
    name: 'evidence',
    class: 'read',
    description: 'emit read-only evidence index with artifact checksums and next actions',
  },
  {
    name: 'diff',
    class: 'read',
    description: 'compare two Workspace archive evidence bundles without writing',
  },
  {
    name: 'result',
    class: 'write',
    description: 'record a manual execution result artifact without executing commands',
  },
  {
    name: 'closeout',
    class: 'write',
    description: 'record a manual Session closeout artifact without executing commands',
  },
  {
    name: 'archive',
    class: 'write',
    description: 'create a portable Session evidence bundle',
  },
  {
    name: 'verify-archive',
    class: 'read',
    description: 'verify a portable Session archive without writing or fetching',
  },
  {
    name: 'review',
    class: 'write',
    description: 'emit Git worktree status and patch artifacts for review',
  },
  {
    name: 'destroy',
    class: 'destructive',
    description: 'remove disposable runtime state without deleting target repo changes',
  },
  {
    name: 'authorize',
    class: 'grant-gated',
    description: 'validate a durable write path against Workspace Session grants',
  },
]);

const WORKSPACE_OPTIONS = Object.freeze([
  {
    flags: '--repo <path>',
    description: 'Target Git repo path. Repeat for multiple repos.',
    repeatable: true,
    defaultValue: [],
  },
  {
    flags: '--goal <path>',
    description: 'Goal file path for Workspace Session launch.',
  },
  {
    flags: '--runtime-root <path>',
    description: 'Workspace Session runtime root. Defaults to OS temp storage.',
  },
  {
    flags: '--session-id <id>',
    description: 'Deterministic session id for tests and scripted runs.',
  },
  {
    flags: '--grant <path>',
    description: 'Base Mutation Grant file for Base Improvement Session launch.',
  },
  {
    flags: '--keep-review',
    description: 'Retain review artifacts after destroying runtime state.',
  },
  {
    flags: '--write-path <path>',
    description: 'Durable write path to validate through Grant Guard.',
  },
  {
    flags: '--base-improvement',
    description: 'Launch a Base Improvement Session; requires explicit Base Mutation Grant.',
  },
  {
    flags: '--output <path>',
    description: 'Output directory for Workspace archive.',
  },
  {
    flags: '--input <path>',
    description: 'Manual Workspace result JSON input.',
  },
  {
    flags: '--left <archive-dir>',
    description: 'Left Workspace archive directory for read-only diff.',
  },
  {
    flags: '--right <archive-dir>',
    description: 'Right Workspace archive directory for read-only diff.',
  },
  {
    flags: '--result-id <id>',
    description: 'Deterministic Workspace result id.',
  },
  {
    flags: '--closeout-id <id>',
    description: 'Deterministic Workspace closeout id.',
  },
  {
    flags: '--workflow <skill[:action]>',
    description: 'Explicit BMAD workflow route for Work Packet creation.',
  },
  {
    flags: '--zoom-out-ref <ref>',
    description: 'Setup Gate artifact ref for zoom-out.',
  },
  {
    flags: '--ubiquitous-language-ref <ref>',
    description: 'Setup Gate artifact ref for ubiquitous language.',
  },
  {
    flags: '--grill-decisions-ref <ref>',
    description: 'Setup Gate artifact ref for grill decisions.',
  },
  {
    flags: '--tdd-plan-ref <ref>',
    description: 'Setup Gate artifact ref for TDD plan.',
  },
  {
    flags: '--skip-setup <step=reason>',
    description: 'Explicitly skip a Setup Gate step with a reason. Repeatable.',
    repeatable: true,
    defaultValue: [],
  },
]);

const WORKSPACE_COMMAND_NAMES = Object.freeze(WORKSPACE_COMMANDS.map((command) => command.name));
const WORKSPACE_COMMAND_CLASSES = Object.freeze([...new Set(WORKSPACE_COMMANDS.map((command) => command.class))].sort());

function getWorkspaceCommand(commandName) {
  return WORKSPACE_COMMANDS.find((command) => command.name === commandName) || null;
}

function isWorkspaceCommand(commandName) {
  return Boolean(getWorkspaceCommand(commandName));
}

function renderWorkspaceHelp() {
  const commandNameWidth = Math.max(...WORKSPACE_COMMANDS.map((command) => command.name.length)) + 2;
  const commandClassWidth = Math.max(...WORKSPACE_COMMANDS.map((command) => command.class.length)) + 2;
  const commandLines = WORKSPACE_COMMANDS.map(
    (command) => `  ${command.name.padEnd(commandNameWidth)}${command.class.padEnd(commandClassWidth)}${command.description}`,
  );

  return `BMAD Workspace Session lifecycle.

Workspace subcommands:
${commandLines.join('\n')}

Command classes:
  read          inspect stored artifacts or archives without writing
  write         create explicit Workspace evidence or runtime artifacts
  destructive  remove disposable Workspace runtime state
  grant-gated  validate durable write authority before target mutation`;
}

module.exports = {
  WORKSPACE_COMMANDS,
  WORKSPACE_COMMAND_CLASSES,
  WORKSPACE_COMMAND_NAMES,
  WORKSPACE_OPTIONS,
  getWorkspaceCommand,
  isWorkspaceCommand,
  renderWorkspaceHelp,
};
