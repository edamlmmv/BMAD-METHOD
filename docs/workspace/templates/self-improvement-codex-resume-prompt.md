---
title: "Self-Improvement Resume Prompt"
description: Prompt template for resuming BMAD self-improvement automation in Codex
---

# Self-Improvement Resume Prompt

Use this prompt when context runs low or a fresh Codex chat must continue a BMAD self-improvement run.

```md
[$caveman]({skill-root}/caveman/SKILL.md)
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Resume BMAD self-improvement from the latest checkpoint under `{output_folder}/self-improvement/`.

First read:

- `docs/workspace/self-improvement-automation-policy.md`
- latest checkpoint
- `{output_folder}/self-improvement/automation.lock`
- effective automation schedule/config or explicit operator parameters
- current git branch and diff
- targeted test or validation output named in the checkpoint

Resume from the next exact task. Do not restart discovery unless the checkpoint says the plan is invalid. Preserve Party Mode decisions unless they conflict with repo rules, tests, policy, or safety.

Before continuing, verify:

- current branch is a fresh non-main `codex/self-improve-*` branch
- no push is required
- baseline policy hash or baseline ref is recorded
- `max_fix_attempts=5`
- continuation state is not blocked, or the operator explicitly cleared or overrode the block

Before final response, record:

- implementation status
- tests run
- `npm ci && npm run quality` result if reached
- compile/install result
- Codex refresh result
- local commit SHAs
- continuation decision
- remaining risks
```
