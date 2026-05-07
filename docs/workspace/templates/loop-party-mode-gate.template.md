---
title: "Loop Party Mode Gate Template"
description: Generic Party Mode planning gate output for future loop-specific plans
---

# Loop Party Mode Gate

## Required Output

- Gate depth: `light|standard|deep`
- participants:
- round_count:
- votes:
- decision: `accept | change | block`
- required_changes:
- deferred_decisions:
- blockers:
- operator_stop_go:
- next_action:
- evidence_refs:
- final_replacement_plan_ref:
- Goal:
- Success metric:
- Chosen run mode: `one-shot|recurring`
- Recommended BMAD route:
- Capability Improvement Toolkit skills/templates considered:
- Skill/template decisions:
- Main risks:
- Required evidence:
- Open questions:
- Deferred questions:
- Consensus: `accept|change|block`

## Consensus Semantics

`required_changes` revise before proceed; `deferred_decisions` need owner/trigger; `operator_stop_go` is advisory only; `final_replacement_plan_ref` points to the final full `<proposed_plan>` or checkpoint/local ref. Consensus output summarizes decisions only. Do not include raw agent transcripts unless the user explicitly asks. A `change` decision requires a revised full replacement `<proposed_plan>` plus one verification round, not patch notes.

## Decision Boundary

Advisory only: no runtime authority, tool install, MCP config mutation, static analysis, or implementation scope without an explicit user goal.
