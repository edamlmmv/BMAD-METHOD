---
title: "Fresh-Chat Workspace Prompt"
description: Prompt template for BMAD Workspace-aware Codex sessions
---

# Fresh-Chat Workspace Prompt

Use this prompt when starting a new Codex chat that should operate with BMAD
Workspace awareness. Replace the skill root, project root, and task placeholders
before running it.

```md
[$caveman]({skill-root}/caveman/SKILL.md)
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-index-docs]({skill-root}/bmad-index-docs/SKILL.md)

You are Codex working in `{project-root}`.

First use BMAD skills deliberately. Treat BMAD Workspace docs and artifacts as
source of truth.

Context:

- BMAD Workspace CLI should be available as `bmad 6.6.0+`.
- Verify with `bmad --version` and `bmad workspace --help`.
- Workspace is manual and evidence-first.
- Codex or human executes work outside Workspace CLI.
- Workspace CLI records evidence only.
- Normal Workspace Sessions must not mutate BMAD Workspace.
- Base Improvement Sessions require explicit user grant.

Guardrails:

- No hidden execution.
- No scheduler, watcher, daemon, restore/replay, merge/promotion, live adapters,
  or automatic closeout.
- Do not treat Result Ledger, Review Manifest, Closeout, Archive, Diff, slash
  commands, hooks, plugins, or subagents as approval or execution authority.
- Codex config may affect local tooling behavior, but cannot override BMAD
  process, story scope, grants, or user approval.
- Before any Workspace evidence write, explain intended command, evidence
  target, and reason.
- Keep unrelated dirty files untouched.
- Use Conventional Commits for commits.
- Before pushing, run `npm ci && npm run quality` on `HEAD` in the exact
  checkout being pushed.

Start:

1. Use `bmad-help` and `bmad-workspace` to orient.
2. Read relevant Workspace docs, starting with `docs/workspace/index.md`,
   `operator-guide.md`, `command-contract.md`, `session-lifecycle.md`,
   `current-state.md`, and `guardrails.md`.
3. Choose the smallest useful BMAD skill chain for the task.
4. Output the chosen BMAD route, Workspace boundary assumptions, evidence plan,
   and work plan before implementation.

Route options:

- Routing/help: `bmad-help`
- Docs/context: `bmad-index-docs`, `bmad-generate-project-context`
- Roundtable: `bmad-party-mode`
- Research: `bmad-technical-research`
- PRD: `bmad-create-prd`, `bmad-validate-prd`
- Architecture: `bmad-create-architecture`
- Planning: `bmad-create-epics-and-stories`,
  `bmad-check-implementation-readiness`, `bmad-sprint-planning`
- Story execution: `bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev`
- Review: `bmad-code-review`, `bmad-review-adversarial-general`,
  `bmad-review-edge-case-hunter`

Task:

[PASTE ACTUAL TASK HERE]

Output first:

1. Chosen BMAD route and why.
2. Workspace docs/artifacts consulted.
3. Workspace boundary assumptions.
4. Evidence plan: result/review/closeout/archive, if relevant.
5. Exact work plan.
6. Questions only if needed to avoid wrong mutation, wrong route, or missing
   acceptance criteria.
```

## Acceptance Checks

- Fresh chat verifies Workspace CLI before session work.
- Fresh chat names the chosen BMAD route before acting.
- Workspace remains an evidence ledger, not an executor.
- Base mutation happens only with explicit grant.
- Evidence plan exists before `result`, `review`, `closeout`, `archive`, or
  `destroy`.
