## OpenClaw/Hermes BMAD

This workspace uses a manifest-first BMAD defined by `bmad.config.yaml`.

### First Read

- Read `bmad.config.yaml` before modifying any BMAD surface.
- Use `BMAD.md` as the human entrypoint for the setup.
- Use `.hermes.md` and `AGENTS.md` as execution context for Hermes-style work.

### Canonical Model

- The BMAD itself is the manifest plus its tracked entrypoint files.
- `_bmad-output/` is local operational state for the current workspace.
- If an artifact is missing, create the smallest useful version instead of
  blocking.

### Roles

- Hermes is the chief-of-staff brain: user-facing coordination, memory,
  planning, and delegation.
- OpenClaw is the delegated worker layer: bounded execution, tool-heavy tasks,
  channels, and isolated sessions through the Gateway.
- Shared artifacts and explicit handoffs are preferred over implicit chat state.

### Working Style

- Prefer durable configuration, prompts, skills, context files, docs, and tasks
  over ad hoc terminal commands.
- Do not invent product decisions when requirements are missing. Capture the
  blocker in the handoff and ask one focused question.
- Reconcile every execution result back into `_bmad-output/` before changing
  phase.

### Handoff Contract

When updating `_bmad-output/openclaw-hermes/handoff.md`, keep these sections:

- Objective
- Current Phase
- Required Inputs
- Requested Output
- Constraints
- Definition of Done
- Evidence / Changes
- Validation Results
- Remaining Risks
- Next Action
