---
name: bmad-code-optimization-refactor-plan-prompt
description: 'Prompt-only planning skill for language-agnostic code optimization refactor plans. Use when you need generic optimization principles, measurement-first tradeoffs, and safe improvement phases before implementation.'
---

# Code Optimization Refactor Plan Prompt

Template id: `code-optimization-refactor-plan-prompt`

Capability Improvement Toolkit prompt for planning safe, language-agnostic code
optimization refactors. This skill is planning-only. It uses local evidence refs
and optional Capability Pack Forge draft artifacts as advisory evidence. It
makes no live tool calls, performs no live profiling, does not edit files, does
not run commands, does not commit, does not deploy, does not write
`_bmad/custom`, and does not grant Workspace, verifier, Forge, MCP, or runtime
authority.

## Inputs

- Optimization target:
- Desired outcome:
- User-visible behavior to preserve:
- Local evidence refs:
- Baseline measurements or observed symptoms:
- Workload, data shape, or user path:
- Constraints:
- Current repo touchpoints:
- Optional Forge draft artifacts:
- Non-goals:
- Acceptance criteria:

## Execution

1. Confirm the optimization target, local evidence refs, and preserved behavior.
   If baseline evidence is missing, plan measurement before change.
2. Classify the goal: latency, throughput, memory, storage, cost, reliability,
   complexity, maintainability, or operability.
3. Separate bottleneck hypotheses from measured facts. Mark unmeasured claims as
   assumptions.
4. Prefer algorithm, data-flow, caching, batching, I/O, allocation, concurrency,
   and boundary reductions before micro-optimization.
5. Preserve correctness, readability, security, and operability unless the user
   explicitly accepts a documented tradeoff.
6. Require a public behavior preservation check and a measurement check before
   implementation.
7. Propose the smallest safe optimization that can prove value and roll back
   cleanly.
8. Route reusable optimization patterns to `bmad-capability-pack-forge` only as
   draft evidence packaging; do not invoke Forge or execute the packet.

## Output

### Objective

- Target:
- Desired outcome:
- Behavior to preserve:
- Non-goals:

### Evidence Used

| Ref | Type | Relevance | Boundary |
| --- | --- | --- | --- |
| local evidence ref | measurement / trace / docs / Forge / review / other |  | advisory only |

### Bottleneck Hypotheses

| Hypothesis | Evidence | Risk if wrong | Confidence |
| --- | --- | --- | --- |
|  |  |  | low/medium/high |

### Proposed Refactor Plan

| Phase | Change | Expected effect | Safety boundary | Validation |
| --- | --- | --- | --- | --- |
| 1 |  |  | no implementation authority |  |

### TDD And Measurement Plan

- Public behavior preservation check:
- Measurement before change:
- Smallest safe optimization:
- After-change comparison:
- Regression guard:

### Tradeoffs And Safety

- Correctness risk:
- Readability, security, and operability tradeoffs:
- Rollback path:
- Evidence still needed:

### Recommended Follow-Up

- Route: `bmad-self-improve` / `bmad-agent-dev` / `bmad-check-implementation-readiness` / `bmad-capability-pack-forge` / `bmad-workspace` / `none`
- Why:
- Manual next step:

## Decision

- Recommendation: approve / revise / block
- Required evidence before implementation:
- Deferred follow-up:
