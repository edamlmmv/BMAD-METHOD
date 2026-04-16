---
manifestFile: '{project-root}/bmad.config.yaml'
entrypointFile: '{project-root}/BMAD.md'
hermesContextFile: '{project-root}/.hermes.md'
repoRulesFile: '{project-root}/AGENTS.md'
projectContextFile: '{output_folder}/project-context.md'
sprintStatusFile: '{output_folder}/sprint-status.yaml'
handoffFile: '{output_folder}/openclaw-hermes/handoff.md'
---

# OpenClaw/Hermes Loop For Codex

**Goal:** Give Codex a first-class front door for the same manifest-first
Hermes/OpenClaw BMAD loop used by the Copilot workspace prompt.

**Important:** This skill is the Codex equivalent of
`/bmad-openclaw-hermes-loop`. It does not replace `bmad-discovery-rigor`.
Instead, it wraps the same operating model and starts with discovery rigor by
default unless the request is already a clearly bounded follow-on slice.

## Read Order

Load these surfaces first:

1. `{manifestFile}`
2. `{entrypointFile}`
3. `{hermesContextFile}`
4. `{repoRulesFile}`
5. `{projectContextFile}` if it exists
6. `{sprintStatusFile}` if it exists
7. `{handoffFile}` if it exists

## Required Behavior

1. Treat `{manifestFile}` as the canonical BMAD definition.
2. Start with discovery rigor unless the task is already obviously bounded and
   low-risk.
3. Keep Hermes in the chief-of-staff role:
   - planning
   - memory
   - synthesis
   - phase selection
4. Treat OpenClaw as a delegated worker only:
   - bounded execution
   - tool-heavy work
   - channel-heavy work
   - validation or research slices with explicit inputs and outputs
5. Use `{handoffFile}` as the durable Hermes to OpenClaw delegation surface.
6. Reconcile worker results back into `{projectContextFile}`,
   `{sprintStatusFile}`, or `{handoffFile}` before ending the turn.
7. Keep the workflow portable across Codex, Copilot, VS Code, local runtime,
   and VPS runtime by storing shared truth in tracked files and `_bmad-output/`.
8. Do not assume the live Hermes/OpenClaw runtime is healthy just because the
   repo artifacts exist. If machine-local runtime config is missing, stay
   repo-side and say so plainly.

## If Files Are Missing

Initialize the minimum local artifact set when needed:

- `{projectContextFile}`
- `{sprintStatusFile}`
- `{handoffFile}`

Keep them aligned to the manifest-first contract instead of inventing a new
shape.

## Presentation

When you finish a turn, present:

- current classification
- whether discovery rigor was used or intentionally skipped
- the next BMAD phase
- the recommended next skill if a clear handoff exists
- whether the work stayed repo-side or depended on a live Hermes/OpenClaw
  runtime
