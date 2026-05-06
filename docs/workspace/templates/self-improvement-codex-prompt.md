---
title: "Self-Improvement Codex Prompt"
description: Prompt template for BMAD self-improvement as a bmad-loop instance
---

# Self-Improvement Codex Prompt

Use this prompt to improve BMAD-METHOD itself from Codex. Replace placeholders
before running.

```md
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-loop]({skill-root}/bmad-loop/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Run `bmad-self-improve` as a predefined `bmad-loop` instance.

WorkflowBundle id: self-improvement
LoopRunConfig inheritance: unspecified fields resolve from `bmad-loop`
Mode: local Codex automation loop
Repo path: `{project-root}`
Base ref: current HEAD
Goal source: [direct goal, goal_ref, or scope]
Missing goal refusal: BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
Stop condition: checkpoint written or max caps reached
Automation schedule/config: read effective value from Codex automation metadata or operator-provided params; do not assume cadence from name or prompt text
max_iterations: 1
daily_cap: 1
starter automation override, when explicitly configured:
max_iterations: 3
daily_cap: 3
max_fix_attempts: 5
quality_command: npm ci && npm run quality

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Use these capabilities only when the instantiated goal needs them:
- `capability:zoom-out` `zoom-out`
- `capability:tdd` `tdd`
- `capability:ubiquitous-language` `ubiquitous-language`
- `capability:grill-me` `grill-me`

Required policy:
- Read `docs/workspace/bmad-loop-automation-policy.md`.
- Resolve direct operator goal first; else readable workflow.goal_ref; else workflow.scope; else stop with the BMAD loop refusal message.
- Do not let Party Mode silently create a goal.
- Capture base SHA, resolved self-improve instance fields, and baseline policy hash before edits.
- Read effective automation schedule/config, explicit operator parameters, and latest checkpoint.
- Acquire `{output_folder}/self-improvement/automation.lock`; stale lock needs checkpointed failure evidence before continuation.
- Never run implementation work on main. Never push.
- Before branch creation, run `git status --porcelain --untracked-files=all`.
- If the worktree is dirty, scan pending files for high-confidence secrets and huge generated artifacts before preservation.
- If the scan fails, abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.
- If the scan passes, preserve non-ignored dirty state with local commit `chore: preserve pre-automation worktree state`.
- Create or switch to the fresh branch matching `codex/self-improve-*`.
- Run `skill:bmad-party-mode` before writing any plan.
- Write a decision-complete plan with acceptance criteria and TDD slices.
- Run `skill:bmad-party-mode` again before implementation.
- Implement with TDD, one vertical slice at a time.
- Run `npm ci && npm run quality` on HEAD of the exact checkout before commit, install, refresh, or continuation.
- Run `npm run validate:bmad-loop-invariants` when generic loop surfaces change.
- Run `npm run validate:self-improve-invariants` when self-improve instance surfaces or SI aliases change.
- Install repo-local/test target first, then user target when policy allows.
- Actively request Codex skill reload when active skills change. `skills/list` with `forceReload: true`, `skills/changed`, and thread start/resume are launcher evidence only, never BMAD authority.
- Record Activation State, Resume Contract, and Session Identity.
- Commit passing work locally with Conventional Commits. Never push.
- Write checkpoint evidence under `{output_folder}/self-improvement/`.
- Allow continuation only after all Activation State gates pass and caps allow it.
- `refresh_state: unknown never allows continuation`.
- Vercel Workflow WDK is not part of this run.
- Evidence Gate v1 language is future-compatible with Workspace packet v5. Self-Improve does not actively enforce Evidence Gate v1 in v1 and does not mark gates pass/fail.

Task:

[PASTE EXPLICIT BMAD SELF-IMPROVEMENT GOAL HERE]
```
