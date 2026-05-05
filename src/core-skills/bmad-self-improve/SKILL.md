---
name: bmad-self-improve
description: 'Run a Codex operator workflow for improving BMAD itself. Use when the user wants BMAD to self-improve through Party Mode planning, TDD implementation, validation, compile/install, and refresh evidence.'
---

# BMAD Self-Improve

## Purpose

`bmad-self-improve` is an operator-invoked BMAD skill, not Codex automation.
If no automation entry appears, missing automation is expected.

Run a manual, evidence-first improvement cycle for BMAD. Codex performs the
work, Party Mode supplies bounded decisions, and tests plus repo rules remain
hard gates.

This skill does not create or run scheduler, watcher, daemon, hidden executor,
live adapter, or auto-promotion loop. It runs only when the operator invokes it.
bmad-loop remains observe/coordination only; no execution authority.

## Inputs

- `repo_path` for the BMAD repository being improved.
- `branch` expected for the run.
- `scope` describing the narrow improvement boundary.
- `target_skill_or_files` listing the skill, docs, code, or templates allowed.
- `stop_condition` defining the finite endpoint, such as checkpoint written,
  max files, max attempts, operator review, or specific test result.
- Optional operator goal and question. If absent, Party Mode chooses the
  highest-value BMAD improvement target inside current repo rules and the
  declared scope.
- Current repo state, installed BMAD config, and Workspace guardrails.

## Run Modes

Recommended mode: manual operator-run.

Allowed alternate: foreground, operator-started, one-shot unassisted run with
fixed `repo_path`, `branch`, `scope`, `target_skill_or_files`, and
`stop_condition`. It ends at checkpoint and must not recur.

Rejected modes:

- Cron or recurring automation.
- Watcher or daemon.
- Hidden executor.
- Live adapter.
- Auto-promotion loop.
- Self-expanding scope.

## Outputs

- Initial Party Mode decision.
- Decision-complete plan with acceptance criteria.
- Party Mode critique and revised plan.
- TDD implementation evidence.
- Test results.
- compile/install evidence for generated BMAD skills.
- Codex refresh result.
- Checkpoint artifact under
  `{output_folder}/self-improvement/<YYYYMMDD-HHMM>-<slug>.md`.

## Stop Conditions

Stop and report when any condition appears:

- Required launch input is missing.
- stop condition is missing or not finite.
- Current branch does not match `branch`.
- Scope escape appears.
- Quality gate or targeted test fails and next fix is unclear.
- Change would be destructive, broad, or outside user intent.
- Party Mode decision conflicts with repo rules, safety, or tests.
- compile/install evidence is missing.
- Codex refresh status cannot be recorded.
- Unrelated dirty files would need to be modified.

## Required Sequence

1. Verify repo instructions, current git state, `bmad --version`, and
   `bmad workspace --help`.
2. Validate `repo_path`, `branch`, `scope`, `target_skill_or_files`, and
   `stop_condition`. Stop before implementation if any input is missing or the
   stop condition is not finite.
3. Run `skill:bmad-party-mode` before writing any plan. Ask it to choose the
   highest-value improvement target, likely files, risks, and tests.
4. Write a decision-complete plan. Include public behavior, acceptance criteria,
   TDD slices, compile/install steps, refresh probe, and checkpoint path.
5. Run `skill:bmad-party-mode` again before implementation. Ask it to critique
   the plan, reject weak assumptions, and revise decisions.
6. Revise the plan from Party Mode output. Treat Party Mode as bounded decision
   authority inside tests, repo rules, Workspace guardrails, and safety.
7. Implement with TDD, one vertical slice at a time, only inside the declared
   scope and target files.
8. Run targeted validation before broad checks.
9. compile/install updated BMAD skills with the existing installer.
10. Verify Codex refresh behavior.
11. Write final checkpoint and summarize evidence.

## TDD Rules

- Write one failing behavior test first.
- Make the smallest implementation change that passes it.
- Repeat for each acceptance criterion.
- Refactor only when tests are green.
- Prefer public behavior checks over implementation details.
- When automation boundaries are touched, validate forbidden modes stay
  rejected: cron, watcher, daemon, recurring automation, hidden executor, live
  adapter, and auto-promotion.
- Validate `bmad-loop` remains observe/coordination only; no execution
  authority.

## compile/install Rules

Use the existing installer. Do not add a new CLI command unless a test proves
the existing path cannot serve this workflow.

Fresh project-local Codex install:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes
```

Existing project-local Codex update:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes --action update
```

Expected artifacts:

- `{project-root}/_bmad/_config/manifest.yaml`
- `{project-root}/_bmad/_config/skill-manifest.csv`
- `{project-root}/.agents/skills/bmad-self-improve/SKILL.md`

Current user install refresh, when explicitly requested:

```bash
node tools/installer/bmad-cli.js install --directory /Users/edam --modules bmm --tools codex --yes --action update
```

`~/.codex/skills` global install remains out of scope for v1 because the Codex
`global_target_dir` is configured but not wired through the BMAD installer CLI.

## Codex Refresh Probe

Codex App Server documents `skills/list` with `forceReload: true` and
`skills/changed` notifications for watched local skill files. If app-server
access exists, request a forced reload for the current cwd and verify
`bmad-self-improve` appears.

If app-server access is unavailable, record:

- installed `SKILL.md` path
- manifest row
- source and installed SHA-256 hashes
- one of `refresh: requires new chat`, `refresh: requires Codex restart`, or
  `refresh: unknown`

Do not claim hot reload unless the run verifies it.

## Checkpoint Template

Write checkpoints under `{output_folder}/self-improvement/` using this shape:

```md
# BMAD Self-Improvement Checkpoint

- Objective:
- Question:
- Mode:
- Inputs:
  - repo_path:
  - branch:
  - scope:
  - target_skill_or_files:
  - stop_condition:
- Party Mode decision:
- Plan status:
- Critique result:
- Changed files:
- Tests run:
- Pass/fail output:
- compile/install evidence:
- Refresh evidence:
- Next operator decision:
- Risks:
```

## Completion

Complete only after:

- Revised plan is implemented or explicitly blocked.
- Relevant targeted tests are green or failure is recorded.
- `npm run validate:skills` is run when skills change.
- compile/install result is recorded when generated skills change.
- Refresh status is recorded.
- Final checkpoint exists.
