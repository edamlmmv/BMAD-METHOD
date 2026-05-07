---
title: "Tool Leverage Review Prompt"
description: Planning prompt template for deciding use, skip, or enhance
---

# Tool Leverage Review Prompt

Capability Improvement Toolkit prompt for deciding whether existing BMAD skills,
repo scripts, MCPs, browser affordances, automation, or manual evidence should
be used, skipped, or enhanced before adding new work. Use the OpenAI developer docs MCP
for OpenAI developer-product work when current docs are required.

Finish with one Tool-Leverage Decision Record (TLDR). TLDR is not authority to
invoke hidden tools, recommend new MCPs, create goals, or expand scope.

## Inputs

- User goal:
- Available BMAD skills:
- Repo scripts:
- MCPs:
- Browser affordances:
- Automation:
- Existing evidence:
- Constraints:

## Review Steps

1. Inventory existing skills, scripts, docs, MCPs, and manual evidence before
   proposing new work.
2. Classify each candidate as use / skip / enhance.
3. Prefer existing deterministic repo scripts and local evidence over new live
   tools when they answer the goal.
4. Record fallback paths when a tool is skipped or blocked.
5. Select exactly one TLDR decision: `enough`, `underused`, `overused`, or
   `blocked`.

## Output

| Candidate | Decision: use / skip / enhance | Evidence | Reason | Fallback |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Tool-Leverage Decision Record

```yaml
task: string
available_capabilities: string[]
candidate_tools: string[]
selected_capability: string | null
chosen_tools: string[]
decision: enough | underused | overused | blocked
rationale: string
why_enough: string
underused_risk: string
overused_risk: string
blocked_tools: string[]
fallback: string
next_action: string
evidence: string[]
```

## Decision

- Recommendation: approve / revise / block
- Existing tools to use:
- Tools to avoid:
- Enhancement follow-up:
