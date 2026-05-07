---
title: "Optimization Loop Party Mode Gate"
description: Candidate-specific Party Mode gate output for the thin-v1 optimization-loop
---

# Optimization Loop Party Mode Gate

## Gate Setup

- Candidate or bundle: `optimization-loop`
- Gate depth: `standard`
- Participants: John (PM), Winston (Architect), Amelia (Dev), Paige (Tech Writer)

## Required Output

- Goal:
  Create a reusable thin-v1 `optimization-loop` that accepts an explicit
  operator-declared optimization goal, runs one finite optimization cycle, and
  ends with evidence plus an operator-facing recommendation rather than
  recurring automatically.
- Success metric:
  A one-shot run must end in a defensible observable state:
  - `improved` with comparable before/after metric evidence, or
  - `blocked` with explicit evidence that no safe credible next move exists.
  `proposed` remains a distinct advisory outcome and does not count as metric
  improvement.
- Chosen run mode: `one-shot`
- Recommended BMAD route:
  1. operator declares direct goal, target, metric, and action mode
  2. baseline evidence is captured from allowed surfaces
  3. one highest-leverage safe action is selected
  4. the action is applied or explicitly proposed
  5. before/after or blocked evidence is recorded
  6. the run ends with a continuation recommendation, not auto-continuation
- Main risks:
  - admission contract too loose
  - metric declaration too weak to support comparison
  - applied vs proposed outcome ambiguity
  - inconsistent evidence surfaces between baseline and after-state
  - blocked-stop rationale becoming a vague escape hatch
  - scope creep into diagnosis plus redesign plus roadmap in one cycle
- Required evidence:
  - direct operator goal statement
  - explicit optimization target
  - explicit metric declaration
  - baseline evidence from a declared capture method
  - rationale for the selected highest-leverage action
  - explicit outcome class: `improved`, `proposed`, `blocked`, or `invalid-input`
  - after-state evidence when a change is applied
  - blocked rationale when no action is taken
  - continuation recommendation with operator next step
- Open questions:
  - minimum valid operator input for thin-v1 admission
  - exact minimum metric declaration fields
  - whether `goal_ref` can ever replace a direct goal for this candidate
  - how `highest-leverage` is justified in operator-visible language
  - what evidence threshold is required for `blocked`
- Deferred questions:
  - recurring mode semantics
  - scheduler, queue, or nested loop behavior
  - slash-command UX
  - richer `goal_ref` ergonomics
  - multi-target or multi-metric optimization

## Decision Boundary

- Advisory consensus:
  Do not author the `WorkflowBundle` yet. Step 5 must tighten the admission
  contract, metric/evidence contract, and outcome classes first.
- Operator stop/go decision:
  Proceed to Step 5 only. Re-evaluate bundle readiness after the Workspace
  setup/evidence contract is written.
- Next planning action:
  Revise the brief and write the Workspace setup/evidence contract so that
  bundle authoring cannot fossilize fuzzy goal or success rules.
