---
title: "Context7 Google Apps Script Planning"
description: Advisory source register for Google Apps Script Context7 docs evidence
---

# Context7 Google Apps Script Planning

## Summary

BMAD Workspace uses `host.mcp.context7.google-apps-script.docs` for scoped
Google Apps Script docs evidence through Context7. The generic
`host.mcp.context7.docs` capability remains the route for non-Apps-Script docs.
Google Apps Script Context7 Docs helps BMAD agents find the right Apps Script
guide, reference, and sample context while planning work. It does not configure
a Context7 MCP server, read credentials, prove runtime availability, change
Workspace verifier behavior, install Apps Script triggers, deploy Apps Script,
or authorize repository writes.

Job to be done: when BMAD agents plan Google Apps Script work, they can select a
named Apps Script docs capability, verify its request offline, generate a
capability pack draft from local evidence, and mark docs/reference/samples
coverage or gaps.

## Capability Surface

| Capability | Evidence Output | Use For | Boundary |
| --- | --- | --- | --- |
| `host.mcp.context7.google-apps-script.docs` | `context7-google-apps-script-operator-evidence.json` | Apps Script guide, reference, and samples docs evidence | No MCP config, no live fetch proof, no Apps Script runtime/deploy proof, no verifier schema change |
| `host.mcp.context7.docs` | `context7-docs-operator-evidence.json` | Generic Context7 docs evidence | Not Apps Script-specific routing |

Capability Pack Forge may generate a draft pack named `Google Apps Script
Context7 Docs` from local evidence. Generated artifacts are review drafts only:
`capability-pack.json`, `capability-request.json`,
`operator-evidence-template.json`, `customization-draft.toml`,
`skill-outline.md`, `readiness-checklist.md`, and `codex-task-packet.md`.

## Source Register

Context7 library IDs are the URL path of the Context7 library page, per the
[Context7 API Guide](https://context7.com/docs/api-guide). Record the reviewed
date with any operator evidence because these are external docs sources.

| label | Context7 library ID | Context7 URL | Upstream | Use For | Do Not Use For |
| --- | --- | --- | --- | --- | --- |
| `apps-script-guide` | `/websites/developers_google_apps-script` | [Google Apps Script](https://context7.com/websites/developers_google_apps-script) | <https://developers.google.com/apps-script/> | Conceptual docs, product overview, setup and guide context | Runtime proof, verifier input, local MCP configuration proof |
| `apps-script-reference` | `/websites/developers_google_apps-script_reference` | [Google Apps Script Reference](https://context7.com/websites/developers_google_apps-script_reference?contextType=info) | <https://developers.google.com/apps-script/reference> | API signatures, service constraints, reference checks | Runtime proof, verifier input, local MCP configuration proof |
| `apps-script-samples` | `/googleworkspace/apps-script-samples` | [Google Apps Script Samples](https://context7.com/googleworkspace/apps-script-samples) | <https://github.com/googleworkspace/apps-script-samples> | Implementation examples, sample project patterns, code pattern checks | Runtime proof, verifier input, local MCP configuration proof |

## Information Map

```text
host.mcp.context7.google-apps-script.docs
  -> Apps Script Context7 source IDs
  -> context7-google-apps-script-operator-evidence.json notes
  -> capability request observations
  -> Capability Pack Forge draft artifacts
  -> Workspace planning docs and BMAD skill routing
```

Registry entries say what exists. Planning templates say how agents use the
sources. Capability declarations stay minimal and verifier-compatible.

## Planning Guidance

- Prefer `apps-script-guide` for conceptual Apps Script docs and product-level
  setup context.
- Prefer `apps-script-reference` for API names, method signatures, service
  constraints, and reference claims.
- Prefer `apps-script-samples` for implementation patterns and sample code
  shape after API claims have been checked against docs/reference evidence.
- Route Apps Script-specific docs planning to
  `host.mcp.context7.google-apps-script.docs`.
- Route generic Context7 docs planning to `host.mcp.context7.docs`.
- If Context7 is unavailable or not configured locally, record an evidence gap
  instead of implying live docs were fetched.

## Negative Proof Matrix

| Claim Source | Expected Handling |
| --- | --- |
| Context7 page exists | Advisory docs source only; not runtime proof. |
| Context7 source ID appears in a fixture | Planning/evidence metadata only; not live fetch proof. |
| Forge emits `Google Apps Script Context7 Docs` | Draft capability-pack artifact only; not runtime authority. |
| Local Codex MCP host config | Operator context only; not verifier input. |
| API key environment state | Record only `CONTEXT7_API_KEY=set|unset`; never value. |
| `appsscript.json` or Apps Script manifest | Target repo context only; not Context7 capability proof. |
| Apps Script trigger or deployment state | Runtime state only; not Workspace verifier input. |
| `_bmad/custom` reminders | Authoring guidance only; not verifier authority. |

## Validation

Required targeted checks:

- `bmad workspace verify-capability --input docs/workspace/templates/capability-request.context7-google-apps-script.example.json`
- `npm run test:workspace`
- `npm run test:capability-pack-forge`
- `npm run validate:refs`
- `npm run validate:graphify-manifests`
- `npm run validate:skills`

Before push, run `npm ci && npm run quality` on the exact checkout and `HEAD`
being pushed.
