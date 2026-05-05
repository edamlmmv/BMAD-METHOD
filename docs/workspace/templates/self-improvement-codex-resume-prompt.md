---
title: "Self-Improvement Resume Prompt"
description: Prompt template for resuming a BMAD self-improvement run in Codex
---

# Self-Improvement Resume Prompt

Use this prompt when context runs low or a fresh Codex chat must continue a
BMAD self-improvement run.

```md
[$caveman]({skill-root}/caveman/SKILL.md)
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Resume the BMAD self-improvement run from the latest checkpoint under
`{output_folder}/self-improvement/`.

First read:

- latest checkpoint
- current git diff
- relevant tests or validation output named in the checkpoint

Do not restart discovery unless the checkpoint says the plan is invalid.
Preserve Party Mode decisions unless they conflict with repo rules, tests, or
safety. Resume from the next exact task.

Before final response, record:

- implementation status
- tests run
- compile/install result
- Codex refresh result
- remaining risks
```
