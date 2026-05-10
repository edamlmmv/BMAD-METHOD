---
title: "BMAD Route Planning Prompt"
description: Reusable prompt template for BMAD route planning with Codex goal and plan controls
---

# BMAD Route Planning Prompt

Use this prompt when starting a fresh Codex thread that should first decide the
right BMAD route, required evidence, readiness state, and Codex control mode
before implementation. Replace placeholders before running.

```md
[$caveman]({skill-root}/caveman/SKILL.md) ultra

[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-loop]({skill-root}/bmad-loop/SKILL.md)

Workspace: {project-root}

/goal [STATE THE OUTCOME. Include done condition.]

Use `bmad-help` first. Gather repo truth before asserting phase or route.

Need:
- current BMAD phase
- next required BMAD route
- evidence to gather
- success criteria
- non-goals
- readiness blockers
- whether implementation-readiness can run now
- whether Codex Plan Mode, `/goal`, or direct execution fits
- whether Party Mode consensus is needed, with voices

Rules:
- Do not treat stale chat memory as source truth.
- Inspect local artifacts before planning.
- Use existing BMAD routes before proposing new BMADs.
- Use `/goal` when task spans multiple turns or must continue until done.
- Use Plan Mode when route, scope, blockers, or success criteria are uncertain.
- Use `bmad-loop` for bounded autonomous work with checkpoints, tests, quality,
  and commit.
- Use `bmad-self-improve` only for BMAD repo improvements.
- Use `bmad-check-implementation-readiness` only for BMM Phase 3->4 or material
  PRD/architecture/epics scope changes.
- No hidden execution, scheduler, daemon, watcher, auto-push, or auto-promotion.

Evidence to inspect:
- `git status --short --untracked-files=all`
- `bmad --version`
- `bmad workspace --help`
- `_bmad/_config/bmad-help.csv`
- relevant `docs/workspace/**`
- relevant `_bmad-output/**`
- current story/sprint/status artifacts when implementation-related

Party Mode:
- Pick 2-4 voices by task.
- For product/route/template decisions use PM, Architect, Dev/QA, Technical
  Writer.
- Record: participants, votes, decision, required changes, deferred decisions, blockers, next action.

Output:
1. Verdict: proceed / revise / block.
2. Current BMAD phase.
3. Recommended BMAD route.
4. Evidence gathered.
5. Success criteria.
6. Non-goals.
7. Readiness blockers.
8. Implementation-readiness: yes/no + why.
9. Copy-ready continuation prompt if execution should continue.
```

## Acceptance Checks

- Prompt forces local evidence before phase or route claims.
- Prompt routes through existing BMAD skills before proposing new BMADs.
- Prompt names Codex `/goal`, Plan Mode, and direct execution as separate
  control choices.
- Prompt keeps `bmad-check-implementation-readiness` scoped to BMM Phase 3->4
  or material PRD/architecture/epics changes.
- Prompt treats Party Mode consensus as advisory planning evidence, not
  execution or approval authority.
