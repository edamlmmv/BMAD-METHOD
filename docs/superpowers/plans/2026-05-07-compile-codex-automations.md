---
title: "Compile Codex Automations Implementation Plan"
description: Plan for making BMAD loop and self-improve automations visible in Codex without bypassing BMAD safety gates
---

# Compile Codex Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BMAD loop and self-improve automations visible in Codex without bypassing BMAD loop safety gates or hand-writing Codex automation state.

**Architecture:** Codex automation visibility comes from the Codex app automation API, not from repository source files. This plan creates paused project-scoped Codex automations with prompts that invoke the installed BMAD skills and preserve the `bmad-loop` requirement that every real run has a direct operator goal, readable `workflow.goal_ref`, or non-empty `workflow.scope`. BMAD repository files remain authority for loop policy, prompts, validators, and evidence.

**Tech Stack:** Codex Desktop automations, `codex_app.automation_update`, BMAD Core skills, Node.js validators, npm quality gate, Git worktrees.

---

## BMAD Route

Use these BMADs in this order:

- `[BH]` **BMad Help** — `bmad-help`
  Route this as a Core anytime automation setup. Relevant rows are `bmad-loop`, `bmad-self-improve`, `bmad-workspace`, and `bmad-help`.
- `[WS]` **BMAD Workspace** — `bmad-workspace`
  Verify Codex-visible CLI state and keep Codex config/app affordances separate from BMAD authority.
- `[BL]` **BMAD Loop** — `bmad-loop`
  Generic automation contract. Any real loop run needs explicit goal input, finite stop condition, quality command, branch safety, lock, checkpoint, install/refresh evidence, and no push.
- `[SI]` **Self Improve** — `bmad-self-improve`
  Thin BMAD repo instance of `bmad-loop`, inheriting generic unresolved fields and preserving `SI-AUTO-*` aliases.
- `[PM]` **Party Mode** — `bmad-party-mode`
  Required by loop policy before a real implementation plan and again before implementation. The compiled Codex automation prompts must require Party Mode for actual loop work.

Shared planning capabilities stay operator-invoked only:

- `capability:zoom-out` `zoom-out`
- `capability:tdd` `tdd`
- `capability:ubiquitous-language` `ubiquitous-language`
- `capability:grill-me` `grill-me`

## Source Facts Already Verified

- `bmad --version` returned `6.6.0`.
- `bmad workspace --help` exposed Workspace commands including `launch`, `intake`, `packet`, `list`, `status`, `handoff`, `evidence`, `verify-capability`, `diff`, `result`, `closeout`, `archive`, `verify-archive`, `review`, `destroy`, and `authorize`.
- `/Users/edam/.codex/automations` exists but has no `automation.toml` files.
- Current BMAD checkout is dirty before this plan. Implementation must not treat pre-existing dirty files as automation-created work.
- `/Users/edam/.codex/config.toml` has the BMAD project trusted and has `features.goals`, `features.multi_agent`, and `features.codex_hooks` enabled.
- OpenAI Codex docs say project automations can combine with skills, can run in worktrees, and need the app running with the project available on disk.

## File Structure

No repository source file is required for the first visibility compile. Codex automation state must be created through `codex_app.automation_update`; do not hand-write files under `/Users/edam/.codex/automations`.

Files that may be touched only if activation goals are needed later:

- Create: `/Users/edam/Documents/TODA/BMAD-METHOD/_bmad-output/automation-goals/bmad-loop-goal.md`
  Purpose: optional operator-authored goal source for a real generic `bmad-loop` run.
- Create: `/Users/edam/Documents/TODA/BMAD-METHOD/_bmad-output/self-improvement/current-goal.md`
  Purpose: optional operator-authored goal source for a real `bmad-self-improve` run.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/bmad-loop-automation-policy.md`
  Purpose: loop invariants source of truth.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/self-improvement-codex.md`
  Purpose: self-improve instance runbook.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/templates/bmad-loop-codex-prompt.md`
  Purpose: generic loop prompt source.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/templates/self-improvement-codex-prompt.md`
  Purpose: self-improve prompt source.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/test/test-bmad-loop-invariants.js`
  Purpose: generic loop invariant regression surface.
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/test/test-self-improve-invariants.js`
  Purpose: self-improve invariant regression surface.

## Automation Definitions

Create two paused project automations. Paused status makes them visible in Codex without starting background repo mutations before the operator supplies concrete goals.

### Automation 1: BMAD Loop Runner

Codex automation fields:

- Name: `BMAD Loop Runner`
- Kind: project-scoped recurring automation
- Project cwd: `/Users/edam/Documents/TODA/BMAD-METHOD`
- Execution environment: worktree
- Model: `gpt-5.5`
- Reasoning effort: high
- Status: paused
- Cadence: daily at 09:00 America/Toronto

Prompt:

```md
[$bmad-help](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-help/SKILL.md)
[$bmad-workspace](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-workspace/SKILL.md)
[$bmad-party-mode](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-party-mode/SKILL.md)
[$bmad-loop](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-loop/SKILL.md)

You are Codex working in `/Users/edam/Documents/TODA/BMAD-METHOD`.

Run `bmad-loop` only if a direct operator goal is supplied in this automation prompt, a readable workflow goal file exists at `_bmad-output/automation-goals/bmad-loop-goal.md`, or a non-empty workflow scope is supplied in this automation prompt.

If no valid goal source exists, stop before mutation and report exactly:

BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.

Resolved loop config:
- WorkflowBundle id: bmad-loop-runner
- WorkflowBundle purpose: generic local BMAD automation loop runner
- Recommended BMAD route: bmad-help -> bmad-workspace -> bmad-party-mode -> bmad-loop
- Run mode: recurring project automation, worktree execution
- Repo path: `/Users/edam/Documents/TODA/BMAD-METHOD`
- Base ref: current HEAD
- Goal source precedence: direct operator goal first, then `_bmad-output/automation-goals/bmad-loop-goal.md`, then workflow.scope
- Stop condition: checkpoint written or max caps reached
- max_iterations: 1
- daily_cap: 1
- max_fix_attempts: 5
- quality_command: npm ci && npm run quality

Required policy:
- Read `docs/workspace/bmad-loop-automation-policy.md`.
- Capture base SHA and baseline policy hash before edits.
- Read effective automation schedule/config and latest checkpoint.
- Acquire `{output_folder}/loops/automation.lock`; stale lock needs checkpointed failure evidence before continuation.
- Never run implementation work on main. Never push.
- Before branch creation, run `git status --porcelain --untracked-files=all`.
- If dirty, scan pending files for high-confidence secrets and huge generated artifacts before preservation.
- Use a fresh non-main branch matching the resolved branch prefix.
- Run `skill:bmad-party-mode` before writing any plan.
- Write a decision-complete plan with acceptance criteria, TDD slices, compile/install steps, refresh probe, checkpoint path, and continuation preconditions.
- Run `skill:bmad-party-mode` again before implementation.
- Implement with TDD, one vertical slice at a time.
- Run targeted validation after each slice.
- Run `npm ci && npm run quality` on HEAD of the exact checkout before commit, install, refresh, or continuation.
- Record Activation State, Resume Contract, Session Identity, local commits, dirty worktree impact, residual risk, and exact next operator decision.
- Commit passing work locally with Conventional Commits. Never push.
- Write checkpoint evidence under the resolved checkpoint subdir.
- Allow continuation only after all Activation State gates pass and caps allow it.
```

### Automation 2: BMAD Self-Improve Runner

Codex automation fields:

- Name: `BMAD Self-Improve Runner`
- Kind: project-scoped recurring automation
- Project cwd: `/Users/edam/Documents/TODA/BMAD-METHOD`
- Execution environment: worktree
- Model: `gpt-5.5`
- Reasoning effort: high
- Status: paused
- Cadence: daily at 09:30 America/Toronto

Prompt:

```md
[$bmad-help](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-help/SKILL.md)
[$bmad-workspace](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-workspace/SKILL.md)
[$bmad-party-mode](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-party-mode/SKILL.md)
[$bmad-loop](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-loop/SKILL.md)
[$bmad-self-improve](/Users/edam/Documents/TODA/BMAD-METHOD/.agents/skills/bmad-self-improve/SKILL.md)

You are Codex working in `/Users/edam/Documents/TODA/BMAD-METHOD`.

Run `bmad-self-improve` as the BMAD repository instance of `bmad-loop` only if a direct operator goal is supplied in this automation prompt, a readable workflow goal file exists at `_bmad-output/self-improvement/current-goal.md`, or a non-empty workflow scope is supplied in this automation prompt.

If no valid goal source exists, stop before mutation and report exactly:

BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.

Resolved self-improve config:
- WorkflowBundle id: self-improvement
- LoopRunConfig inheritance: unspecified fields resolve from `bmad-loop`
- Recommended BMAD route: bmad-help -> bmad-workspace -> bmad-party-mode -> bmad-loop -> bmad-self-improve
- Run mode: recurring project automation, worktree execution
- Repo path: `/Users/edam/Documents/TODA/BMAD-METHOD`
- Base ref: current HEAD
- Goal source precedence: direct operator goal first, then `_bmad-output/self-improvement/current-goal.md`, then workflow.scope
- Stop condition: checkpoint written or max caps reached
- max_iterations: 1
- daily_cap: 1
- max_fix_attempts: 5
- quality_command: npm ci && npm run quality

Required policy:
- Read `docs/workspace/bmad-loop-automation-policy.md` and `docs/workspace/self-improvement-codex.md`.
- Resolve self-improve workflow customization before planning or implementation.
- Do not let Party Mode silently create a goal.
- Capture base SHA, resolved self-improve instance fields, and baseline policy hash before edits.
- Read effective automation schedule/config, explicit operator parameters, and latest checkpoint.
- Acquire `{output_folder}/self-improvement/automation.lock`; stale lock needs checkpointed failure evidence before continuation.
- Never run implementation work on main. Never push.
- Before branch creation, run `git status --porcelain --untracked-files=all`.
- If dirty, scan pending files for high-confidence secrets and huge generated artifacts before preservation.
- If scan passes and preservation is required, preserve non-ignored dirty state with local commit `chore: preserve pre-automation worktree state`.
- Create or switch to a fresh non-main branch matching `codex/self-improve-*`.
- Run `skill:bmad-party-mode` before writing any plan.
- Write a decision-complete plan with acceptance criteria, TDD slices, compile/install steps, refresh probe, checkpoint path, and continuation preconditions.
- Run `skill:bmad-party-mode` again before implementation.
- Implement with TDD, one vertical slice at a time.
- Run targeted validation after each slice.
- Run `npm ci && npm run quality` on HEAD of the exact checkout before commit, install, refresh, or continuation.
- Run `npm run validate:bmad-loop-invariants` when generic loop policy, generic loop docs, or `bmad-loop` changes.
- Run `npm run validate:self-improve-invariants` when self-improve instance docs, alias mapping, policy, or `bmad-self-improve` changes.
- Install repo-local/test target first, then user target when policy allows.
- Verify Codex refresh behavior when active skills change.
- Record Activation State, Resume Contract, Session Identity, local commits, warning/LOW disposition, dirty worktree impact, residual risk, and exact next operator decision.
- Commit passing work locally with Conventional Commits. Never push.
- Write checkpoint evidence under `{output_folder}/self-improvement/`.
- Allow continuation only after all Activation State gates pass and caps allow it.
```

## Tasks

### Task 1: Preflight Current Codex And BMAD State

**Files:**
- Read: `/Users/edam/.codex/config.toml`
- Read: `/Users/edam/.codex/automations`
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/_bmad/_config/bmad-help.csv`
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/bmad-loop-automation-policy.md`
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/self-improvement-codex.md`

- [ ] **Step 1: Verify BMAD CLI**

Run:

```bash
bmad --version
```

Expected:

```text
6.6.0
```

- [ ] **Step 2: Verify Workspace CLI surface**

Run:

```bash
bmad workspace --help
```

Expected: output includes `launch`, `intake`, `packet`, `list`, `status`, `handoff`, `evidence`, `verify-capability`, `diff`, `result`, `closeout`, `archive`, `verify-archive`, `review`, `destroy`, and `authorize`.

- [ ] **Step 3: Record existing dirty worktree**

Run:

```bash
git status --porcelain --untracked-files=all
```

Expected: output may include pre-existing dirty files. Do not stage, revert, or preserve them during this compile-only task.

- [ ] **Step 4: Verify no visible Codex automation files currently exist**

Run:

```bash
find /Users/edam/.codex/automations -maxdepth 3 -type f -name 'automation.toml' -print
```

Expected:

```text
```

- [ ] **Step 5: Verify Codex project trust and affordance context**

Run:

```bash
sed -n '1,180p' /Users/edam/.codex/config.toml
```

Expected: output includes:

```toml
[features]
codex_hooks = true
multi_agent = true
goals = true

[projects."/Users/edam/Documents/TODA/BMAD-METHOD"]
trust_level = "trusted"
```

- [ ] **Step 6: Confirm BMAD Help route**

Run:

```bash
sed -n '35,42p' _bmad/_config/bmad-help.csv
```

Expected: output includes Core rows for `bmad-loop`, `bmad-self-improve`, `bmad-help`, and `bmad-workspace`.

### Task 2: Create Paused BMAD Loop Runner In Codex

**Files:**
- Do not create or modify repository source files.
- Do not hand-write `/Users/edam/.codex/automations/*/automation.toml`.
- Codex app state: create through `codex_app.automation_update`.

- [ ] **Step 1: Open the Codex automation API path**

Use `codex_app.automation_update` with create mode. Use project-scoped recurring automation, worktree execution, paused status, and the `BMAD Loop Runner` fields from this plan. Let the tool encode the cadence; do not hand-write scheduler files.

Expected: tool returns a created automation id.

- [ ] **Step 2: Use this exact prompt**

Use the full prompt from `### Automation 1: BMAD Loop Runner`.

Expected: prompt includes all of these strings:

```text
Run `bmad-loop` only if a direct operator goal is supplied
_bmad-output/automation-goals/bmad-loop-goal.md
BMAD loop needs one of: direct operator goal
Never push.
npm ci && npm run quality
```

- [ ] **Step 3: Verify app-local automation materialized**

Run:

```bash
find /Users/edam/.codex/automations -maxdepth 3 -type f -name 'automation.toml' -print
```

Expected: output contains at least one `automation.toml` path.

- [ ] **Step 4: Verify visible state in Codex**

Open Codex Automations tab and confirm a paused project automation named `BMAD Loop Runner` appears for `/Users/edam/Documents/TODA/BMAD-METHOD`.

Expected: automation appears and is paused.

### Task 3: Create Paused BMAD Self-Improve Runner In Codex

**Files:**
- Do not create or modify repository source files.
- Do not hand-write `/Users/edam/.codex/automations/*/automation.toml`.
- Codex app state: create through `codex_app.automation_update`.

- [ ] **Step 1: Create the self-improve automation**

Use `codex_app.automation_update` with create mode. Use project-scoped recurring automation, worktree execution, paused status, and the `BMAD Self-Improve Runner` fields from this plan. Let the tool encode the cadence; do not hand-write scheduler files.

Expected: tool returns a created automation id.

- [ ] **Step 2: Use this exact prompt**

Use the full prompt from `### Automation 2: BMAD Self-Improve Runner`.

Expected: prompt includes all of these strings:

```text
Run `bmad-self-improve` as the BMAD repository instance of `bmad-loop`
_bmad-output/self-improvement/current-goal.md
Do not let Party Mode silently create a goal.
codex/self-improve-*
npm run validate:self-improve-invariants
Never push.
```

- [ ] **Step 3: Verify both automations materialized**

Run:

```bash
find /Users/edam/.codex/automations -maxdepth 3 -type f -name 'automation.toml' -print | wc -l
```

Expected: output is `2` or greater.

- [ ] **Step 4: Verify visible state in Codex**

Open Codex Automations tab and confirm paused project automations named `BMAD Loop Runner` and `BMAD Self-Improve Runner` appear for `/Users/edam/Documents/TODA/BMAD-METHOD`.

Expected: both automations appear and are paused.

### Task 4: Optional Activation Goal Files

**Files:**
- Create: `/Users/edam/Documents/TODA/BMAD-METHOD/_bmad-output/automation-goals/bmad-loop-goal.md`
- Create: `/Users/edam/Documents/TODA/BMAD-METHOD/_bmad-output/self-improvement/current-goal.md`

Only do this task when the operator wants a real scheduled run, not visibility only.

- [ ] **Step 1: Create generic loop goal file**

Use `apply_patch` to create:

```md
# BMAD Loop Automation Goal

Goal source: workflow.goal_ref

Direct goal:
Verify BMAD generic loop automation readiness for Codex visibility. Do not edit repository source files unless a later operator explicitly replaces this goal with implementation work.

Success criteria:
- `bmad --version` reports `6.6.0` or newer.
- `bmad workspace --help` exposes Workspace commands.
- `bmad-loop` workflow customization resolves.
- Latest loop checkpoint and lock state are reported.
- Codex automation visibility evidence is reported.
- No files are edited.

Stop condition:
Checkpoint or Codex inbox summary written, with no repository mutations.

Quality command:
npm ci && npm run quality
```

Expected: file exists at `_bmad-output/automation-goals/bmad-loop-goal.md`.

- [ ] **Step 2: Create self-improve goal file**

Use `apply_patch` to create:

```md
# BMAD Self-Improve Automation Goal

Goal source: workflow.goal_ref

Direct goal:
Validate BMAD self-improve automation readiness for Codex visibility. Do not edit repository source files unless a later operator explicitly replaces this goal with implementation work.

Success criteria:
- `bmad-self-improve` workflow customization resolves and inherits from `bmad-loop`.
- `docs/workspace/bmad-loop-automation-policy.md` and `docs/workspace/self-improvement-codex.md` are readable.
- `npm run validate:bmad-loop-invariants` passes.
- `npm run validate:self-improve-invariants` passes.
- Codex automation visibility evidence is reported.
- No files are edited.

Stop condition:
Checkpoint or Codex inbox summary written, with no repository mutations.

Quality command:
npm ci && npm run quality
```

Expected: file exists at `_bmad-output/self-improvement/current-goal.md`.

- [ ] **Step 3: Validate optional goal files are not secrets**

Run:

```bash
rg -n "sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE)|password\\s*=|token\\s*=" _bmad-output/automation-goals _bmad-output/self-improvement/current-goal.md
```

Expected: no matches.

### Task 5: Optional Activation

**Files:**
- Codex app state only through `codex_app.automation_update`.

Only do this task after Task 4 if the operator wants scheduled runs to start.

- [ ] **Step 1: Update BMAD Loop Runner to active**

Use `codex_app.automation_update` with update mode and the id returned from Task 2. Preserve all existing fields. Set status to active.

Expected: Codex Automations tab shows `BMAD Loop Runner` active.

- [ ] **Step 2: Update BMAD Self-Improve Runner to active**

Use `codex_app.automation_update` with update mode and the id returned from Task 3. Preserve all existing fields. Set status to active.

Expected: Codex Automations tab shows `BMAD Self-Improve Runner` active.

### Task 6: Evidence And Closeout

**Files:**
- Read: `/Users/edam/.codex/automations`
- Read: `/Users/edam/Documents/TODA/BMAD-METHOD/docs/workspace/codex-executable-capability-evidence-plan.md`

- [ ] **Step 1: Capture automation count**

Run:

```bash
find /Users/edam/.codex/automations -maxdepth 3 -type f -name 'automation.toml' -print | wc -l
```

Expected: output is `2` or greater after Tasks 2 and 3.

- [ ] **Step 2: Capture BMAD invariant validator status**

Run:

```bash
npm run validate:bmad-loop-invariants
```

Expected:

```text
BMAD loop invariant validation passed.
```

- [ ] **Step 3: Capture self-improve invariant validator status**

Run:

```bash
npm run validate:self-improve-invariants
```

Expected:

```text
BMAD self-improve invariant validation passed.
```

- [ ] **Step 4: Decide whether full quality is required**

If only paused Codex automations were created and no repository files changed, do not run full quality unless the operator requests it.

If any repository file was created or changed, run:

```bash
npm ci && npm run quality
```

Expected: quality passes before any push. Do not push in this plan.

- [ ] **Step 5: Report closeout**

Final closeout must include:

```text
Created paused Codex project automation: BMAD Loop Runner
Created paused Codex project automation: BMAD Self-Improve Runner
Project: /Users/edam/Documents/TODA/BMAD-METHOD
Execution environment: worktree
BMAD CLI: 6.6.0
Existing dirty worktree impact: none from automation compile
Repository source edits: none, unless optional goal files were created
Next operator decision: leave paused, add goal files, or activate
```

## Self-Review

Spec coverage:

- User asked to compile automations so they appear in Codex. Tasks 2 and 3 create visible Codex automations through the Codex automation API.
- User said currently none appear. Task 1 verifies no existing `automation.toml` files before creation.
- User asked to consider generics `bmad-loop` and `bmad-self-improve`. Automation prompts include both, and keep no-goal refusal intact.
- User asked to leverage ideal BMADs using `bmad-help`. BMAD route uses Help, Workspace, Loop, Self-Improve, Party Mode, and shared planning capabilities.
- User asked for plan mode and entire plan. This document is the full execution plan and keeps implementation paused until operator chooses execution.

Placeholder scan:

- No `TBD`.
- No `TODO`.
- No unnamed error handling.
- No "similar to Task N" references.
- Actual prompts, commands, expected outputs, and file paths are included.

Type and surface consistency:

- `bmad-loop` goal path is consistently `_bmad-output/automation-goals/bmad-loop-goal.md`.
- `bmad-self-improve` goal path is consistently `_bmad-output/self-improvement/current-goal.md`.
- Both automations use worktree execution and paused status.
- Both prompts preserve `npm ci && npm run quality`, no-push policy, Party Mode requirement, and missing-goal refusal.
