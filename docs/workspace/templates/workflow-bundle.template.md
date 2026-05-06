---
title: "Workflow Bundle Template"
description: Template for repo-owned one-shot and recurring loop workflow bundles
---

# Workflow Bundle

## Identity

- Bundle id:
- Display name:
- Purpose:

## Goal Input Contract

- Direct operator goal required:
- `goal_ref` allowed:
- `scope` allowed:
- Input precedence:
- Refusal message:

## Success Criteria

- Primary success metric:
- Stop conditions:
- Blocked conditions:

## Recommended BMAD Route

- Primary route from `bmad-help`:
- Optional supporting skills:

## Party Mode Gate Prompt

- Gate depth recommendation: `light|standard|deep`
- What Party Mode must answer:
- What remains operator decision:

## Template Contract

- `prompt_template`:
- `resume_prompt_template`:
- `checkpoint_template`:
- Required variables:
- Allowed outputs:
- Side-effect boundary: no runtime semantics, no scheduler behavior, no hidden execution

## Loop Run Modes

- One-shot guidance:
- Recurring guidance:

## Workspace Evidence Guidance

- Optional `bmad-workspace` touchpoints:
- Result evidence:
- Closeout evidence:

## Slash Hook Design

- `/workflow-start` mapping:
- `/loop-start` mapping:
- `/loop-resume` mapping:
- `/loop-plan` mapping:
- Operator-assist-only reminder:
