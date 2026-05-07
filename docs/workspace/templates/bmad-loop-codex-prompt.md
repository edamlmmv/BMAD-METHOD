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
Template contract:
- `prompt_template` = operator prompt only
- `resume_prompt_template` = continuation prompt only
- `checkpoint_template` = checkpoint evidence only
Slash hooks such as `/workflow-start`, `/loop-start`, `/loop-resume`, and `/loop-plan` are operator-assist only and are not part of this run.

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Use these capabilities only when the instantiated goal needs them:
- `capability:zoom-out` `zoom-out`
- `capability:tdd` `tdd`
- `capability:ubiquitous-language` `ubiquitous-language`
- `capability:grill-me` `grill-me`

Capability Improvement Toolkit skills and matching templates are planning aids
only. Party Mode may debate which one to use for the instantiated goal. They do
not grant runtime authority, install tools, mutate MCP config, perform static
analysis, or create implementation scope without an explicit user goal.

Available Capability Improvement Toolkit skills:
- `skill:bmad-architecture-drift-review`
- `skill:bmad-tool-leverage-review`
- `skill:bmad-highest-leverage-official-mcp-addition`

Matching template refs:
- `docs/workspace/templates/architecture-drift-review.template.md`
- `docs/workspace/templates/tool-leverage-review.template.md`
- `docs/workspace/templates/highest-leverage-official-mcp-addition.template.md`

Required policy:
- Read `docs/workspace/bmad-loop-automation-policy.md`.
- Capture base SHA and baseline policy hash before edits.
- Resolve direct operator goal first; else readable workflow.goal_ref; else workflow.scope; else stop with the BMAD loop refusal message.
- Read effective automation schedule/config, explicit operator parameters, and latest checkpoint.
- Acquire `{output_folder}/loops/automation.lock`; stale lock needs checkpointed failure evidence before continuation.
- Never run implementation work on main. Never push.
- Before branch creation, run `git status --porcelain --untracked-files=all`.
- If dirty, scan pending files for high-confidence secrets and huge generated artifacts before preservation.
- If the scan fails, abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.
- Use a fresh non-main branch matching the resolved branch prefix.
- Run `skill:bmad-party-mode` before writing any plan.
- Write a decision-complete plan with acceptance criteria and TDD slices.
- Record Party Mode gate output: goal, success metric, chosen run mode, recommended BMAD route, main risks, required evidence, open questions, and deferred questions.
- Run `skill:bmad-party-mode` again before implementation.
- Implement with TDD, one vertical slice at a time.
- Run the configured quality command on HEAD of the exact checkout before commit, install, refresh, or continuation.
- Record Activation State, Resume Contract, and Session Identity.
- Commit passing work locally with Conventional Commits. Never push.
- Write checkpoint evidence under the resolved checkpoint subdir.
- Allow continuation only after all Activation State gates pass and caps allow it.

Task:

[PASTE LOOP GOAL HERE]
```
