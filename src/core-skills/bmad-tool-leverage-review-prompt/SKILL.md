---
name: bmad-tool-leverage-review-prompt
description: 'Runs a Capability Improvement Toolkit planning prompt. Use when deciding whether to use, skip, or enhance existing BMAD skills, repo scripts, MCPs, browser affordances, and automation before new work.'
---

# Tool Leverage Review Prompt

Template id: `tool-leverage-review-prompt`

Capability Improvement Toolkit prompt for deciding whether existing BMAD skills,
repo scripts, MCPs, browser affordances, automation, or manual evidence should
be used, skipped, or enhanced before adding new work.

This skill is planning-only. It does not install tools, call live MCPs, mutate
config, or create implementation scope without an explicit user goal.

It must finish with one Tool-Leverage Decision Record (TLDR). TLDR summarizes
tool sufficiency only; it is not authority to invoke hidden tools, recommend a
new official MCP, create goals, or expand implementation scope.

## Inputs

- User goal:
- Available BMAD skills:
- Repo scripts:
- MCPs:
- Browser affordances:
- Automation:
- Existing evidence:
- Constraints:

## Execution

1. Inventory existing skills, scripts, docs, MCPs, and manual evidence before
   proposing new work.
2. Classify each candidate as use / skip / enhance.
3. Prefer existing deterministic repo scripts and local evidence over new live
   tools when they answer the goal.
4. Use the OpenAI developer docs MCP for OpenAI developer-product work when
   current docs are required.
5. Record explicit fallback paths when a tool is skipped or blocked.
6. Select exactly one TLDR decision:
   - `enough`: current selected capability and tools are sufficient.
   - `underused`: existing available tools should be used more before
     adding/enhancing capabilities.
   - `overused`: tool use is heavier than the task warrants.
   - `blocked`: required tool evidence is unavailable, unsafe, or out of
     bounds.

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
