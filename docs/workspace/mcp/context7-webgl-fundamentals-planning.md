---
title: "Context7 WebGL Fundamentals Planning"
description: Advisory source register for WebGL Fundamentals Context7 docs evidence
---

# Context7 WebGL Fundamentals Planning

## Summary

BMAD Workspace uses `host.mcp.context7.webgl-fundamentals.docs` for scoped
WebGL Fundamentals docs evidence through Context7. The generic
`host.mcp.context7.docs` capability remains the route for other generic
Context7 docs.

Context7 WebGL Fundamentals Docs helps BMAD agents find WebGL fundamentals
material for shaders, buffers, textures, and rendering concepts. It does not
configure a Context7 MCP server, read credentials, prove runtime availability,
change Workspace verifier behavior, run WebGL, inspect browser GPU state, or
authorize repository writes.

Job to be done: when BMAD agents plan WebGL fundamentals work, they can select a
named docs capability, verify its request offline, generate a capability pack
draft from local evidence, and keep WebGL2 as an explicit upstream caveat.

## Capability Surface

| Capability | Evidence Output | Use For | Boundary |
| --- | --- | --- | --- |
| `host.mcp.context7.webgl-fundamentals.docs` | `context7-webgl-fundamentals-operator-evidence.json` | WebGL Fundamentals docs evidence | No MCP config, no live fetch proof, no WebGL runtime proof, no browser GPU state proof, no verifier schema change |
| `host.mcp.context7.docs` | `context7-docs-operator-evidence.json` | Generic Context7 docs evidence | Not WebGL Fundamentals-specific routing |

Capability Pack Forge may generate a draft pack named `Context7 WebGL
Fundamentals Docs` from local evidence. Generated artifacts are review drafts
only: `capability-pack.json`, `capability-request.json`,
`operator-evidence-template.json`, `customization-draft.toml`,
`skill-outline.md`, `readiness-checklist.md`, and `codex-task-packet.md`.

## Source Register

Context7 library IDs are the URL path of the Context7 library page. Record the
reviewed date with operator evidence because these are external docs sources.

| label | Context7 library ID | Context7 URL | Upstream | Use For | Do Not Use For |
| --- | --- | --- | --- | --- | --- |
| `webgl-fundamentals` | `/websites/webglfundamentals` | [WebGL Fundamentals](https://context7.com/websites/webglfundamentals) | <https://webglfundamentals.org> | WebGL fundamentals docs, shader concepts, buffers, textures, rendering fundamentals | Runtime proof, verifier input, local MCP configuration proof, WebGL2-specific claims without retrieved evidence |

Observed metadata on `2026-05-07`: Trust Score 9.5, 420,644 tokens, 3,855
snippets, and Context7 displayed an update age of 3 days, recorded as observed
update `2026-05-04`.

WebGL2 caveat: the upstream WebGL Fundamentals site points WebGL2 users to
<https://webgl2fundamentals.org>; no separate Context7 source was found during
review. Discovery aliases may mention WebGL2, but the canonical Context7 source
for this capability is `/websites/webglfundamentals`.

## Information Map

```text
host.mcp.context7.webgl-fundamentals.docs
  -> /websites/webglfundamentals
  -> context7-webgl-fundamentals-operator-evidence.json notes
  -> capability request observations
  -> Capability Pack Forge draft artifacts
  -> Workspace planning docs and BMAD skill routing
```

Registry entries say what exists. Planning templates say how agents use the
source. Capability declarations stay minimal and verifier-compatible.

## Planning Guidance

- Prefer `webgl-fundamentals` for shader concepts, buffers, textures, transforms,
  rendering fundamentals, and WebGL learning material.
- Route WebGL Fundamentals-specific docs planning to
  `host.mcp.context7.webgl-fundamentals.docs`.
- Route generic Context7 docs planning to `host.mcp.context7.docs`.
- For WebGL2 requests, use this capability only with the caveat that WebGL2 is
  an upstream pointer unless retrieved evidence names WebGL2 features, APIs, or
  upstream WebGL2 Fundamentals guidance.
- If Context7 is unavailable or not configured locally, record an evidence gap
  instead of implying live docs were fetched.

## Negative Proof Matrix

| Claim Source | Expected Handling |
| --- | --- |
| Context7 page exists | Advisory docs source only; not runtime proof. |
| Context7 source ID appears in a fixture | Planning/evidence metadata only; not live fetch proof. |
| Forge emits `Context7 WebGL Fundamentals Docs` | Draft capability-pack artifact only; not runtime authority. |
| Local Codex MCP host config | Operator context only; not verifier input. |
| API key environment state | Record only `CONTEXT7_API_KEY=set|unset`; never value. |
| WebGL runtime or browser GPU state | Runtime state only; not Workspace verifier input. |
| WebGL2 upstream site | Caveat and discovery context only; not a separate Context7 source. |
| `_bmad/custom` reminders | Authoring guidance only; not verifier authority. |

## Validation

Required targeted checks:

- `bmad workspace verify-capability --input docs/workspace/templates/capability-request.context7-webgl-fundamentals.example.json`
- `node test/test-capability-pack-forge.js`
- `node test/test-workspace-contracts.js`
- `npm run validate:refs`
- `npm run validate:graphify-manifests`
- `npm run validate:skills`

Before push, run `npm ci && npm run quality` on the exact checkout and `HEAD`
being pushed.
