# Project Context

## Workspace Facts

- Project: `{{project_name}}`
- BMAD topology: Hermes as chief of staff, OpenClaw as delegated workers
- Local state folder: `{{output_folder}}`

## Operating Rules

- Read `bmad.config.yaml` and `BMAD.md` before changing BMAD surfaces.
- Follow `AGENTS.md` for repo-specific guardrails.
- Keep secrets and provider tokens out of tracked files.
- Prefer reusable configuration, prompts, and instructions over throwaway
  terminal sequences.

## Runtime Contract

- Hermes owns planning, memory, user-facing synthesis, and delegation.
- OpenClaw owns bounded execution, tool-heavy work, and worker sessions.
- Shared truth lives in `bmad.config.yaml` plus `{{output_folder}}/`.
