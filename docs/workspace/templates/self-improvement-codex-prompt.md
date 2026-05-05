---
title: "Self-Improvement Codex Prompt"
description: Prompt template for operator-run BMAD self-improvement in Codex
---

# Self-Improvement Codex Prompt

Use this prompt to improve BMAD-METHOD itself from Codex. Replace placeholders
before running.

```md
[$caveman]({skill-root}/caveman/SKILL.md)
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Improve BMAD-METHOD itself. `bmad-self-improve` is an operator-invoked BMAD
skill, not Codex automation. Missing automation is expected.

Run mode and required inputs:

Mode: manual operator-run
Branch: [EXPECTED BRANCH]
Scope: [NARROW IMPROVEMENT BOUNDARY]
Target skill or files: [SPECIFIC SKILL/DOCS/CODE AREA]
Stop condition: [FINITE ENDPOINT]

Allowed alternate mode:

Mode: one-shot unassisted foreground run

Use the alternate only when I explicitly ask for it. It must be foreground,
operator-started, fixed-scope, and end at checkpoint. It must not recur.

If I give no specific target, Party Mode chooses the highest-value target inside
repo rules, tests, evidence gates, and the declared scope.

Required sequence:

1. Read repo instructions and current git state.
2. Verify `bmad --version` and `bmad workspace --help`.
3. Validate branch, scope, target files, and finite stop condition.
4. Run Party Mode before writing any plan.
5. Produce a decision-complete plan with acceptance criteria and TDD slices.
6. Run Party Mode again before implementation to critique the plan.
7. Revise the plan from Party Mode output.
8. Implement with TDD, one vertical slice at a time.
9. Run targeted validation.
10. compile/install updated BMAD skills with the existing installer.
11. Verify Codex refresh behavior.
12. Write checkpoint evidence under `{output_folder}/self-improvement/`.

Guardrails:

- No scheduler, watcher, daemon, hidden executor, live adapter, or
  auto-promotion loop.
- No cron or recurring automation.
- `bmad-loop` remains observe/coordination only; no execution authority.
- No global `~/.codex/skills` install for v1.
- No claim of Codex hot reload unless verified.
- Keep unrelated dirty files untouched.
- Stop if the stop condition is missing or not finite.
- Stop on branch mismatch, scope escape, or unrelated dirty files that would
  need edits.
- Before push, run `npm ci && npm run quality` on exact `HEAD`.

Task:

[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]
```
