---
title: "BMAD Workspace Operator Guide"
description: Manual operator sequence for Workspace Sessions
---

# BMAD Workspace Operator Guide

This guide describes the manual Workspace Session sequence. Commands either read
stored state or write explicit evidence artifacts. They never infer approval,
execute stored commands, restore state, replay evidence, merge, promote, or call
live adapters.

## Manual Flow

**PSEUDO:** Replace placeholders before running. These commands show order, not
copy-paste-ready values.

```bash
# PSEUDO
bmad workspace launch --repo <target-repo> --goal <goal-file> --runtime-root <root>
bmad workspace intake <session-id> --runtime-root <root>
bmad workspace packet <session-id> --runtime-root <root> --workflow <skill[:action]> \
  --zoom-out-ref <ref> --ubiquitous-language-ref <ref> \
  --grill-decisions-ref <ref> --tdd-plan-ref <ref>
bmad workspace status <session-id> --runtime-root <root>
bmad workspace evidence <session-id> --runtime-root <root>
bmad workspace handoff <session-id> --runtime-root <root>
bmad workspace result <session-id> --runtime-root <root> --input <result-json> --result-id <id>
bmad workspace review <session-id> --runtime-root <root>
bmad workspace closeout <session-id> --runtime-root <root> --input <closeout-json> --closeout-id <id>
bmad workspace archive <session-id> --runtime-root <root> --output <archive-dir>
bmad workspace verify-archive <archive-dir>
bmad workspace diff --left <archive-dir> --right <archive-dir>
```

## Codex Goals and Slash Commands

When Codex goals are available, the operator may use `/goal` before or during a
Workspace Session to keep the active Codex thread objective visible. Put the
actual objective and acceptance criteria in the goal file passed to
`bmad workspace launch`, then record any Codex goal id, status, or decision as
manual evidence through Result Ledger or Closeout.

Future slash commands should follow the same rule: use them as operator aids,
record their useful outputs as BMAD evidence, and never treat them as hidden
execution, approval, restore, replay, merge, promotion, scheduler, watcher, or
live adapter activation.

## Fresh-Chat Prompt

Use [Fresh-Chat Workspace Prompt](./templates/fresh-chat-prompt.md) when a new
Codex thread should begin with Workspace guardrails, BMAD skill routing, and an
evidence plan before action. The prompt is an operator aid only; it does not
authorize hidden execution or Workspace mutation.

## Self-Improvement Prompt

Use [bmad-self-improve Codex Automation Runbook](./self-improvement-codex.md)
when Codex is improving BMAD skills, prompts, Workspace templates, or Codex
integration. `bmad-self-improve` supports a local Codex automation-capable loop
and a foreground operator run. The workflow requires fixed caps, Party Mode
before planning, Party Mode again before implementation, TDD, full quality
gates, compile/install evidence, Codex refresh evidence, local commits, and a
checkpoint before continuation. It never pushes, never runs implementation work on
`main`, and uses `docs/workspace/self-improvement-automation-policy.md` as the
external guard.

## Evidence Index

Use `evidence` when deciding what to inspect next. It reports artifact presence,
validation state, checksums, file sizes, source commands, and next manual
actions. Treat the output as evidence only, not permission to execute.

## Review Manifest

Use `review` after manual work to create both Worktree Review artifacts and
`review/review-manifest.json`. The manifest records review source refs, typed
checks, findings, decision state, and forbidden execution or promotion actions.
Treat it as review evidence only, not approval, scoring, merge authority, or a
workflow state machine.

## Archive Diff

Use `diff` after archives verify cleanly and before manual review. It compares
archive file inventories, status, packet, closeout, and Evidence Index data as
JSON. Treat the output as comparison evidence only, not a restore, replay, sync,
merge, promotion, or execution plan.

## Failure Handling

- Missing intake: run `intake`, then rebuild the packet.
- Missing packet: complete Setup Gate evidence and run `packet`.
- Stale intake or checksum drift: refresh evidence, then rebuild the packet.
- Missing review: run `review` before completed closeout.
- Missing or invalid Review Manifest: rerun `review` to rebuild typed review
  evidence.
- Invalid or secret-positive result or closeout: remove unsafe content manually
  and rerun `status` or `evidence`.
- Archive checksum mismatch: inspect the archive bundle and rerun
  `verify-archive`.
- Diff source or archive invalid: verify both archive bundles, then rerun
  `diff`.
