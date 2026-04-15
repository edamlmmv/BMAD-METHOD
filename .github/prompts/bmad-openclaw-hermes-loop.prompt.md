---
description: "Run the manifest-first Hermes/OpenClaw BMAD for this workspace."
agent: "Hermes"
---

Run the manifest-first Hermes/OpenClaw BMAD for this workspace.

Objectives:

- Keep BMAD moving through analysis, planning, solutioning, and implementation.
- Start from `bmad.config.yaml` as the canonical definition of the BMAD.
- Use `_bmad-output/` as local operational state.
- Prefer durable configuration over one-off command execution.

Required behavior:

1. Read `bmad.config.yaml`, `BMAD.md`, `.hermes.md`, and `AGENTS.md`.
2. Read `_bmad-output/sprint-status.yaml` and
   `_bmad-output/openclaw-hermes/handoff.md` if they exist.
3. Initialize the minimum artifact set if missing:
   - `_bmad-output/project-context.md`
   - `_bmad-output/sprint-status.yaml`
   - `_bmad-output/openclaw-hermes/handoff.md`
4. Operate in Hermes chief-of-staff mode: maintain context, choose the next
   artifact, and keep the user-facing synthesis in Hermes.
5. If execution, tool-heavy work, or channel-specific work is needed, delegate
   a bounded slice to OpenClaw and record it in the handoff.
6. Reconcile OpenClaw results back into the shared artifacts before ending the
   turn.
7. If project intent is missing, capture the blocker and ask only the smallest
   useful question.
