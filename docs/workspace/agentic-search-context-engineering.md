---
title: 'Agentic Search for Context Engineering'
description: Planning and Forge guidance for context-source tool taxonomy and authority boundaries
---

# Agentic Search for Context Engineering

Agentic Search for Context Engineering defines how BMAD and Capability Pack
Forge describe search tools that may inform an agent before implementation.
The scope is planning metadata, generated artifacts, registry guidance, and
deterministic validation. It does not add live adapters.

## Domain Claim

Context engineering is primarily the design of agentic search behavior:
deciding which context source to search, which tool to use, what query or
command to issue, and how to judge whether retrieved context is sufficient.

BMAD artifacts, declared contracts, public behavior tests, and quality gates
remain the authority for readiness. Context tools inform the operator; they do
not decide readiness.

## Tool Taxonomy

| Tool class | Context source | Core purpose | Parameter complexity |
| --- | --- | --- | --- |
| `file-search` | Local File System | Find repository, documentation, artifact, or source text through exact or structured local search. | Low |
| `skill-loading` | Agent Skills | Load detailed task instructions, examples, and constraints only when needed. | Low |
| `database-query` | Database | Retrieve, filter, validate, or aggregate structured records from a declared database source. | High |
| `web-search` | Web | Retrieve current or external information when public or online source attribution is required. | Medium |
| `memory` | Long-term Memory | Retrieve persistent continuity facts about prior interactions, preferences, or decisions. | Medium |
| `shell` | CLI-accessible Source | Inspect files, run deterministic commands, call CLIs, and gather repeatable command evidence. | High |

Each tool class must declare:

- core purpose
- trigger condition
- negative trigger condition
- parameter complexity
- authority boundary
- evidence boundary

## Authority Boundaries

Agentic Search metadata is advisory. The following surfaces are not verifier
input and not Workspace authority:

- retrieved context
- local tool availability
- Codex config or app-server state
- memory content
- web results
- database query output
- shell command output
- generated task packets

Capability Pack Forge may emit Agentic Search metadata into draft artifacts,
but it must not call live file, skill, database, web, memory, or shell tools as
part of the v1 JSON artifact path.

## Forge Touchpoints

Forge requests may include optional `agenticSearch` metadata:

```json
{
  "agenticSearch": {
    "domain": "Agentic Search for Context Engineering",
    "toolClasses": [
      {
        "class": "file-search",
        "toolName": "File Search",
        "corePurpose": "Find local BMAD artifacts and source text.",
        "triggerCondition": "Use for source-specific local evidence.",
        "negativeTriggerCondition": "Do not use when the authoritative source is web, memory, or database evidence.",
        "parameterComplexity": "low",
        "authorityBoundary": "Retrieved file context is advisory only; not verifier input and not Workspace authority.",
        "evidenceBoundary": "Record local path and deterministic command evidence only."
      }
    ]
  }
}
```

The canonical implementation requires all six tool classes in the registry
order: `file-search`, `skill-loading`, `database-query`, `web-search`,
`memory`, and `shell`.

## Validation Expectations

Deterministic checks must catch broken tool-stack definitions before a pack is
treated as implementation-ready:

- `node test/test-capability-pack-forge.js`
- `node test/test-ubiquitous-language.js`
- `node test/test-workspace-contracts.js`
- `npm run validate:skills`
- `npm run validate:refs`

Before push readiness, run `npm ci && npm run quality` on the exact checkout
being pushed.

## Official Codex Evidence

The Agentic Search profile cites official Codex documentation for operator
affordances only:

- [Codex config reference](https://developers.openai.com/codex/config-reference#configtoml)
- [Codex app-server API overview](https://developers.openai.com/codex/app-server#api-overview)
- [Codex memories configuration](https://developers.openai.com/codex/memories#configuration)

These references describe available operator surfaces. They do not grant BMAD
verifier authority, Workspace authority, runtime authority, or permission to
call live services inside deterministic tests.

## Non-goals

- No live tool adapters.
- No new Workspace commands.
- No changes to `verify-capability`.
- No hidden execution.
- No deterministic tests that require live database, web, memory, or shell
  state beyond the local checkout commands they run.
- No broad Capability Forge rewrite.
