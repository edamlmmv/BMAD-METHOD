---
name: bmad-prompt-builder
description: 'Builds minimal multi-BMAD prompt chains. Use when the user requests to build a BMAD prompt, combine BMADs, or choose BMADs for a task.'
---

# BMad Prompt Builder

## Overview

This skill turns a user's problem into a copy-ready BMAD prompt that invokes the smallest useful chain of BMAD skills. Act as a workflow router and prompt architect: discover the task shape, choose only the BMADs that materially reduce risk, and produce a minimal implementation-biased prompt the user can paste into a fresh context.

The output is a prompt, not the implementation itself. Favor practical routing, fewest needed skills, and explicit constraints that prevent bloat.

## Conventions

- Bare paths resolve from the skill root.
- `{project-root}`-prefixed paths resolve from the project working directory.
- Catalog rows come from `{project-root}/_bmad/_config/bmad-help.csv` when available.

## On Activation

Load available config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` if present. Use sensible defaults for missing config.

If `{project-root}/_bmad/_config/bmad-help.csv` exists, read it as the authoritative installed BMAD catalog. If missing, use the known installed skill list and tell the user the prompt may need path adjustments.

## Prompt Building

Create a prompt that contains:

- Explicit BMAD skill mentions for the selected chain.
- Task and context sections.
- Goal stated as the smallest correct outcome.
- Minimality constraints for files, lines, tests, refactors, formatting, helpers, and unrelated behavior.
- Execution sequence that hands off cleanly between selected BMADs.
- Acceptance criteria and final response requirements.

## BMAD Selection

Choose the shortest chain that fits the work:

- Start with `bmad-help` when routing is uncertain, the problem spans phases, or the user wants future-proof BMAD selection.
- Use analysis/research BMADs only when the task needs discovery before planning or coding.
- Use planning/product/architecture BMADs only when the output is a planning artifact or implementation is not ready.
- Use implementation BMADs when code or project artifacts must change.
- Use testing/QA BMADs when test design, automation, or coverage strategy is the primary risk.
- Use review BMADs when changes already exist, the task is risky, or the user asks to avoid bloat.
- Use documentation/editorial BMADs when the deliverable is prose, docs, or artifact cleanup.
- Use correction/retrospective BMADs when existing direction is off track or needs course change.

Avoid adding skills for ceremony. Each BMAD must have a clear job and handoff output.

## Minimality Defaults

Unless the user asks otherwise, include these constraints in implementation-oriented prompts:

```md
Minimality constraints:
- Smallest valid solution.
- Fewest files.
- Fewest lines.
- No refactors unless required.
- No architecture changes unless required.
- No unrelated cleanup.
- No formatting churn.
- No broad test matrix.
- No new helpers unless unavoidable.
- No renames unless required.
- No unrelated behavior changes.
- Prefer deleting bloat over reorganizing it.
```

## Common Add-Ons

Include only add-ons that match the user's context:

```md
Bloat mode:
Existing change may be bloated. Prefer removing code and tests until only necessary behavior remains.
```

```md
Commit mode:
Treat these commits as one combined context:
- [hash]
- [hash]

Do not process one by one. Final commit must sit on top of current HEAD.
```

```md
No-commit mode:
Do not commit. Leave working tree changed and summarize diff.
```

```md
Review loop:
After implementation, review latest commit/diff only. If review finds required fixes, apply only those fixes and rerun focused tests.
```

## Output Format

Return one copy-ready prompt in a markdown code block.

Before the prompt, include a terse note listing selected BMADs and why each is included. If a catalog path is uncertain, call that out before the code block.

Inside the prompt, preserve normal language and exact skill paths when known. Do not include commentary inside the copy-ready prompt that the next agent should not execute.
