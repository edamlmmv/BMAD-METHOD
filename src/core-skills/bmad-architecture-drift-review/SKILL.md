---
name: bmad-architecture-drift-review
description: 'Runs an evidence-backed architecture drift review planning prompt. Use when code or plans may violate intended architecture boundaries and you need drift findings, impact, and fix path before implementation.'
---

# Architecture Drift Review

Capability Improvement Toolkit skill for planning-time architecture boundary
review. Use this skill to identify likely architecture drift from evidence and
review questions.

This skill does not perform static analysis, does not enforce policy, and does
not create implementation scope without an explicit user goal.

## Inputs

- User goal:
- Intended architecture docs:
- Module/package boundaries:
- Allowed dependencies:
- Known exceptions:
- Changed files:
- Relevant Workspace evidence:

## Execution

1. Confirm declared architecture exists. Stop if no declared architecture or no
   citeable evidence exists.
2. Compare intended boundaries with changed files and observed dependencies.
3. Record likely drift only when expected state and observed state can both be
   cited.
4. Separate boundary violations from style, taste, or general cleanup.
5. Propose one public behavior test/check for each high-confidence finding.

## Output

| Severity | Drift finding | Evidence | Impact | Fix path | Confidence | Proposed test/check |
| --- | --- | --- | --- | --- | --- | --- |
| blocker/warning/note |  |  |  |  |  |  |

## Decision

- Recommendation: approve / revise / block
- Existing tools to use:
- Manual review needed:
- Deferred deterministic checks:

