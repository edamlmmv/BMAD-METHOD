---
title: "Self-Improvement Codex Prompt"
description: Prompt template for local Codex automation-capable BMAD self-improvement
---

# Self-Improvement Codex Prompt

Use this prompt to improve BMAD-METHOD itself from Codex. Replace placeholders before running.

```md
[$caveman]({skill-root}/caveman/SKILL.md)
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Run local Codex automation-capable BMAD self-improvement.

Mode: local Codex automation loop
Repo path: `{project-root}`
Base ref: current HEAD
Scope: any BMAD repo target selected by Party Mode
Stop condition: checkpoint written or max caps reached
Automation schedule/config: read effective value from Codex automation metadata or operator-provided params; do not assume cadence from name or prompt text
max_iterations: 3
daily_cap: 3
max_fix_attempts: 5

Required policy:

1. Read `docs/workspace/self-improvement-automation-policy.md`.
2. Capture `SELF_IMPROVE_BASE_REF=$(git rev-parse HEAD)` and baseline policy hash before edits.
3. Acquire `{output_folder}/self-improvement/automation.lock`; stale lock needs checkpointed failure evidence before continuation.
4. Create a fresh `codex/self-improve-YYYYMMDD-HHMM-<slug>` branch from current `HEAD` unless I provide an explicit base ref.
5. Read effective automation schedule/config, explicit operator parameters, and latest checkpoint. If continuation is blocked, stop before branch creation unless I explicitly clear or override the block.
6. Never run implementation work on `main`; never push.
7. If the worktree is dirty, preserve non-ignored dirty state in a separate local commit before improvement edits: `chore: preserve pre-automation worktree state`.
8. Stop before preservation if dirty files contain high-confidence secrets or huge generated artifacts.
9. Run `skill:bmad-party-mode` before writing any plan. Party Mode may choose any BMAD repo target.
10. Write a decision-complete plan with acceptance criteria, TDD slices, compile/install steps, refresh probe, checkpoint path, and continuation preconditions.
11. Run `skill:bmad-party-mode` again before implementation to critique the plan.
12. Implement with TDD, one vertical slice at a time.
13. Attempt fixes until green or `max_fix_attempts=5`.
14. Run `npm ci && npm run quality` before local code commit, install, refresh, or continuation.
15. Run `npm run validate:self-improve-invariants` when policy, `bmad-self-improve`, or automation docs change.
16. For policy edits, record Party Mode consensus from at least three BMAD voices, including Developer and Architect.
17. compile/install updated BMAD skills with the existing installer.
18. Install repo-local/test target first, then `/Users/edam/.agents` when applicable.
19. Actively request Codex skill reload when available; otherwise record installed path, manifest row, source/installed SHA-256 hashes, and fallback refresh status.
20. Commit passing work locally with a Conventional Commit message. Never push.
21. Write checkpoint evidence under `{output_folder}/self-improvement/`.
22. Allow continuation only after gates, commit, install/refresh evidence, checkpoint, lock release, effective schedule/config, and caps pass.

Failure behavior:

- After five failed fix attempts, leave the branch dirty for inspection, write checkpoint, and mark continuation blocked.
- If quality passes but install or refresh fails, commit code and checkpoint, then mark continuation blocked.
- If policy weakening is detected or cannot be classified, fail closed for human review: no install, no refresh, continuation blocked.

Future hosted adapter:

- Vercel Workflow WDK is not part of this run. It may become a future optional hosted orchestrator adapter only after the local Codex loop proves value.

Task:

[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]
```
