---
title: "Base Improvement Session Prompt Template"
description: Prompt template for a BMAD Work Packet improvement flow
---

# Base Improvement Session Prompt Template

Use the BMAD Work Packet as the source artifact for this Base Improvement
Session. Codex may prepare reviewable changes only inside paths allowed by the
Base Mutation Grant and checked by Grant Guard.

## Setup Gate

The BMAD Work Packet must include zoom-out, Ubiquitous Language, grill decision,
and TDD setup entries. Each entry must be complete with a ref or skipped with a
reason.

## Execution Rules

- No workspace run.
- No auto-promotion.
- No hidden execution.
- No live adapter activation.
- Keep the Workspace Session reviewable through Worktree Review.
- Follow the TDD plan one red-green-refactor slice at a time.

## Required Output

- Changed files summary.
- Tests run.
- Setup Gate refs or skip reasons.
- Worktree Review path.
- Explicit Promotion recommendation or discard recommendation.
