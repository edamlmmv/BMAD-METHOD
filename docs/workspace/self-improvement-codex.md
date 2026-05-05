---
title: 'bmad-self-improve Codex Automation Runbook'
description: Local Codex automation-capable BMAD self-improvement workflow
---

# `bmad-self-improve` Codex Automation Runbook

`bmad-self-improve` runs BMAD improvement work from Codex. It supports local Codex automation loops and foreground operator runs through the same policy, tests, install, refresh, and checkpoint gates.

The source policy is [Self-Improvement Automation Policy](./self-improvement-automation-policy.md). Read it before running or editing this workflow.

Vercel Workflow WDK is a future optional hosted adapter, not part of Phase 1 or Phase 2. The starter contract stays local to Codex and this Node CLI/skills repo.

## Required Launch Inputs

Every run defines:

- `repo_path`: repository to improve.
- `base_ref`: optional; default is current `HEAD`.
- `scope` or goal: optional; Party Mode may choose any BMAD repo target.
- `stop_condition`: finite endpoint such as checkpoint written, max iterations, max fix attempts, or operator review.
- `automation_schedule_config`: effective automation schedule/config or explicit operator-provided cadence parameters; never infer cadence from name or prompt text.
- `max_iterations`: default `1`; starter automation may set `3`.
- `daily_cap`: starter automation may set `3`.
- `max_fix_attempts`: fixed at `5`.

Stop before implementation if required inputs, policy baseline, or finite stop condition cannot be recorded.

## Allowed Modes

Recommended mode:

```text
Mode: local Codex automation loop
```

Allowed foreground mode:

```text
Mode: foreground operator run
```

Future optional mode:

```text
Mode: hosted orchestrator adapter
```

The hosted adapter mode is documentation-only for now. It must wrap the same policy, invariant checker, install, refresh, and checkpoint contract.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Self-Improve consumes these shared capabilities when its run needs them:

- `capability:zoom-out` `zoom-out` runs one bounded reframing pass for problem, constraints, alternatives, and chosen path.
- `capability:tdd` `tdd` produces failing-test-first implementation guidance when implementation risk warrants it.
- `capability:ubiquitous-language` `ubiquitous-language` aligns terms across skills, docs, prompts, module help, and code-facing names.
- `capability:grill-me` `grill-me` runs an opt-in or checkpoint-only challenge round; record objections plus decisions changed or deferred.

## Workspace Graph Evidence

Self-Improve consumes Workspace graph evidence only. Use `intake/graph.json`,
`intake/repo-intake.json`, and `intake/provenance.json` from BMAD Workspace as
session evidence; must not call Graphify ad hoc and must not silently regenerate graph artifacts.

Graph evidence is advisory. It may guide repo topology analysis, docs/code link
checks, and agent/tool boundary work, but source files remain authority before
any recommendation or edit. Workspace graph evidence does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration.

## Codex Advanced Configuration

Codex Advanced Configuration is optional operator-local setup. It can change
local tool behavior, but BMAD authority still comes from user approval, story
scope, BMAD Work Packets, grants, and repository process. Use the official Codex
docs as references only: [Advanced Configuration](https://developers.openai.com/codex/config-advanced),
[Configuration Reference](https://developers.openai.com/codex/config-reference),
and [Sandbox Defaults](https://developers.openai.com/codex/concepts/sandboxing#configure-defaults).

BMAD-relevant Codex configuration notes, reviewed on 2026-05-05:

- User configuration lives in `~/.codex/config.toml`.
- Project configuration can live in `.codex/config.toml`, but it loads only for
  trusted projects; relative paths inside that file resolve from `.codex/`.
- Profiles and hooks are experimental. Do not rely on them for BMAD invariants,
  approval, refresh authority, hidden execution, schedulers, or Workspace writes.
- Hooks require `features.codex_hooks`; this workflow does not require hooks.
- `[agents]` configuration is optional subagent role tuning only. It does not
  create story authority, grants, acceptance criteria, or delegation authority.
- The lower-risk local automation preset is
  `sandbox_mode = "workspace-write"` with `approval_policy = "on-request"`.
- The full-access preset, `sandbox_mode = "danger-full-access"` with
  `approval_policy = "never"`, is high-risk trusted-local behavior documented
  for awareness, not the recommended default.
- `openai_base_url` can route Codex through a configured OpenAI-compatible
  endpoint or proxy when supported; verify behavior against official docs and
  organization policy. It does not grant BMAD authority or create compliance
  guarantees.
- Multi-agent features are normally available, with documented defaults of
  `max_threads=6` and `max_depth=1` when unset.

## What It Does

The workflow runs:

1. Repo instruction and CLI verification.
2. Baseline policy capture and loop lock acquisition.
3. Dirty worktree preflight with `git status --porcelain --untracked-files=all`.
4. Secret and oversized/generated artifact scan when preservation is needed.
5. Dirty worktree preservation commit when needed.
6. Fresh non-main branch creation and freshness verification.
7. Party Mode target decision.
8. Plan.
9. Party Mode critique.
10. Revised plan.
11. TDD implementation.
12. Targeted validation and fix attempts.
13. `npm ci && npm run quality` on `HEAD` of the exact checkout.
14. BMAD compile/install.
15. Codex refresh evidence.
16. Activation State, Resume Contract, and Session Identity evidence.
17. Local Conventional Commit.
18. Final checkpoint.
19. Continuation decision.

## Preflight Contract

Before branch creation or improvement edits, run:

```bash
git status --porcelain --untracked-files=all
```

If it reports only ignored files or no files, continue to branch creation. If it reports tracked, deleted, or untracked non-ignored files, scan those pending files for suspected secrets and disallowed huge generated artifacts. If the scan fails, abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.

If the scan passes and the operator prompt requires preservation before branch creation, commit the current checkout with:

```text
chore: preserve pre-automation worktree state
```

Then create or switch to a fresh non-main `codex/self-improve-*` branch from the preserved state. Fresh means not `main` or `master`, matching `codex/self-improve-*`, and created for the current run before improvement edits. No implementation, docs, test, install, refresh, or continuation mutation may occur until that branch freshness is verified. Never push.

## Activation And Resume Contract

Every checkpoint records stable fenced YAML for `activation_state`, `resume_contract`, and `session_identity`.

`activation_state` separates repo readiness from active user skill readiness:

- `repo_quality`: `pass`, `fail`, or `unknown`
- `repo_local_install`: `pass`, `fail`, or `unknown`
- `active_user_install`: `pass`, `fail`, `blocked`, or `unknown`
- `active_skill_hash`: `match`, `mismatch`, or `unknown`
- `refresh_state`: `known_good`, `failed`, `blocked`, or `unknown`

`resume_contract.continuation_allowed` is true only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, and refresh state is known_good. `refresh_state: unknown` never allows continuation.

`session_identity.classification` records whether a supplied id is a BMAD Workspace Session id, Codex thread id, missing session, or unknown. Codex thread ids are not BMAD Workspace Session ids, so `SESSION_NOT_FOUND` from a Codex thread id is classification evidence, not missing-run evidence.

## Foreground Resume Quickstart

Use this when a foreground operator run resumes from an existing checkpoint.
Record evidence in the checkpoint before continuing implementation work.

1. Read `docs/workspace/self-improvement-automation-policy.md`.
2. Open the latest checkpoint at `_bmad-output/self-improvement/<YYYYMMDD-HHMM>-<slug>.md`.
3. Check `_bmad-output/self-improvement/automation.lock` and record whether the lock is current, stale with evidence, or absent.
4. Confirm current branch and diff, then run `git status --porcelain --untracked-files=all`.
5. Read checkpoint sections `Party Mode Decision` and `Party Mode Critique`; do not claim Party Mode evidence unless those sections name the voices, decision, critique, and unresolved objections.
6. Read `capability:tdd` or TDD evidence in the checkpoint; continue only from a named red-green-refactor slice with one failing public behavior test, smallest green change, and validation command.
7. Inspect `compile/install Evidence` and `Refresh Evidence`; separate repo-local install readiness from active user skill readiness.
8. Update `Activation State`, `Resume Contract`, `Session Identity`, and `Next Operator Decision` before continuing or stopping.
9. Before any commit, install, refresh, or continuation claim, run `npm ci && npm run quality` on `HEAD` of the exact checkout and record the output.

Checkpoint examples that need machine validation store one evidence block with
the exact info string `yaml self_improvement_checkpoint`. The block must record
`activation_state`, `resume_contract`, `session_identity`, and `evidence_gates`.
`resume_contract.continuation_allowed` may be true only when all activation
state fields and matching evidence gates prove readiness.

Before continuing from a real checkpoint, run:

```text
node tools/validate-self-improve-invariants.js --checkpoint <checkpoint-path> --require-continuation-allowed
```

The default `npm run validate:self-improve-invariants` remains repo-contract-only and does not scan ignored local checkpoints. Resume-mode failures use stable codes: `SI_CHECKPOINT_CONTINUATION_BLOCKED`, `SI_CHECKPOINT_HEAD_MISSING`, and `SI_CHECKPOINT_STALE_HEAD`.

## Launch Prompt

```text
Run bmad-self-improve on /Users/edam/Documents/TODA/BMAD-METHOD.

Mode: local Codex automation loop
Base ref: current HEAD
Scope: any BMAD repo target selected by Party Mode
Stop condition: checkpoint written or max caps reached
Automation schedule/config: read effective automation metadata or operator-provided params; do not infer cadence from name or prompt text
max_iterations: 3
daily_cap: 3
max_fix_attempts: 5

Required policy:
- Read docs/workspace/self-improvement-automation-policy.md.
- Capture SELF_IMPROVE_BASE_REF before edits.
- Run git status --porcelain --untracked-files=all before branch creation.
- Scan dirty non-ignored files for suspected secrets and huge generated artifacts before preservation.
- If scan fails, abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.
- Preserve dirty worktree in a separate commit before branch creation when the operator prompt requires it.
- Use a fresh codex/self-improve-* branch.
- Never run implementation work on main.
- Never push.
- Use local Conventional Commits only.
- Run Party Mode before plan and before implementation.
- Use TDD for scoped code/docs/skill changes.
- Run npm ci && npm run quality on HEAD of the exact checkout before code commit, install, refresh, or continuation.
- Run npm run validate:self-improve-invariants for policy or self-edit changes.
- Install repo-local/test target first, then /Users/edam/.agents when applicable.
- Actively request Codex skill reload when available; otherwise record fallback evidence.
- Record Activation State, Resume Contract, and Session Identity.
- Treat `/Users/edam` sandbox failure as active install readiness blocker, not repo failure.
- Treat `SESSION_NOT_FOUND` for Codex thread ids as Session Identity evidence, not missing-run evidence.
- Write checkpoint under _bmad-output/self-improvement/.
- Allow continuation only after quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, refresh state is known_good, checkpoint, effective schedule/config, and caps pass.

Task:
[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]
```

## Self-Edit and Policy-Edit

Automation may edit `bmad-self-improve` and the policy file. The current loop uses baseline rules captured at start. Party Mode consensus for policy changes requires at least three BMAD voices, including Developer and Architect, and the checkpoint records that evidence.

The deterministic invariant checker blocks weakened non-negotiables. If the checker cannot classify a policy change, the loop stops for human review with no install, no refresh, and continuation blocked.

## Stop Conditions

Stop and report before continuing when:

- Required input or finite stop condition is missing.
- Policy baseline cannot be captured.
- Lock exists without checkpointed stale-lock failure evidence.
- Fresh non-main branch cannot be created.
- Push would be required.
- Dirty state contains a secret or huge generated artifact.
- Tests or quality still fail after `max_fix_attempts=5`.
- Install or refresh fails after quality passes.
- Active skill hash mismatches expected after repo-local install passes.
- Refresh state is `unknown`, `failed`, or `blocked`.
- Party Mode conflicts with repo rules, tests, or policy.
- Policy change weakens a non-negotiable invariant.
- The invariant checker cannot classify a policy change.
- compile/install evidence is missing when generated skills change.
- Refresh status cannot be recorded.

## Checkpoint Evidence

Write checkpoints under:

```text
_bmad-output/self-improvement/<YYYYMMDD-HHMM>-<slug>.md
```

Each checkpoint records objective, question, mode and inputs, effective automation schedule/config, base SHA, baseline policy hash, branch, dirty preservation commit, Party Mode decision and critique, policy consensus evidence, plan status, changed files, tests run, pass/fail output, full gate output, compile/install evidence, refresh evidence, Activation State, Resume Contract, Session Identity, local commit SHAs, lock result, continuation decision, resume command, unresolved risks, and next operator decision.

## Contract Maintenance

When a self-improvement policy, prompt, resume prompt, checkpoint template,
skill, or module-help contract changes, update
`tools/validate-self-improve-invariants.js` and the matching fixture coverage in
`test/test-self-improve-invariants.js` in the same change.
