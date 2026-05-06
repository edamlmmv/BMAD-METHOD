---
title: "Question 10: Final Specification Assembly"
description: "Spec-shaped BMAD answer for regenerating the final capability evidence gates specification from accepted questions, reviews, commits, and validation evidence"
---

# Question 10: Final Specification Assembly

## Question

How should the final regenerated specification be assembled from the branch
review, accepted question answers, Party Mode decisions, BMad Customize
considerations, Codex context, Graphify context, and Workspace evidence without
creating a second source of truth?

## Decision

The final specification SHOULD be a reviewable product and architecture
specification, not a runtime authority.

It should consolidate the accepted decisions from Q7 through Q10 into one
implementation-ready document, but it MUST preserve the authority split:

- Workspace code, tests, command contracts, and templates define current
  behavior.
- The Capability Contract and Capability Request fixtures define declared
  compatibility.
- BMad Customize guides authoring and resolver evidence.
- Codex and Graphify knowledge remains operator affordance or advisory evidence
  unless committed and tested.
- Party Mode and Grill-Me decisions are design rationale, not executable
  authority.

Final rule:

> The final spec tells BMAD what to build, test, and review. It does not make
> Workspace read new runtime state, grant permission, promote support, or trust
> local configuration.

## Source Priority

When sources disagree, the final spec MUST resolve them in this order:

| Priority | Source | Treatment |
| --- | --- | --- |
| 1 | Current code, tests, CLI help, and command contracts | Current behavior authority. |
| 2 | Workspace Capability Contract and Capability Request template | Declared capability authority. |
| 3 | Accepted Q7, Q8, Q9, and Q10 specs | Product and architecture decisions to carry forward. |
| 4 | Original review docs and per-commit squash disposition | Traceability and correction evidence. |
| 5 | BMad Customize docs and source skill guidance | Authoring and customization semantics. |
| 6 | Codex and Graphify docs | Tool capability context and advisory constraints. |
| 7 | Party Mode, Grill-Me, and operator notes | Rationale, objections, and accepted decisions. |

No lower-priority source may override a higher-priority trust boundary.

## Ubiquitous Language

| Term | Meaning |
| --- | --- |
| Final Specification | Consolidated doc that defines the intended capability evidence gates design and implementation requirements. |
| Source Priority | Rule for resolving conflict between docs, tests, review notes, tool docs, and conversation decisions. |
| Normative Requirement | Testable `MUST`, `MUST NOT`, `SHOULD`, or `MAY` statement with clear behavioral scope. |
| Traceability Appendix | Commit-by-commit or source-by-source mapping that explains why the final requirement exists. |
| Decision Record | Accepted answer or Party Mode consensus that changed the final spec. |
| Implementation Slice | Small testable unit of work that can be completed without changing unrelated Workspace authority. |
| Validation Bundle | Commands and captured outcomes used to show the spec or implementation is still coherent. |
| Drift Guard | Test, checklist, or validator that fails when docs, code, fixtures, or command contracts diverge. |
| Non-Authority Context | Helpful operator or authoring context that cannot grant trust, writes, runtime availability, or support status. |

## Final Spec Shape

The regenerated final specification SHOULD use this structure:

```text
1. Title, scope, branch, base, review date, and source inputs
2. Executive decision
3. Non-negotiable trust boundaries
4. Ubiquitous language
5. Component roles
6. Capability Request and verifier contract
7. Named-tool resolution for Codex, Graphify, Workspace, and Customize
8. Capability Registry, lifecycle, variants, and living schema
9. Support promotion, demotion, repair, and minimum evidence
10. BMad Customize authoring guidance and no-hand-TOML correction
11. Graphify evidence and runtime boundary
12. Codex operator affordance boundary
13. Acceptance criteria
14. Required tests and validation bundle
15. Implementation slices
16. Per-commit squash disposition
17. Open questions and future scope
```

The main body SHOULD be normative and concise. Long per-commit analysis SHOULD
live in an appendix so implementation readers can find requirements first.

## Required Decisions To Carry Forward

The final spec MUST carry forward these accepted decisions:

| Decision | Source |
| --- | --- |
| Tool-use knowledge improves operator affordance; verifier trust comes only from self-contained Capability Request JSON and declared compatibility. | Q7 |
| Codex config is runtime context, not Workspace authority. | Q7 |
| Graphify static artifacts may be advisory graph evidence; live Graphify, MCP, watch, hooks, cache, and regeneration are not verifier inputs. | Q7 |
| BMad Customize avoids hand-authoring exposed per-skill TOML, but is not verifier trust evidence. | Q7 |
| Capability lifecycle and variants are current Capability Registry knowledge, not current verifier trust evidence. | Q8 |
| Variants are separate exact capability ids; no parent, sibling, alias, fuzzy, or fallback matching. | Q8 |
| Invalid or stale capabilities stay visible with repair hints or replacement paths. | Q8 |
| Living schema evolves through committed, deterministic, tested migrations only. | Q8 |
| A capability becomes supported only through an evidence package, not `ok: true` alone. | Q9 |
| Minimum evidence includes positive fixtures, negative fixtures, boundary tests, docs, validator owners, and quality evidence. | Q9 |
| Runtime availability, Result Ledger, Review Manifest, Closeout, Customize resolver output, Codex config, and Graphify live state cannot promote support by themselves. | Q9 |

## Current Non-Goals

The final spec MUST NOT introduce:

- a Workspace runtime execution engine;
- scheduler, watcher, daemon, or background worker behavior;
- automatic repair during `verify-capability`;
- automatic capability support promotion;
- parent or variant fallback matching;
- central config generation as BMad Customize current behavior;
- Workspace verifier reads from `_bmad/custom`;
- Workspace verifier reads from Codex config;
- Workspace verifier calls to Graphify or app-server APIs;
- hidden install, refresh, restore, replay, merge, or apply behavior;
- Review Manifest, Result Ledger, Closeout, or Archive as approval authority.

## Regeneration Rules

The final spec SHOULD be regenerated by editing a committed Markdown artifact,
not by creating runtime config.

Regeneration MUST:

- preserve accepted decisions unless contradicted by current code/tests or a new
  accepted decision;
- cite the source input for each major requirement;
- convert prose into testable normative requirements;
- keep examples marked as examples, not behavior claims;
- mark future work as future scope, not current behavior;
- keep exact command names, fixture paths, and validator owners aligned with the
  repo;
- keep current behavior labels out of historical release-version language;
- avoid bare URLs and markdownlint failures;
- avoid adding untested runnable commands.

Regeneration MUST NOT:

- infer authority from conversation alone;
- turn Party Mode consensus into implementation without tests;
- copy large external docs into the spec;
- silently drop per-commit concerns;
- convert advisory Graphify or Codex context into verifier input;
- introduce hand-authored TOML examples where BMad Customize should guide
  authoring.

## Implementation Slices

The final spec SHOULD decompose implementation into slices like:

| Slice | Goal | First Evidence |
| --- | --- | --- |
| Verifier Hardening | Validate embedded `capabilities[]` shape and preserve JSON-only isolation. | Public verifier tests for malformed declarations and forbidden dependencies. |
| Customize Guidance | Add authoring guidance for Capability Request fixtures and exposed TOML surfaces. | Skill validation plus resolver evidence examples. |
| Named Tool Profiles | Describe how "use Graphify" and "use Codex" resolve to profile, runtime, and verifier facts. | Docs tests and boundary examples. |
| Lifecycle Registry | Add advisory registry metadata for lifecycle, variants, repairs, and replacements. | Registry schema tests that prove no verifier trust inference. |
| Support Evidence Package | Add promotion and demotion evidence checks. | Tests requiring positive, negative, and boundary evidence. |
| Release Guards | Extend checklist and validator owner map. | `npm run test:workspace` and release checklist assertions. |

Each slice SHOULD have one public failing behavior test before implementation.

## Acceptance Criteria

1. Final spec includes Q7, Q8, Q9, and Q10 decisions without contradicting
   current Workspace command contracts.

2. Final spec keeps `verify-capability` JSON-only and read-only.

3. Final spec distinguishes current behavior from future scope without
   historical release-version labels.

4. Final spec includes tests in the minimum evidence package.

5. Final spec includes Graphify and Codex examples that keep runtime
   availability separate from verifier trust.

6. Final spec includes BMad Customize guidance that avoids hand-authored TOML
   where exposed customization surfaces exist.

7. Final spec preserves invalid and stale capabilities as visible repairable
   support states.

8. Final spec defines support promotion and demotion without creating automatic
   promotion behavior.

9. Per-commit review disposition remains available as traceability.

10. Validation bundle passes before the final spec is treated as ready for
    implementation.

## Test Examples

### CAP-Q10-001: Final Spec Does Not Claim Runtime Authority

```js
it("keeps final spec language out of Workspace runtime authority", () => {
  const spec = readMarkdown("docs/workspace/reviews/final-capability-evidence-gates-spec.md");

  expect(spec).toContain("verify-capability");
  expect(spec).toContain("self-contained Capability Request JSON");
  expect(spec).not.toContain("workspace run");
  expect(spec).not.toContain("automatic support promotion");
  expect(spec).not.toContain("Graphify MCP as verifier input");
});
```

### CAP-Q10-002: Final Spec Carries Accepted Decisions

```js
it("carries accepted question decisions into the regenerated final spec", () => {
  const spec = readMarkdown("docs/workspace/reviews/final-capability-evidence-gates-spec.md");

  for (const phrase of [
    "Tool-use knowledge improves operator affordance",
    "Variants are separate exact capability ids",
    "A capability becomes supported only through an evidence package"
  ]) {
    expect(spec).toContain(phrase);
  }
});
```

### CAP-Q10-003: Final Spec Keeps Traceability

```js
it("keeps per-commit traceability as an appendix", () => {
  const spec = readMarkdown("docs/workspace/reviews/final-capability-evidence-gates-spec.md");

  expect(spec).toContain("Per-Commit Squash Disposition");
  expect(spec).toContain("cdfdb600e");
  expect(spec).toContain("Add capability verifier");
});
```

## Red Green Refactor

Red:

- Add a docs contract test that fails until the final regenerated spec carries
  Q7 through Q10 decisions and forbidden-runtime language.

Green:

- Regenerate the final spec with the smallest structure that satisfies accepted
  decisions, traceability, and validator expectations.

Refactor:

- Move long commit tables to appendices only after the main normative body is
  stable.
- Consider generated traceability tables only if the generator is committed,
  deterministic, and covered by tests.

Targeted validation:

```bash
bmad workspace verify-capability --input docs/workspace/templates/capability-request.template.json
npm run test:workspace
npm run validate:refs
npm run validate:skills
npm run lint:md
```

Full gate before push:

```bash
npm ci
npm run quality
```

