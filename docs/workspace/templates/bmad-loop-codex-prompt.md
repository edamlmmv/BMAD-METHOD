---
title: "BMAD Loop Codex Prompt"
description: Prompt template for a generic local BMAD loop run
---

# BMAD Loop Codex Prompt

Use this prompt for a generic local Codex/BMAD loop. Replace placeholders before
running.

```md
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-loop]({skill-root}/bmad-loop/SKILL.md)

You are Codex working in `{project-root}`.

Run a generic BMAD loop.

WorkflowBundle id: [bundle id]
WorkflowBundle purpose: [bundle purpose]
WorkflowBundle success criteria: [bundle success criteria]
Recommended BMAD route: [route from bmad-help]
Party Mode gate ref: docs/workspace/templates/loop-party-mode-gate.template.md
Run mode: one-shot|recurring
Mode: local Codex automation loop
Repo path: `{project-root}`
Base ref: current HEAD
Goal source: [direct goal, goal_ref, or scope]
Missing goal refusal: BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
Stop condition: checkpoint written or max caps reached
Automation schedule/config: read effective value from Codex automation metadata or operator-provided params; do not assume cadence from name or prompt text
max_iterations: 1
daily_cap: 1
max_fix_attempts: 5
quality_command: npm ci && npm run quality
Template contract: `prompt_template`, `resume_prompt_template`, and `checkpoint_template` are operator prompt/resume/checkpoint evidence only.
Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.
Use only when needed: `capability:zoom-out`, `capability:tdd`, `capability:ubiquitous-language`, `capability:grill-me`.

Capability Improvement Toolkit skills/templates are planning aids only; no runtime authority or implementation scope without an explicit user goal.
Skills: `skill:bmad-architecture-drift-review-prompt`, `skill:bmad-tool-leverage-review-prompt`, `skill:bmad-highest-leverage-official-mcp-addition-prompt`, `skill:bmad-capability-refactor-plan-prompt`, `skill:bmad-code-optimization-refactor-plan-prompt`.
Templates: `docs/workspace/templates/architecture-drift-review-prompt.template.md`, `docs/workspace/templates/tool-leverage-review-prompt.template.md`, `docs/workspace/templates/highest-leverage-official-mcp-addition-prompt.template.md`, `capability-refactor-plan-prompt.template.md`, `code-optimization-refactor-plan-prompt.template.md`.

Required policy: read `docs/workspace/bmad-loop-automation-policy.md`; capture base SHA/policy hash; resolve direct operator goal first, else readable workflow.goal_ref, else workflow.scope; lock `{output_folder}/loops/automation.lock`; never main/push; run `git status --porcelain --untracked-files=all`; scan dirty files; abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits if scan fails; use a fresh non-main branch.
Run `skill:bmad-party-mode` after input is resolved and repo facts have been gathered, before writing any final plan. If no valid direct operator goal, readable workflow.goal_ref, or non-empty workflow.scope exists, stop with the refusal message before Party Mode.
Write a decision-complete plan with acceptance criteria, TDD slices, and consensus fields: `participants`, `round_count`, `votes`, `decision`, `required_changes`, `deferred_decisions`, `blockers`, `operator_stop_go`, `next_action`, `evidence_refs`, and `final_replacement_plan_ref`.
`decision` must be `accept | change | block`. Do not include raw agent transcripts unless the user explicitly asks. A `change` decision requires a revised full replacement `<proposed_plan>` plus one verification round, not patch notes.
Run `skill:bmad-party-mode` again before implementation; implement with TDD; run quality on HEAD before commit/install/refresh/continuation; record Activation State, Resume Contract, Session Identity, checkpoint evidence, and continuation gates.

Task:

[PASTE LOOP GOAL HERE]
```
