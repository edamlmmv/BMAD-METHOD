---
title: "Self-Improvement Resume Prompt"
description: Prompt template for resuming BMAD self-improvement as a bmad-loop instance
---

# Self-Improvement Resume Prompt

Use this prompt when context runs low or a fresh Codex chat must continue a BMAD
self-improvement run.

````md
[$bmad-help]({skill-root}/bmad-help/SKILL.md)
[$bmad-workspace]({skill-root}/bmad-workspace/SKILL.md)
[$bmad-party-mode]({skill-root}/bmad-party-mode/SKILL.md)
[$bmad-loop]({skill-root}/bmad-loop/SKILL.md)
[$bmad-self-improve]({skill-root}/bmad-self-improve/SKILL.md)

You are Codex working in `{project-root}`.

Resume `bmad-self-improve` from the latest checkpoint under
`{output_folder}/self-improvement/` unless the resolved `checkpoint_subdir`
points elsewhere.

WorkflowBundle id: self-improvement
LoopRunConfig inheritance: unspecified fields resolve from `bmad-loop`

First read:

- `docs/workspace/bmad-loop-automation-policy.md`
- `docs/workspace/self-improvement-codex.md`
- latest checkpoint
- `{output_folder}/self-improvement/automation.lock`
- effective automation schedule/config or explicit operator parameters
- current git branch and diff
- dirty preflight scan result
- targeted test or validation output named in the checkpoint
- Activation State
- Resume Contract
- Session Identity

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Preserve capability evidence for `capability:zoom-out`, `capability:tdd`,
`capability:ubiquitous-language`, and `capability:grill-me` when the checkpoint
records those rounds.

Before continuing, verify:

- checkpoint final HEAD matches current HEAD
- current branch is a fresh non-main `codex/self-improve-*` branch for the current loop
- no dirty non-ignored worktree state remains unpreserved
- preflight scan did not report suspected secrets or huge generated artifacts
- no push is required
- baseline policy hash or baseline ref is recorded
- `max_fix_attempts=5`
- continuation state is not blocked, or the operator explicitly cleared or overrode the block
- Activation State gates support continuation
- Resume Contract permits continuation
- Session Identity distinguishes Codex thread ids from BMAD Workspace Session ids
- Party Mode decisions refine an instantiated goal and did not create one silently

Resume from the next exact task. Do not restart discovery unless the checkpoint
says the plan is invalid.
````
