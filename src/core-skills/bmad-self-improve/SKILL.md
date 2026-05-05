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
- `SI-AUTO-004` dirty worktree preservation preflight with `git status --porcelain --untracked-files=all`.
- `SI-AUTO-005` full gates each loop, including `npm ci && npm run quality` on `HEAD` of the exact checkout.
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
- Activation State, Resume Contract, and Session Identity evidence.
- Local commit SHA values.
- Continuation decision.
- Checkpoint under `{output_folder}/self-improvement/<YYYYMMDD-HHMM>-<slug>.md`.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Self-Improve consumes these shared capabilities when its run needs them:

- `capability:zoom-out` `zoom-out` runs one bounded reframing pass for problem, constraints, alternatives, and chosen path.
- `capability:tdd` `tdd` produces failing-test-first implementation guidance when implementation risk warrants it.
- `capability:ubiquitous-language` `ubiquitous-language` aligns terms across skills, docs, prompts, module help, and code-facing names.
- `capability:grill-me` `grill-me` runs an opt-in or checkpoint-only challenge round; record objections plus decisions changed or deferred.

## Workspace Graph Evidence

Self-Improve consumes Workspace graph evidence only, through BMAD Workspace
artifacts such as `intake/graph.json`, `intake/repo-intake.json`, and
`intake/provenance.json`. It must not call Graphify ad hoc and must not silently regenerate graph artifacts.

Graph evidence is advisory. Use it as navigation context for repo topology,
docs/code links, and agent/tool boundary work; source files remain authority
before any recommendation or edit. Workspace graph evidence does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration.

## Evidence Gate v1 Boundary

Evidence Gate v1 is future-compatible Self-Improve context through BMAD
Workspace packet v5. Self-Improve does not actively enforce Evidence Gate v1 in v1,
does not make continuation decisions from packet gates, and does not mark gates pass/fail.
A later phase may consume packet v5 gates after packet v5 stabilizes and after Party Mode
consensus plus tests preserve the no-Graphify-runtime boundary.

## Stop Conditions

Stop and report when any condition appears:

- Required input or finite stop condition is missing.
- Policy baseline cannot be captured.
- `automation.lock` exists and is not resolved by checkpointed failure evidence.
- Current branch is `main` or `master` and a fresh non-main branch cannot be created before improvement work.
- Branch name does not start with `codex/self-improve-`.
- Push would be required.
- Secret or huge generated file appears in dirty preservation scope.
- Quality gate or targeted test fails after `max_fix_attempts=5`.
- Install or refresh fails after quality passes; commit code and checkpoint, then mark continuation blocked.
- Active user install is failed or blocked after repo-local install passes.
- Active skill hash mismatches expected.
- Refresh state is unknown, failed, or blocked.
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
5. Run `git status --porcelain --untracked-files=all` before branch creation. If it reports tracked, deleted, or untracked non-ignored files, scan the pending files for suspected secrets and huge generated artifacts. If the scan fails, abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.
6. If dirty preservation is required and the scan passes, preserve the current checkout with `chore: preserve pre-automation worktree state` before branch creation.
7. Create or switch to a fresh non-main `codex/self-improve-*` branch from current `HEAD`, explicit `base_ref`, or the preservation commit. Fresh means not `main` or `master`, matching `codex/self-improve-*`, and created for the current run before improvement edits. Verify branch freshness before any implementation, docs, tests, install, refresh, or continuation mutation.
8. Run `skill:bmad-party-mode` before writing any plan. Ask it to choose the highest-value BMAD repo target, likely files, risks, and tests.
9. Write a decision-complete plan. Include public behavior, acceptance criteria, TDD slices, compile/install steps, refresh probe, checkpoint path, effective automation schedule/config consulted, and continuation preconditions.
10. Run `skill:bmad-party-mode` again before implementation. Ask it to critique the plan, reject weak assumptions, and revise decisions.
11. Implement with TDD, one vertical slice at a time, inside the selected BMAD repo target.
12. Run targeted validation after each slice. If failures remain, fix until green or `max_fix_attempts=5` is reached.
13. Run `npm ci && npm run quality` on `HEAD` of the exact checkout before local code commit, install, refresh, or continuation.
14. Run `npm run validate:self-improve-invariants` when policy, automation docs, or `bmad-self-improve` changes.
15. compile/install updated BMAD skills with the existing installer.
16. Verify Codex refresh behavior. Request app-server reload if available; else record installed path, manifest row, source/installed SHA-256 hashes, and a fallback refresh status.
17. Record Activation State with `repo_quality`, `repo_local_install`, `active_user_install`, `active_skill_hash`, and `refresh_state`.
18. Record Resume Contract with `continuation_allowed`, `reason`, and `required_before_resume`.
19. Record Session Identity with `codex_thread_id`, `workspace_session_id`, and `classification`.
20. Commit passing work locally with a Conventional Commit message. Never push.
21. Write final checkpoint with branch, commits, gate evidence, install/refresh evidence, Activation State, Resume Contract, Session Identity, and continuation decision.
22. Allow continuation only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, refresh state is known_good, and the effective automation schedule/config, latest checkpoint, evidence, lock state, and loop caps allow it.

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
- `refresh_state` as `known_good`, `failed`, `blocked`, or `unknown`

`refresh_state: unknown` never allows continuation. A repo-local install pass with stale active user skill hash means the repo may be ready while active continuation remains blocked.

## Session Identity

Classify any supplied id before treating BMAD Workspace evidence as authoritative:

- `valid_workspace_session`
- `codex_thread_only`
- `session_not_found`
- `unknown`

Codex thread ids are not BMAD Workspace Session ids. Treat `SESSION_NOT_FOUND` from a Codex thread id as Session Identity evidence, not missing-run evidence.

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
