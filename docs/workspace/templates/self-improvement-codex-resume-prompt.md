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

Use the Foreground Resume Quickstart in `docs/workspace/self-improvement-codex.md`.

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Self-Improve consumes these shared capabilities when its run needs them:
- `capability:zoom-out` `zoom-out`: resume any bounded reframing decision only if the checkpoint says framing changed.
- `capability:tdd` `tdd`: preserve failing-test-first evidence and continue the next red-green-refactor slice.
- `capability:ubiquitous-language` `ubiquitous-language`: preserve canonical term decisions and check new wording against them.
- `capability:grill-me` `grill-me`: re-run only when assumptions changed, prior objections remain unresolved, or checkpoint risk is high.

First read:

- `docs/workspace/self-improvement-automation-policy.md`
- latest checkpoint
- `{output_folder}/self-improvement/automation.lock`
- effective automation schedule/config or explicit operator parameters
- current git branch and diff
- `git status --porcelain --untracked-files=all` output from the checkpoint
- dirty preflight scan result
- targeted test or validation output named in the checkpoint
- Activation State
- Resume Contract
- Session Identity

Resume from the next exact task. Do not restart discovery unless the checkpoint says the plan is invalid. Preserve Party Mode decisions unless they conflict with repo rules, tests, policy, or safety.

Before continuing, verify:

- current branch is a fresh non-main `codex/self-improve-*` branch
- branch was created for the current run before improvement edits
- no dirty non-ignored worktree state remains unpreserved
- preflight scan did not report suspected secrets or huge generated artifacts
- no push is required
- baseline policy hash or baseline ref is recorded
- `max_fix_attempts=5`
- continuation state is not blocked, or the operator explicitly cleared or overrode the block
- `activation_state.repo_quality` is `pass` before repo-ready claims
- `activation_state.repo_local_install` is `pass` before install-ready claims
- `activation_state.active_skill_hash` is `match` before active-ready claims
- `activation_state.refresh_state` is `known_good` before continuation
- `resume_contract.continuation_allowed` is true only when all Activation State gates pass
- `session_identity.classification` distinguishes Codex thread ids from BMAD Workspace Session ids

Before final response, record:

- implementation status
- tests run
- `npm ci && npm run quality` result on `HEAD` of the exact checkout if reached
- compile/install result
- Codex refresh result
- Activation State
- Resume Contract
- Session Identity
- local commit SHAs
- continuation decision
- next operator decision
- remaining risks
```
