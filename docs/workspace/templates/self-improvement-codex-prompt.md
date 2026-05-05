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

Improve BMAD-METHOD itself. If I give no specific target, Party Mode chooses
the highest-value target inside repo rules, tests, and evidence gates.

Required sequence:

1. Read repo instructions and current git state.
2. Verify `bmad --version` and `bmad workspace --help`.
3. Run Party Mode before writing any plan.
4. Produce a decision-complete plan with acceptance criteria and TDD slices.
5. Run Party Mode again before implementation to critique the plan.
6. Revise the plan from Party Mode output.
7. Implement with TDD, one vertical slice at a time.
8. Run targeted validation.
9. compile/install updated BMAD skills with the existing installer.
10. Verify Codex refresh behavior.
11. Write checkpoint evidence under `{output_folder}/self-improvement/`.

Guardrails:

- No scheduler, watcher, daemon, hidden executor, live adapter, or
  auto-promotion loop.
- No global `~/.codex/skills` install for v1.
- No claim of Codex hot reload unless verified.
- Keep unrelated dirty files untouched.
- Before push, run `npm ci && npm run quality` on `HEAD`.

Task:

[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]
```
