---
name: bmad-self-improve
description: 'Use when improving BMAD itself through a local Codex automation-capable workflow with Party Mode, TDD, validation, compile/install, refresh evidence, checkpointing, and schedule-aware continuation.'
---

# BMAD Self-Improve

## Purpose

`bmad-self-improve` runs BMAD improvement work from Codex. It may run as a foreground operator session or as a local Codex automation loop. BMAD provides the policy, prompts, checks, and evidence contract; Codex automation is the local launcher.

Hosted workflow engines, including Vercel Workflow WDK, are future optional orchestrator adapters only. Phase 1 and Phase 2 use the local Codex automation surface and do not add a Vercel runtime dependency.

## Policy Source

Read `docs/workspace/self-improvement-automation-policy.md` before planning or implementation. Treat the policy invariant IDs as non-negotiable unless a baseline policy gate, deterministic invariant checker, and Party Mode consensus all accept the change.

Core invariants:

- `SI-AUTO-001` fresh non-main branch from current `HEAD` unless explicit `base_ref` is supplied.
- `SI-AUTO-002` never run implementation work on `main` and never push.
- `SI-AUTO-003` local Conventional Commits only.
- `SI-AUTO-004` dirty worktree preservation commit before improvement edits.
- `SI-AUTO-005` full gates each loop, including `npm ci && npm run quality`.
- `SI-AUTO-006` `max_fix_attempts=5`.
- `SI-AUTO-007` `max_iterations=1` by default; starter automation may set `max_iterations=3` and `daily_cap=3`.
- `SI-AUTO-008` continuation only after gates, commit, install/refresh evidence, checkpoint, and effective automation schedule/config checks succeed.
- `SI-AUTO-009` install repo-local/test target first, then the policy-approved user agents skill directory when applicable; record Codex refresh evidence.
- `SI-AUTO-010` self-edit and policy-edit use baseline policy gate.
- `SI-AUTO-011` Party Mode may choose any BMAD repo target.
- `SI-AUTO-012` one active loop per repo through `{output_folder}/self-improvement/automation.lock`.
- `SI-AUTO-013` Vercel Workflow WDK remains future optional hosted adapter.

## Inputs

- `repo_path` for the BMAD repository being improved.
- Optional `base_ref`; default is current `HEAD`.
- `scope` or operator goal. If absent, Party Mode chooses the highest-value BMAD repo target.
- `stop_condition` defining the finite endpoint, normally checkpoint written or max loop/fix caps reached.
- `max_iterations`; default `1`.
- `daily_cap`; starter automation may set `3`.
- `max_fix_attempts`; must be `5`.
- Effective automation schedule/config and explicit operator parameters; never infer cadence from automation name or prompt wording.
- Current repo state, installed BMAD config, policy baseline, and Workspace guardrails.

## Run Modes

Recommended mode: local Codex automation loop.

Allowed mode: foreground operator run using the same policy and evidence gates.

Future mode: hosted orchestrator adapter. Vercel Workflow WDK may wrap the same contract later through an adapter such as `startLoop`, `resumeLoop`, `recordCheckpoint`, and `scheduleNext`, but it must not replace the local policy or invariant gates.

## Outputs

- Baseline policy and base SHA.
- Lock acquisition result.
- Dirty worktree preservation commit when needed.
- Fresh branch name.
- Initial Party Mode decision.
- Decision-complete plan with acceptance criteria.
- Party Mode critique and revised plan.
- TDD implementation evidence.
- Test results and full gate output.
- compile/install evidence for generated BMAD skills.
- Codex refresh result or fallback refresh status.
- Local commit SHA values.
- Continuation decision.
- Checkpoint under `{output_folder}/self-improvement/<YYYYMMDD-HHMM>-<slug>.md`.

## Stop Conditions

Stop and report when any condition appears:

- Required input or finite stop condition is missing.
- Policy baseline cannot be captured.
- `automation.lock` exists and is not resolved by checkpointed failure evidence.
- Current branch is `main` and a fresh non-main branch cannot be created before improvement work.
- Branch name does not start with `codex/self-improve-`.
- Push would be required.
- Secret or huge generated file appears in dirty preservation scope.
- Quality gate or targeted test fails after `max_fix_attempts=5`.
- Install or refresh fails after quality passes; commit code and checkpoint, then mark continuation blocked.
- Policy change weakens a non-negotiable invariant.
- Deterministic invariant checker cannot classify a policy change.
- Party Mode decision conflicts with repo rules, policy, or tests.
- compile/install evidence is missing when generated skills change.
- Codex refresh status cannot be recorded.

## Required Sequence

1. Verify repo instructions, current git state, `bmad --version`, and `bmad workspace --help`.
2. Read `docs/workspace/self-improvement-automation-policy.md`, capture baseline policy content, and record `SELF_IMPROVE_BASE_REF=$(git rev-parse HEAD)`.
3. Read the effective automation schedule/config, explicit operator parameters, and latest self-improvement checkpoint. If continuation is blocked, stop before branch creation unless the operator explicitly cleared or overrode the block.
4. Acquire `{output_folder}/self-improvement/automation.lock`. If an existing lock is stale, write checkpointed failure evidence before continuing.
5. Create a fresh non-main branch from current `HEAD` or explicit `base_ref` before improvement work. If dirty files exist, create `chore: preserve pre-automation worktree state` on the fresh branch before implementation edits.
6. Run `skill:bmad-party-mode` before writing any plan. Ask it to choose the highest-value BMAD repo target, likely files, risks, and tests.
7. Write a decision-complete plan. Include public behavior, acceptance criteria, TDD slices, compile/install steps, refresh probe, checkpoint path, effective automation schedule/config consulted, and continuation preconditions.
8. Run `skill:bmad-party-mode` again before implementation. Ask it to critique the plan, reject weak assumptions, and revise decisions.
9. Implement with TDD, one vertical slice at a time, inside the selected BMAD repo target.
10. Run targeted validation after each slice. If failures remain, fix until green or `max_fix_attempts=5` is reached.
11. Run `npm ci && npm run quality` before local code commit, install, refresh, or continuation.
12. Run `npm run validate:self-improve-invariants` when policy, automation docs, or `bmad-self-improve` changes.
13. compile/install updated BMAD skills with the existing installer.
14. Verify Codex refresh behavior. Request app-server reload if available; else record installed path, manifest row, source/installed SHA-256 hashes, and a fallback refresh status.
15. Commit passing work locally with a Conventional Commit message. Never push.
16. Write final checkpoint with branch, commits, gate evidence, install/refresh evidence, and continuation decision.
17. Allow continuation only when the effective automation schedule/config, latest checkpoint, gates, evidence, lock state, and loop caps allow it.

## Self-Edit and Policy-Edit Gate

`bmad-self-improve` may edit itself, and Party Mode may propose edits to the policy file. Current-loop execution always uses the baseline rules captured at loop start.

When the skill or policy changes:

- Run Party Mode consensus with at least three BMAD voices, including Developer and Architect.
- Record consensus evidence in the checkpoint.
- Run `npm run validate:self-improve-invariants`.
- Candidate policy must preserve every baseline non-negotiable invariant unless the checker classifies the edit as clarifying or stricter.
- If the checker cannot classify the policy change, fail closed for human review: leave branch dirty or locally committed as evidence, skip install, skip refresh, and mark continuation blocked.
- An edited skill version may govern only a later loop after install and refresh evidence confirms it is visible.

## TDD Rules

- Write one failing behavior test first.
- Make the smallest implementation change that passes it.
- Repeat for each acceptance criterion.
- Refactor only when tests are green.
- Prefer public behavior checks over implementation details.
- Validate branch/no-push/main, continuation, install/refresh, dirty-worktree, self-edit, and policy-edit invariants when automation boundaries change.

## compile/install Rules

Use the existing installer. Do not add a new CLI command unless a test proves the existing path cannot serve this workflow.

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

Current user install refresh, when policy and gates allow it:

```bash
node tools/installer/bmad-cli.js install --directory /Users/edam --modules bmm --tools codex --yes --action update
```

`~/.codex/skills` global install remains out of scope until the BMAD installer CLI wires that target explicitly.

## Codex Refresh Probe

Codex App Server documents `skills/list` with `forceReload: true` and `skills/changed` notifications for watched local skill files. If app-server access exists, request a forced reload for the current cwd and verify `bmad-self-improve` appears.

If app-server access is unavailable, record:

- installed `SKILL.md` path
- manifest row
- source and installed SHA-256 hashes
- one of `refresh: live`, `refresh: requires new chat`, `refresh: requires Codex restart`, or `refresh: unknown`

Do not claim hot reload unless the run verifies it.

## Completion

Complete only after:

- Revised plan is implemented or explicitly blocked.
- Relevant targeted tests are green or failure is recorded after `max_fix_attempts=5`.
- `npm run validate:skills` is run when skills change.
- `npm run validate:self-improve-invariants` is run when policy or automation surfaces change.
- `npm ci && npm run quality` result is recorded.
- compile/install result is recorded when generated skills change.
- Refresh status is recorded.
- Final checkpoint exists.
- Continuation decision is recorded.
