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

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema. Use only as needed: `capability:zoom-out`, `capability:tdd`, `capability:ubiquitous-language`, `capability:grill-me`.
Capability Improvement Toolkit templates are planning aids only: no runtime authority or implementation scope without an explicit direct goal, readable workflow.goal_ref, or non-empty workflow.scope.
Templates: `docs/workspace/templates/architecture-drift-review-prompt.template.md`, `docs/workspace/templates/tool-leverage-review-prompt.template.md`, `docs/workspace/templates/highest-leverage-official-mcp-addition-prompt.template.md`, `capability-refactor-plan-prompt.template.md`, `code-optimization-refactor-plan-prompt.template.md`.
Skills: `skill:bmad-architecture-drift-review-prompt`, `skill:bmad-tool-leverage-review-prompt`, `skill:bmad-highest-leverage-official-mcp-addition-prompt`, `skill:bmad-capability-refactor-plan-prompt`, `skill:bmad-code-optimization-refactor-plan-prompt`.
For tool-relevant goals only, include a Tool-Leverage Decision Record in the final plan or checkpoint using `tool-leverage-review-prompt`; `underused` never auto-invokes or recommends an official MCP-addition prompt.

Required policy: read `docs/workspace/bmad-loop-automation-policy.md`; resolve direct operator goal first, else readable workflow.goal_ref, else workflow.scope; Do not let Party Mode silently create a goal; capture base SHA/policy hash; lock `{output_folder}/self-improvement/automation.lock`; never main/push; run `git status --porcelain --untracked-files=all`; scan dirty files; abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits if scan fails; preserve passing dirty state; use branch `codex/self-improve-*`.
Run `skill:bmad-party-mode` after input is resolved and repo facts have been gathered to reach Party Mode consensus before plan finalization. Record accept/change/block consensus in the plan evidence. If no valid direct operator goal, readable workflow.goal_ref, or non-empty workflow.scope exists, stop with the refusal message before Party Mode.
Record consensus fields: `participants`, `round_count`, `votes`, `decision`, `required_changes`, `deferred_decisions`, `blockers`, `operator_stop_go`, `next_action`, `evidence_refs`, and `final_replacement_plan_ref`.
`decision` must be `accept | change | block`. Do not include raw agent transcripts unless the user explicitly asks. A `change` decision requires a revised full replacement `<proposed_plan>` plus one verification round, not patch notes.
Run `skill:bmad-party-mode` before any final plan, using Capability Improvement Toolkit templates when relevant; critique again before implementation; use TDD. Run `npm ci && npm run quality` on HEAD before commit/install/refresh/continuation. Run `npm run validate:bmad-loop-invariants` and `npm run validate:self-improve-invariants` for matching changes. Record Activation State, Resume Contract, Session Identity, checkpoint, and refresh state. `refresh_state: unknown never allows continuation`. Vercel Workflow WDK is not part of this run. Evidence Gate v1 language is future-compatible with Workspace packet v5.

Task:

[PASTE EXPLICIT BMAD SELF-IMPROVEMENT GOAL HERE]
```
