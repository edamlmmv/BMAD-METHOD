---
title: "Optimization Loop Candidate Brief"
description: Candidate brief for the thin-v1 optimization-loop planning slice
---

# Optimization Loop Candidate Brief

## Candidate

- Candidate id: `optimization-loop`
- First run mode: `one-shot`
- Current status: planning candidate only

## User Job

The loop serves an operator who already knows what kind of optimization they
want and how it should be measured, but wants one bounded cycle that answers:

> Given this goal and metric, what is the best safe next improvement we can
> make right now, and what evidence proves the outcome?

## Thin-v1 Objective

Run exactly one bounded optimization cycle against one declared optimization
target and one declared metric. The cycle must end with one evidence-backed
outcome and an operator-facing recommendation, not automatic recurrence.

## Admission Contract Draft

Thin-v1 planning uses a stricter admission rule than generic `bmad-loop`.

Required at run admission:

- direct operator goal stated in plain language
- explicit optimization target
- explicit metric declaration
- bounded scope
- declared action mode: `apply-if-safe` or `propose-only`

Supplementary but not sufficient on their own:

- `goal_ref`
- `scope`

For this candidate, `goal_ref` and `scope` may support the run later, but they
do not replace a direct operator goal plus explicit target and metric.

## Metric Declaration Draft

A valid metric declaration must include:

- metric name
- improvement direction
- unit or rubric
- baseline capture method
- acceptable evidence surface

Example target classes are performance, quality, maintainability, or cost, but
thin-v1 does not ship metric-specific logic. The operator must name the target
and metric explicitly.

## One-Shot Outcome Model

Thin-v1 one-shot mode ends in exactly one outcome:

- `improved`: a bounded change was applied and a comparable before/after delta
  was recorded
- `proposed`: a concrete next improvement was produced but not applied; this is
  advisory completion, not improvement proof
- `blocked`: no safe credible action remained or no comparable evidence surface
  could support the action
- `invalid-input`: the admission contract was not satisfied

## Success Signal

Thin-v1 succeeds only when one of these is true:

- `improved` outcome with comparable before/after evidence against the declared
  metric
- `blocked` outcome with evidence strong enough to defend why no safe credible
  next move exists

`proposed` is allowed as an advisory completion class, but it is not counted as
metric improvement.

## Finite Stop Condition

Stop after one completed optimization cycle and one recorded outcome, or stop
earlier with `invalid-input`. Any continuation is an explicit operator decision
recorded later through Workspace evidence, never automatic loop behavior.

## Non-Goals

- no scheduler or recurring runtime in thin-v1
- no hidden execution
- no nested runtime loops
- no slash-command implementation
- no multi-target optimization in a single cycle
