---
title: "Optimization Loop Guardrails"
description: Thin-v1 boundaries for the optimization-loop planning slice
---

# Optimization Loop Guardrails

This note freezes the non-negotiable boundaries for the `optimization-loop`
candidate before any bundle, config, or runtime work is authored.

## Fixed Boundaries

- `bmad-loop` remains the only runtime and execution contract.
- `optimization-loop` is a candidate loop instance, not a second runtime.
- `WorkflowBundle` stays passive: identity, goal contract, templates, and
  Workspace evidence guidance only.
- `LoopRunConfig` stays a sparse inherited mapping over exposed `[workflow]`
  fields only.
- BMAD Workspace stays a manual evidence ledger only. It never becomes hidden
  execution, approval, or recurrence authority.
- Thin-v1 for this candidate starts in `one-shot` mode only.

## Out Of Scope For Thin v1

- scheduler, queue, daemon, watcher, webhook, or background worker behavior
- slash-command implementation
- nested loop runtime or loop chaining semantics
- automatic continuation or recurrence productization
- new Workspace CLI commands
- hidden Workspace execution or live adapter behavior

## Planning Gate

- Do not author `WorkflowBundle` or thin `bmad-customize` mapping until the
  admission contract, metric evidence contract, and one-shot termination states
  are concrete.
- If those remain ambiguous after the Workspace setup/evidence contract is
  written, stop before Step 6.
