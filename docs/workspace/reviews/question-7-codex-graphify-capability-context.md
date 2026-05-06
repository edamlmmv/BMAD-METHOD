---
title: "Question 7: Codex, Graphify, and Capability Context"
description: "Spec-shaped BMAD answer for how Codex config, Graphify artifacts, BMad Customize, and Workspace capability verification interact"
---

# Question 7: Codex, Graphify, and Capability Context

## Decision

BMAD SHOULD let an agent know how to use named tools such as Codex,
Graphify, BMad Customize, and BMAD Workspace.

That tool-use knowledge MUST NOT become verifier trust evidence.

When a user says "use Graphify" or "use Codex", the agent MAY resolve a
capability profile, runtime availability, commands, limits, and repair
guidance. The agent MUST keep those facts separate from the
`bmad workspace verify-capability` verifier verdict.

Final rule:

> Tool-use knowledge improves operator affordance. Verifier trust comes only
> from the self-contained Capability Request JSON and the declared capability
> compatibility rules under BMAD Workspace authority.

## Normative Scope

`bmad workspace verify-capability --input <capability-request-json>` MUST remain
a read-only, deterministic, self-contained declared-contract compatibility
check.

The verifier MUST evaluate only the submitted Capability Request JSON document.
It MUST NOT inspect ambient repo, user, runtime, app-server, Graphify, Codex, or
customization state.

`ok: true` MUST mean only:

> The request matched a declared capability by exact id and satisfied declared
> session, group, provider, interface, writes, forbidden writes, and outputs
> constraints.

`ok: true` MUST NOT mean:

- runtime availability;
- write authorization;
- grant approval;
- install success;
- graph freshness;
- graph correctness;
- Codex config compatibility;
- Workspace Session permission;
- Evidence Gate v1 pass state;
- Result Ledger proof;
- quality gate success.

`requiresGrant: true` MUST remain advisory in the verifier verdict.
`bmad workspace authorize` remains the grant authority.

## Ubiquitous Language

| Term | Meaning |
| --- | --- |
| Capability Request | Self-contained JSON input with `kind: bmad-workspace-capability-request`, `request`, `capabilities`, and optional advisory `observations`. |
| Declared capability | Capability Contract entry with stable id, provider, interface, allowed sessions, writes, forbidden writes, outputs, and upstream-gap flag. |
| Capability Contract | BMAD-owned compatibility surface for what an adapter may provide to Workspace. |
| Verifier verdict | JSON output from `verify-capability`; current kind is `bmad-workspace-capability-verdict`. |
| Operator affordance | Local tool/help/runtime surface that helps the operator act, but does not authorize Workspace behavior. |
| Advisory observation | Non-authoritative context carried in `observations[]`; may explain reviewed docs or ignored runtime context. |
| Graph evidence | Existing repository or Workspace graph artifact context, advisory unless explicitly referenced by a Workspace gate. |
| Resolver evidence | Output from BMad customization resolution, useful for behavior-review context, not verifier input. |
| Runtime availability | Whether a tool can run here now. This is separate from verifier trust. |
| Tool-use knowledge | Agent knowledge of commands, limits, and usage patterns for a named tool. |

## Component Roles

| Component | Role | Boundary |
| --- | --- | --- |
| BMad Customize | Authoring and education control plane. Helps users understand exposed `customize.toml` surfaces, sparse overrides, team/user placement, resolver output, and Capability Request fields. | MUST NOT be verifier input. MUST NOT make `verify-capability` read `_bmad/custom`, hand-authored TOML, or customization merge internals. |
| BMAD Workspace | Workspace authority for Capability Request validation, declared capability matching, Grant Guard, Evidence Index, Result Ledger, closeout, archive, and review evidence. | `verify-capability` is declared-contract compatibility only; other Workspace authorities remain separate. |
| Codex | Operator affordance and manual executor context. Codex config may expose model, sandbox, approvals, hooks, apps, MCP servers, skills, agents, profiles, web search, and permissions. | Codex config MUST NOT certify capability truth, widen declared support, authorize writes, or become verifier input. |
| Graphify | Graph producer and graph navigation aid. Static `graphify-out/` artifacts and Workspace graph intake can guide discovery, navigation, and evidence review. | Live Graphify, MCP, watch mode, hooks, cache, manifest, and regeneration MUST NOT be verifier inputs. |

## Evidence Taxonomy

| Evidence class | Examples | Verifier treatment |
| --- | --- | --- |
| Verifier input | Submitted Capability Request JSON, embedded declared capability entries, optional advisory observations. | MAY affect `ok` only through request/declaration compatibility checks. |
| Development acceptance evidence | Committed/pinned docs, capability contract docs, fixtures, positive/negative tests, quality gates. | REQUIRED to justify implementation and review, but not read ambiently by the verifier. |
| Advisory context | Codex config docs, Codex app-server docs, Graphify docs, Graphify `graphify-out/` artifacts, Evidence Index, Result Ledger refs, resolver evidence. | MAY appear in `observations` or review notes. MUST NOT by itself make `ok: true`. |
| Forbidden verifier input | `_bmad/custom`, `customize.toml`, local `~/.codex/config.toml`, project `.codex/config.toml`, app-server APIs, live Graphify state, Graphify MCP, Graphify watch/hooks/cache, Workspace Session artifacts. | MUST NOT be read or required by `verify-capability`. |
| Generated output | Verifier verdict, diagnostics, warnings, observations. | Output only. MUST NOT become source evidence for itself. |

## Named-Tool Resolution

Named-tool requests SHOULD resolve in this order:

1. Resolve the named tool to a BMAD capability profile or declared capability
   candidate.
2. Check runtime availability separately, such as installed command, enabled
   Codex feature, available MCP server, graph artifact state, or missing
   dependency.
3. Run or inspect `bmad workspace verify-capability` only with an explicit
   Capability Request JSON fixture.
4. Report three separate facts:
   - what the agent knows how to use;
   - what can run here now;
   - what the verifier verdict proves.

The agent MUST NOT collapse these facts into "available means verified".

Recommended status vocabulary:

| Status | Use |
| --- | --- |
| `profileStatus` | `found`, `missing`, `generated`, `stale`, `invalid` |
| `runtimeStatus` | `available`, `blocked`, `partial`, `unknown` |
| `graphEvidenceState` | `valid`, `missing`, `stale`, `invalid`, `advisory-only` |
| `verifierVerdict.ok` | `true` or `false` from Workspace verifier only |

## Verifier Contract

The current declared capability shape remains:

```text
id
group
provider
interface
allowedInNormalSession
allowedInBaseImprovement
requiresGrant
writes
forbiddenWrites
outputs
upstreamGapProofRequired
```

The current verifier verdict shape remains:

```json
{
  "kind": "bmad-workspace-capability-verdict",
  "schemaVersion": 1,
  "ok": true,
  "request": {},
  "matchedDeclaration": {},
  "errors": [],
  "warnings": [],
  "observations": []
}
```

Matching MUST remain exact and case-sensitive on `request.id`.

The verifier MUST NOT grant compatibility through aliases, tags, descriptions,
group fallback, provider fallback, trimming, lowercasing, fuzzy matching,
semantic matching, runtime introspection, Graphify state, Codex config, or
customization state.

Requested `writes` and `outputs` MUST remain exact declared subset checks. No
glob, prefix, or path-containment rule may be inferred.

## Codex Rule

Codex config is runtime context, not Workspace authority.

Codex config MAY help an operator know:

- whether multi-agent work may be available;
- whether hooks may exist;
- whether an MCP server may be configured;
- whether web search, apps, or image tools may be enabled;
- whether sandbox, network, or approval settings might block execution.

Codex config MUST NOT:

- certify a declared capability;
- widen declared capability support;
- override `forbiddenWrites`;
- satisfy Grant Guard;
- satisfy Evidence Gate v1;
- satisfy a verifier match;
- mutate Workspace state;
- become required input for `verify-capability`.

## Graphify Rule

Graphify graph artifacts are navigation and graph evidence aids, not verifier
trust roots.

Graphify MAY help an agent:

- discover source files;
- understand dependency or concept neighborhoods;
- choose searches;
- draft or refresh a capability profile;
- explain why a repository area might matter;
- identify stale or missing graph evidence for repair.

Graphify MUST NOT be called ad hoc by `verify-capability`.

The verifier MUST NOT depend on:

- live Graphify execution;
- Graphify MCP server activation;
- Graphify watch mode;
- Graphify hooks;
- Graphify cache or manifest state;
- automatic graph regeneration;
- global graph state.

Static graph artifacts MAY be referenced in advisory observations or Workspace
graph evidence, but a stale, schema-invalid, missing, or provenance-free graph
artifact MUST NOT promote an unverified capability claim.

If valid declared capability evidence exists and a Graphify artifact is also
present, the verifier verdict MUST follow the declared capability compatibility
rules. Graphify context MAY be reported as advisory or ignored; it MUST NOT be
required for the match.

## BMad Customize Rule

BMad Customize is how authors should avoid hand-authoring per-skill TOML, but it
is not how verifier trust is established.

BMad Customize MAY:

- guide a user to the correct per-skill `[agent]` or `[workflow]` authoring
  surface;
- explain declared capability fields;
- start from `docs/workspace/templates/capability-request.template.json`;
- help prepare sparse overrides;
- show resolver output;
- record resolver evidence as manual review context.

BMad Customize MUST NOT:

- invent fields not exposed by a skill's `customize.toml`;
- make `verify-capability` read `_bmad/custom`;
- make verifier trust depend on hand-authored TOML;
- generate central config in v1;
- treat resolver evidence as a Capability Request substitute.

## Acceptance Criteria

1. Given the canonical Capability Request template, `bmad workspace
   verify-capability --input docs/workspace/templates/capability-request.template.json`
   returns `kind: bmad-workspace-capability-verdict`, `schemaVersion: 1`, and
   `ok: true`.

2. Given a valid Graphify declared capability request for
   `evidence.graph.repo-intake`, the verifier returns `ok: true` when the
   request and embedded declaration match by exact id and declared constraints.

3. Given local `_bmad/custom` files appear, disappear, or change, the same
   Capability Request JSON returns the same verifier verdict.

4. Given local Codex config appears, disappears, or changes, the same Capability
   Request JSON returns the same verifier verdict.

5. Given live Graphify state appears, disappears, or changes, the same
   Capability Request JSON returns the same verifier verdict.

6. Given a Graphify artifact is present only as an advisory observation, `ok`
   follows declared capability compatibility, not graph artifact validity.

7. Given a claim is backed only by Graphify artifact text and has no matching
   declared capability, the verifier returns `ok: false` with
   `CAPABILITY_NOT_DECLARED`.

8. Given a request asks for a forbidden write, the verifier returns `ok: false`
   with `WRITE_FORBIDDEN`.

9. Given a request asks for an undeclared output, the verifier returns
   `ok: false` with `OUTPUT_NOT_DECLARED`.

10. Given a matching capability has `requiresGrant: true`, verifier output keeps
    `ok: true` when all compatibility checks pass and emits an advisory
    `CAPABILITY_REQUIRES_GRANT` observation. Grant approval remains the job of
    `bmad workspace authorize`.

11. Given Workspace Session artifacts exist, `verify-capability` does not read
    them. Evidence Index and Result Ledger entries may be advisory context, not
    verifier inputs.

12. Public tests assert `verify-capability` has no dependency on `_bmad/custom`,
    Codex config, app-server APIs, live Graphify state, Graphify MCP/watch/hooks,
    or Workspace Session artifacts.

## Example: "Use Graphify"

User says:

```text
Use Graphify to understand this repo.
```

Agent resolves:

```text
Target tool: Graphify
Capability candidate: evidence.graph.repo-intake
Provider: graphify
Interface: repo-intake
Profile status: found
Runtime status: available or unknown
Graph evidence state: valid, missing, stale, invalid, or advisory-only
Verifier input: explicit Capability Request JSON only
Verifier verdict: compatibility only
```

Safe agent response:

```text
Graphify capability profile found.
Runtime: available.
Graph evidence: stale.
Verifier: declared repo-intake capability can be checked only through a
self-contained Capability Request JSON.

I can use Graphify for navigation and source discovery. I will not treat stale
graph output as verifier evidence.
```

## Example Capability Request

```json
{
  "kind": "bmad-workspace-capability-request",
  "schemaVersion": 1,
  "request": {
    "id": "evidence.graph.repo-intake",
    "sessionType": "normal",
    "group": "evidence.graph",
    "provider": "graphify",
    "interface": "repo-intake",
    "writes": ["workspace-session/intake"],
    "outputs": ["repo-intake.json", "graph.json", "provenance.json"]
  },
  "capabilities": [
    {
      "id": "evidence.graph.repo-intake",
      "group": "evidence.graph",
      "provider": "graphify",
      "interface": "repo-intake",
      "allowedInNormalSession": true,
      "allowedInBaseImprovement": true,
      "requiresGrant": false,
      "writes": ["workspace-session/intake"],
      "forbiddenWrites": ["workspace-base"],
      "outputs": ["repo-intake.json", "graph.json", "provenance.json"],
      "upstreamGapProofRequired": false
    }
  ],
  "observations": [
    {
      "code": "GRAPHIFY_DOCS_REVIEWED",
      "message": "Graphify docs reviewed for advisory tool-use context only.",
      "details": {
        "sourceUrl": "https://github.com/safishamsi/graphify#full-command-reference"
      }
    }
  ]
}
```

Expected verifier meaning if compatible:

```text
ok: true
Meaning: request matches declared capability constraints.
Not meaning: Graphify is installed, graph is fresh, MCP is running, or writes
are authorized outside Workspace rules.
```

## Example Tests

### CAP-Q7-001: Positive Compatibility

```js
it("verifies a self-contained Graphify repo-intake capability request", () => {
  const verdict = verifyCapabilityRequest(graphifyRepoIntakeRequest);

  expect(verdict).toMatchObject({
    kind: "bmad-workspace-capability-verdict",
    schemaVersion: 1,
    ok: true,
    matchedDeclaration: {
      id: "evidence.graph.repo-intake",
      provider: "graphify",
      interface: "repo-intake"
    },
    errors: []
  });
});
```

### CAP-Q7-002: Graphify Artifact Cannot Declare Capability

```js
it("does not verify a capability claim backed only by Graphify artifact text", () => {
  const request = {
    kind: "bmad-workspace-capability-request",
    schemaVersion: 1,
    request: {
      id: "graphify.auto-approve-repo-trust",
      sessionType: "normal",
      provider: "graphify"
    },
    capabilities: [
      {
        id: "evidence.graph.repo-intake",
        group: "evidence.graph",
        provider: "graphify",
        interface: "repo-intake",
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ["workspace-session/intake"],
        forbiddenWrites: ["workspace-base"],
        outputs: ["repo-intake.json", "graph.json", "provenance.json"],
        upstreamGapProofRequired: false
      }
    ],
    observations: [
      {
        code: "GRAPHIFY_ARTIFACT_PRESENT",
        message: "graphify-out/graph.json mentioned this capability.",
        details: { path: "graphify-out/graph.json" }
      }
    ]
  };

  const verdict = verifyCapabilityRequest(request);

  expect(verdict.ok).toBe(false);
  expect(verdict.errors).toContainEqual(
    expect.objectContaining({ code: "CAPABILITY_NOT_DECLARED" })
  );
});
```

### CAP-Q7-003: Forbidden Inputs Do Not Affect Verdict

```js
it("returns the same verifier verdict when local runtime/config artifacts exist", () => {
  const before = verifyCapabilityRequest(canonicalCapabilityRequest);

  createLocalFile("_bmad/custom/bmad-agent-dev.toml", "[agent]");
  createLocalFile(".codex/config.toml", "sandbox_mode = \"danger-full-access\"");
  createLocalFile("graphify-out/graph.json", "{\"claims\":[\"extra capability\"]}");
  createLocalFile(".bmad-workspace/session/intake/graph.json", "{}");

  const after = verifyCapabilityRequest(canonicalCapabilityRequest);

  expect(after).toEqual(before);
});
```

### CAP-Q7-004: Required Grant Is Advisory To Verifier

```js
it("reports requiresGrant as advisory without turning verifier into Grant Guard", () => {
  const verdict = verifyCapabilityRequest(codexManualExecutorRequest);

  expect(verdict.ok).toBe(true);
  expect(verdict.observations).toContainEqual(
    expect.objectContaining({ code: "CAPABILITY_REQUIRES_GRANT" })
  );
});
```

## Red-Green-Refactor Plan

Red:

- Add public tests for Graphify repo-intake positive compatibility.
- Add public tests proving Graphify artifact observations cannot create a
  missing capability.
- Add public tests proving `_bmad/custom`, Codex config, live Graphify state,
  and Workspace Session artifacts do not change the verdict.

Green:

- Keep `verifyCapabilityRequest` pure over the input JSON.
- Keep exact id and subset matching.
- Emit advisory observations only from submitted `observations[]` and matched
  declaration facts.

Refactor:

- Extract forbidden-input fixture helpers only after public behavior tests pass.
- Keep result shape stable.
- Keep BMad Customize guidance and Workspace verifier contract separate.

Targeted validation:

```bash
bmad workspace verify-capability --input docs/workspace/templates/capability-request.template.json
npm run validate:skills
```

Full gate before push:

```bash
npm ci
npm run quality
```
