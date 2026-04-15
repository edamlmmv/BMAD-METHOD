---
applyTo: "**/_bmad-output/**"
---

Use `_bmad-output/` for durable BMAD state.

Rules:

- Treat `bmad.config.yaml` as the canonical BMAD definition and `_bmad-output/`
  as its local operational state.
- Preserve each artifact's purpose:
  - `project-context.md` stores conventions, stack facts, and environment rules.
  - `PRD.md` stores goals, scope, and requirements.
  - `architecture.md` stores technical decisions and interfaces.
  - `sprint-status.yaml` stores current phase, active work, and blockers.
  - `openclaw-hermes/handoff.md` stores the cross-agent contract.
- Update artifacts incrementally. Prefer refining relevant sections over
  replacing the whole file.
- Keep Markdown headings stable when they already exist.
- Keep YAML valid and human-readable.
- In `sprint-status.yaml`, preserve these keys when present:
  `phase`, `status`, `active_story`, `updated_at`, `blockers`, `next_action`,
  `handoff_file`.
- Reflect the Hermes-as-brain and OpenClaw-as-worker split consistently.
- When requirements are missing, document the blocker clearly instead of
  guessing.
- When execution work completes, record evidence and the exact next action in
  the handoff before changing phase.
