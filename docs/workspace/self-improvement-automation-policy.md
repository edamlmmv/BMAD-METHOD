---
title: "Self-Improvement Automation Policy Compatibility Note"
description: Compatibility pointer from legacy SI-AUTO policy names to generic BMAD loop policy
---

# Self-Improvement Automation Policy Compatibility Note

The authoritative policy for `bmad-self-improve` is now
[BMAD Loop Automation Policy](./bmad-loop-automation-policy.md).
`bmad-self-improve` is a predefined `bmad-loop` instance with BMAD-specific
defaults and no baked goal.

Existing references to `SI-AUTO-*` remain compatibility aliases for
`LOOP-AUTO-*`:

| Alias | Generic invariant |
| --- | --- |
| `SI-AUTO-001` | `LOOP-AUTO-001` |
| `SI-AUTO-002` | `LOOP-AUTO-002` |
| `SI-AUTO-003` | `LOOP-AUTO-003` |
| `SI-AUTO-004` | `LOOP-AUTO-004` |
| `SI-AUTO-005` | `LOOP-AUTO-005` |
| `SI-AUTO-006` | `LOOP-AUTO-006` |
| `SI-AUTO-007` | `LOOP-AUTO-007` |
| `SI-AUTO-008` | `LOOP-AUTO-008` |
| `SI-AUTO-009` | `LOOP-AUTO-009` |
| `SI-AUTO-010` | `LOOP-AUTO-010` |
| `SI-AUTO-011` | `LOOP-AUTO-011` |
| `SI-AUTO-012` | `LOOP-AUTO-012` |
| `SI-AUTO-013` | `LOOP-AUTO-013` |

New policy edits should target `docs/workspace/bmad-loop-automation-policy.md`.
Self-improve instance edits should target `src/core-skills/bmad-self-improve`
and must preserve the generic loop safety contract.
