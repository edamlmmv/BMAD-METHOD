---
title: "Question 8: Capability Lifecycle And Variants"
description: "Spec-shaped BMAD answer for capability lifecycle, variants, invalid capability repair, and living schema boundaries"
---

# Question 8: Capability Lifecycle And Variants

## Decision

BMAD SHOULD model capability lifecycle and variants as Capability Registry
knowledge in v1, not as verifier trust evidence.

The registry may know that a capability is valid, invalid, deprecated, removed,
superseded, experimental, stale, or needs repair. It may also know that several
concrete variants belong to one logical capability family.

That knowledge helps an operator answer:

- what capability exists;
- which exact capability id should be requested;
- why a capability is unavailable, stale, invalid, or deprecated;
- which variant replaces it;
- what repair work is needed.

It MUST NOT change the Q7 verifier boundary.

Final rule:

> Capability lifecycle helps humans and authoring tools navigate support.
> Verifier trust still comes from one self-contained Capability Request JSON and
> exact declared capability compatibility under BMAD Workspace authority.

## Workspace Facts Checked

The active Workspace CLI reports `bmad` version `6.6.0`.

`bmad workspace --help` exposes `verify-capability` as a read command:

```text
verify-capability  read  verify one declared capability request against supplied contract JSON
```

The current v1 Capability Request contract accepts:

```text
kind
schemaVersion
request
capabilities
observations
```

The current v1 declared capability shape remains:

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

There are no lifecycle or variant fields in the current verifier trust path.

## Party Mode Consensus

Winston, Amelia, Paige, and John converged on the same split:

- the current contract should not change verifier semantics.
- Lifecycle and variants belong in catalog or registry knowledge.
- A future contract may add lifecycle and variant fields, but only through
  explicit, versioned, deterministic schema changes and tests.
- No parent capability, variant family, alias, lifecycle status, named-tool
  knowledge, Graphify artifact, Codex config, or runtime availability may widen
  verifier trust.

The useful tension was:

- Winston and John favored no current verifier change.
- Amelia wanted future lifecycle enforcement for invalid or removed
  declarations.
- Paige reconciled both: the current contract keeps lifecycle advisory; a
  future contract may enforce lifecycle only when lifecycle fields are part of
  the self-contained verified evidence or an explicitly named deterministic
  registry snapshot.

## Ubiquitous Language

| Term | Meaning |
| --- | --- |
| Capability Registry | BMAD-owned catalog knowledge about capabilities, variants, lifecycle state, repair hints, and replacement paths. |
| Capability Family | Logical capability grouping, such as Graphify repo graph evidence or Codex manual execution readiness. |
| Capability Variant | Concrete independently requestable capability id for one implementation shape. |
| Lifecycle State | Catalog status such as `valid`, `invalid`, `deprecated`, `removed`, `superseded`, `experimental`, `stale`, or `needs-repair`. |
| Repair Hint | Stable explanation and next action for making an invalid or stale capability supported again. |
| Replacement Path | Explicit `replaces`, `replacedBy`, or `supersededBy` relationship between capability ids. |
| Living Schema | Versioned schema that may evolve by committed migrations and deterministic validation, not by ambient runtime mutation. |
| Registry Snapshot | Explicit, versioned, deterministic registry artifact that may be reviewed, tested, and referenced. |
| Verifier Evidence | The self-contained Capability Request JSON evaluated by `verify-capability`. |

## Current Scope

In the current contract, lifecycle and variants are advisory catalog knowledge
only.

`bmad workspace verify-capability --input <capability-request-json>` MUST remain
read-only, deterministic, and self-contained.

In the current contract, verification MUST continue to succeed only when:

- `request.id` exactly and case-sensitively matches one embedded
  `capabilities[]` declaration;
- requested session type is allowed;
- requested `group`, `provider`, and `interface` match when supplied;
- requested `writes` are declared and not forbidden;
- requested `outputs` are declared.

In the current contract, verifier success MUST NOT come from:

- Capability Registry entries;
- lifecycle state;
- parent capability ids;
- capability family membership;
- variant relationships;
- aliases;
- fuzzy matching;
- fallback matching;
- named-tool knowledge;
- Codex config;
- live Graphify state;
- static Graphify artifacts unless they are already part of explicit advisory
  request content;
- BMad Customize resolver evidence;
- Workspace Session artifacts.

`requiresGrant: true` remains advisory. Grant Guard remains separate authority.

## Capability Registry Role

The Capability Registry MAY record lifecycle and variant facts like this:

```json
{
  "schemaVersion": "1.0.0",
  "capabilities": [
    {
      "id": "evidence.graph.repo-intake",
      "capabilityFamily": "evidence.graph.repo-intake",
      "variant": "graphify.v7.static-artifacts",
      "lifecycleState": "valid",
      "lastReviewedAt": "2026-05-06",
      "knownFailures": [],
      "replaces": [],
      "replacedBy": null,
      "repairRef": null
    },
    {
      "id": "evidence.graph.repo-intake.live-mcp",
      "capabilityFamily": "evidence.graph.repo-intake",
      "variant": "graphify.v7.live-mcp",
      "lifecycleState": "experimental",
      "lastReviewedAt": "2026-05-06",
      "knownFailures": [
        {
          "id": "GRAPHIFY_LIVE_STATE_NOT_VERIFIER_EVIDENCE",
          "message": "Live Graphify MCP may aid navigation but is not verifier trust evidence."
        }
      ],
      "replaces": [],
      "replacedBy": null,
      "repairRef": "docs/workspace/reviews/question-7-codex-graphify-capability-context.md"
    }
  ]
}
```

This registry entry is operational knowledge. It can drive authoring flows,
repair work, migration prompts, review checklists, and catalog reports.

It is not proof that a Capability Request is safe.

## Variant Rule

Variants MUST be separate concrete capability ids.

A Capability Request for one id MUST NOT pass because a sibling variant exists.

Example:

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
      "id": "evidence.graph.repo-intake.graphify-v7-static",
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
  ]
}
```

This MUST fail in the current contract because `request.id` is
`evidence.graph.repo-intake`, while the only embedded declaration is
`evidence.graph.repo-intake.graphify-v7-static`.

The operator or authoring tool may suggest the concrete variant id. The verifier
MUST NOT infer it.

## Invalid Capability Rule

Invalid capabilities SHOULD remain visible.

BMAD should not hide invalid or stale capability knowledge, because visibility
creates repair pressure. A capability can be:

- known but invalid;
- known but deprecated;
- known but stale;
- known but missing evidence;
- known but unsupported in the current runtime;
- known but replaced by another exact id.

That state belongs in the Capability Registry, Review Manifest, Result Ledger,
issue/story references, or other explicit Workspace evidence.

It MUST NOT become verifier trust evidence in the current contract.

Recommended lifecycle states:

| State | Meaning | Current verifier treatment |
| --- | --- | --- |
| `valid` | Catalog says the capability is currently supported by committed evidence. | Advisory only. No trust effect. |
| `invalid` | Known capability fails contract, evidence, or validation requirements. | Advisory only. No trust effect. |
| `deprecated` | Still known, but should be replaced. | Advisory only. No trust effect. |
| `removed` | No longer supported as a request target. | Advisory only. No trust effect. |
| `superseded` | Replaced by another exact capability id. | Advisory only. No trust effect. |
| `experimental` | Exploratory or not yet accepted as stable support. | Advisory only. No trust effect. |
| `stale` | Evidence or validation is out of date. | Advisory only. No trust effect. |
| `needs-repair` | Repair work is known and tracked. | Advisory only. No trust effect. |

## Living Schema Rule

The schema may be living. It must not be magical.

Living schema changes MUST happen through:

- committed schema files;
- committed fixtures;
- deterministic migration scripts;
- machine-readable changelog entries;
- public behavior tests;
- `npm run quality` evidence before push.

Living schema changes MUST NOT happen through:

- live network fetches during verification;
- local Codex config;
- `_bmad/custom`;
- BMad Customize resolver state;
- live Graphify MCP;
- Graphify watch mode;
- runtime cache state;
- app-server APIs;
- automatic repair during `verify-capability`;
- remote mutable registry input.

A future contract may allow verifier policy to reject lifecycle states such as
`invalid`, `removed`, or `deprecated`, but only when:

- the lifecycle field is part of the self-contained Capability Request JSON; or
- the request explicitly names a deterministic registry snapshot; and
- the future schema declares how lifecycle affects `ok`; and
- tests prove there is no parent, variant, alias, or fuzzy trust inference.

## Future Extension Shape

A future declaration MAY add fields like:

```json
{
  "id": "evidence.graph.repo-intake.graphify-v7-static",
  "capabilityFamily": "evidence.graph.repo-intake",
  "variant": "graphify.v7.static-artifacts",
  "lifecycleState": "valid",
  "lifecycleReason": "Static graph artifacts are repository-contained and advisory.",
  "introducedIn": "workspace-capability-contract-2.0.0",
  "lastValidatedAt": "2026-05-06",
  "knownFailures": [],
  "replaces": [],
  "replacedBy": null
}
```

The future extension MUST preserve these invariants:

- `id` remains the verifier match key unless a new schema explicitly replaces
  it with an equally exact key.
- `capabilityFamily` groups variants for authoring and reports only.
- `variant` identifies implementation shape; it is not fallback matching.
- `lifecycleState` may reject a matched declaration only under explicit future
  policy.
- `knownFailures` and `repairRef` guide repair; they do not satisfy evidence.
- `replacedBy` may guide authoring; it does not auto-upgrade a request.
- unknown trust-affecting fields fail closed.

## Graphify Example

When the user says "use Graphify", BMAD may resolve these facts:

```text
Capability family: evidence.graph.repo-intake
Variant candidate: evidence.graph.repo-intake.graphify-v7-static
Lifecycle state: valid
Runtime status: available, blocked, partial, or unknown
Graph evidence state: valid, missing, stale, invalid, or advisory-only
Verifier verdict: true or false from exact request/declaration compatibility
```

If `evidence.graph.repo-intake.live-mcp` exists as an experimental variant,
Graphify MCP may help navigation. It MUST NOT become verifier evidence unless a
future explicit contract allows it through deterministic, committed evidence.

## Codex Example

When the user says "use Codex", BMAD may resolve:

```text
Capability family: executor.codex
Variant candidate: executor.codex.manual
Lifecycle state: valid
Runtime status: available, blocked, partial, or unknown
Verifier verdict: true or false from exact request/declaration compatibility
Grant status: separate Grant Guard authority
```

Codex config may show that subagents, hooks, MCP servers, or slash commands are
available. That remains operator affordance. It does not create or validate a
capability variant.

## Acceptance Criteria

1. Current documentation states that lifecycle and variants are Capability
   Registry knowledge, not verifier trust evidence.

2. Current verifier behavior remains exact and case-sensitive on `request.id`.

3. A request for a capability family id fails when only a sibling variant id is
   embedded in `capabilities[]`.

4. A valid variant request passes only when the exact variant id is embedded and
   all declared constraints match.

5. Registry lifecycle states such as `invalid`, `deprecated`, `removed`,
   `experimental`, `stale`, and `needs-repair` are visible for operator repair
   and reporting.

6. Current verifier output does not read or depend on registry lifecycle state
   unless that state is included only as advisory `observations[]`.

7. Future lifecycle enforcement is specified as an explicit schema extension,
   not an implicit current behavior change.

8. Schema migration is deterministic, committed, tested, and reviewable.

9. Invalid capabilities are not hidden; they carry repair hints or replacement
   paths.

10. Replacement paths guide authoring only; they do not auto-upgrade verifier
    requests.

## Test Example

### CAP-Q8-001: Variant Sibling Does Not Satisfy Parent Request

```js
it("does not verify a parent capability id through a sibling variant declaration", () => {
  const request = {
    kind: "bmad-workspace-capability-request",
    schemaVersion: 1,
    request: {
      id: "evidence.graph.repo-intake",
      sessionType: "normal",
      group: "evidence.graph",
      provider: "graphify",
      interface: "repo-intake",
      writes: ["workspace-session/intake"],
      outputs: ["repo-intake.json", "graph.json", "provenance.json"]
    },
    capabilities: [
      {
        id: "evidence.graph.repo-intake.graphify-v7-static",
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
        code: "CAPABILITY_VARIANT_ADVISORY",
        message: "Registry knows a sibling Graphify variant, but verifier requires exact id match."
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

### CAP-Q8-002: Exact Variant Request Passes

```js
it("verifies an exact variant id when declared constraints match", () => {
  const request = {
    kind: "bmad-workspace-capability-request",
    schemaVersion: 1,
    request: {
      id: "evidence.graph.repo-intake.graphify-v7-static",
      sessionType: "normal",
      group: "evidence.graph",
      provider: "graphify",
      interface: "repo-intake",
      writes: ["workspace-session/intake"],
      outputs: ["repo-intake.json", "graph.json", "provenance.json"]
    },
    capabilities: [
      {
        id: "evidence.graph.repo-intake.graphify-v7-static",
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
    ]
  };

  const verdict = verifyCapabilityRequest(request);

  expect(verdict.ok).toBe(true);
  expect(verdict.observations).toContainEqual(
    expect.objectContaining({ code: "CAPABILITY_DECLARATION_MATCHED" })
  );
});
```

## Red Green Refactor

Red:

- Add `CAP-Q8-001` proving a parent/family id cannot verify through a sibling
  variant declaration.

Green:

- Keep exact `request.id` matching. No verifier change should be needed if v1 is
  already strict. If a regression exists, fix only the exact-match path.

Refactor:

- Extract future registry terms into docs or schema comments only after public
  behavior tests are green.
- Do not add lifecycle enforcement to v1 verifier.

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
