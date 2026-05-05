---
title: "Codex Self-Improvement Automation"
description: Operator-run BMAD self-improvement workflow for Codex
---

# Codex Self-Improvement Automation

Use this workflow when improving BMAD agents, skills, prompts, Workspace
templates, or Codex integration. It is operator-run automation: Codex executes a
repeatable prompt sequence, but no background process, scheduler, watcher,
hidden executor, live adapter, or auto-promotion loop exists.

## What It Does

The workflow runs:

1. Party Mode decision.
2. Plan.
3. Party Mode critique.
4. Revised plan.
5. TDD implementation.
6. Validation.
7. BMAD compile/install.
8. Codex refresh evidence.
9. Final checkpoint.

Party Mode may choose the target and revise the plan inside repo rules, tests,
and evidence gates. It cannot skip validation, overwrite unrelated work, or
bypass checkpoints.

## Operator Prompts

Use [Self-Improvement Codex Prompt](./templates/self-improvement-codex-prompt.md)
to start a run.

Use
[Self-Improvement Resume Prompt](./templates/self-improvement-codex-resume-prompt.md)
when context runs low or a fresh Codex chat continues the run.

Use
[Self-Improvement Checkpoint Template](./templates/self-improvement-checkpoint.template.md)
for durable run state under `{output_folder}/self-improvement/`.

## Compile and Install

Use the existing installer. A fresh project-local Codex install is:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes
```

An existing project-local Codex update is:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes --action update
```

The installer auto-adds `core`. Expected artifacts are:

- `_bmad/_config/manifest.yaml`
- `_bmad/_config/skill-manifest.csv`
- `.agents/skills/bmad-self-improve/SKILL.md`

Current user install can be refreshed with:

```bash
node tools/installer/bmad-cli.js install --directory /Users/edam --modules bmm --tools codex --yes --action update
```

The `~/.codex/skills` global install remains out of scope for v1 because
`global_target_dir` is configured for Codex but is not wired through the BMAD
installer CLI.

## Refresh Verification

The [Codex App Server skills contract](https://developers.openai.com/codex/app-server#skills)
states that `skills/list` supports `forceReload: true`, and that
`skills/changed` notifications are emitted when watched local skill files
change.

If app-server access exists, request `skills/list` for the current cwd with
`forceReload: true` and verify `bmad-self-improve` appears.

If app-server access is unavailable, record:

- installed skill path
- manifest row
- source and installed SHA-256 hashes
- one of `refresh: requires new chat`, `refresh: requires Codex restart`, or
  `refresh: unknown`

Do not claim hot reload unless the run verifies it.

## Quality Gate

Run targeted tests first. Before push, run this in the exact checkout being
pushed:

```bash
npm ci && npm run quality
```
