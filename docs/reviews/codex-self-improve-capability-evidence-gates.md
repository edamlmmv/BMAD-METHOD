---
title: "Codex Self-Improve Capability Evidence Gates Review"
description: "Commit-by-commit BMad Customize architecture review for codex/self-improve-capability-evidence-gates"
---

# Review: codex/self-improve-capability-evidence-gates

Scope: every commit returned by `git log --reverse main..codex/self-improve-capability-evidence-gates`.

Lens: whether `bmad-customize` could improve the commit by avoiding hand-authored TOML or clarifying the customization boundary.

Party Mode voices used: Winston (architecture), Amelia (implementation/TDD), Paige (documentation structure).

## Architecture Correction

Keep `bmad-customize` as an authoring and education control plane, not a runtime source for Workspace capability verification.

The durable boundary is:

- `bmad-customize` may author sparse `_bmad/custom/{skill}.toml` or `_bmad/custom/{skill}.user.toml` files only for exposed per-skill `[agent]` or `[workflow]` surfaces.
- Central config customization is outside `bmad-customize` v1.
- Workspace capability verification starts from `docs/workspace/templates/capability-request.template.json`.
- `bmad workspace verify-capability` verifies one self-contained Capability Request JSON fixture.
- The verifier must not read `_bmad/custom`, `customize.toml`, local Codex config, app-server APIs, live Graphify output, or hand-authored TOML.

Suggested code correction:

- Add a regression test proving the capability verifier is config-blind.
- Build a valid capability request JSON fixture.
- Add conflicting `_bmad/custom/*.toml`, `customize.toml`, and fake Codex config in the temp tree.
- Monkeypatch file reads or otherwise fail the test if verifier code touches forbidden paths.
- Assert the verdict follows the explicit JSON fixture only.

## Zoom-Out Map

- `src/core-skills/bmad-customize/SKILL.md`: defines per-skill TOML override authoring, central config out-of-scope, and capability verification authoring-only boundary.
- `src/core-skills/bmad-workspace/SKILL.md`: defines `verify-capability` as self-contained JSON contract check.
- `tools/workspace/capability-verifier.js`: reads the explicit `--input` JSON and delegates verification.
- `tools/workspace/contracts.js`: matches the request against declarations embedded in the JSON fixture.
- `docs/workspace/templates/capability-request.template.json`: canonical authoring starting point.

## Per-Commit Review

| Commit | Category | `bmad-customize` leverage | Architecture correction |
| --- | --- | --- | --- |
| `5b0c66f5b` Implement BMAD prompt builder | Workspace prompt builder | No: prompt generation is not a per-skill override surface. | Keep generated prompt artifacts separate from `_bmad/custom`; no TOML path. |
| `6223d81c0` Merge branch `main` of [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Merge | No. | No architecture correction. |
| `1f74a17c1` chore: refresh BMAD workspace state | Workspace state | No: coordination state is not customization. | Preserve as state evidence; do not route through TOML. |
| `b50f9fee8` docs: add BMAD workspace distro artifacts | Workspace docs | No: distro docs describe Workspace artifacts. | Keep artifact examples JSON/Markdown; no customization dependency. |
| `6922602f0` Merge branch `main` of [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Merge | No. | No architecture correction. |
| `028c9c671` docs: add workspace distro v1 backlog | Backlog docs | No. | Backlog may mention `bmad-customize` only as future authoring aid, not runtime source. |
| `378ea4024` wip | Commit hygiene | No. | Rename or squash before merge; no TOML correction. |
| `6ad93e44a` feat: add workspace distro contract validation | Workspace contracts | No: contract validation belongs to Workspace schema. | Keep validation over explicit artifacts; do not read customization files. |
| `36127a8e3` docs: mark workspace distro S1 complete | Status docs | No. | No architecture correction. |
| `154778903` feat: add workspace distro CLI help | Workspace CLI | No. | CLI help should point to explicit JSON/paths, not TOML customization. |
| `fdcee942d` docs: mark workspace distro S2 complete | Status docs | No. | No architecture correction. |
| `ada39dd0d` feat: add workspace distro launch | Workspace launch | No: session launch is not per-skill behavior. | Keep launch authority in CLI args/grants. |
| `9069f9611` docs: mark workspace distro S3 complete | Status docs | No. | No architecture correction. |
| `49d408082` docs: fix workspace distro evidence hashes | Evidence docs | No. | Hash fixes stay artifact-level. |
| `0456fc556` feat: add workspace distro repo intake | Repo intake | No. | Intake should read repo/session artifacts only. |
| `7dff286d3` docs: mark workspace distro S5 complete | Status docs | No. | No architecture correction. |
| `a11c93a2b` feat: add workspace distro packet freshness guard | Packet freshness | No. | Freshness guard belongs to packet/intake timestamps and hashes. |
| `53d884b3b` docs: mark workspace distro S6 complete | Status docs | No. | No architecture correction. |
| `20bc4d188` feat: add workspace distro mission packet builder | Packet builder | No. | Packet builder should consume explicit goal/setup refs, not `_bmad/custom`. |
| `b0196a995` docs: mark workspace distro S7 complete | Status docs | No. | No architecture correction. |
| `5301a6a59` feat: add workspace distro worktree review | Worktree review | No. | Review artifacts must reflect git state, not customization state. |
| `f104e5850` docs: mark workspace distro S8 complete | Status docs | No. | No architecture correction. |
| `d66731944` feat: add workspace distro destroy | Runtime destroy | No. | Keep destructive scope explicit through CLI/runtime root. |
| `5d97fc107` docs: mark workspace distro S9 complete | Status docs | No. | No architecture correction. |
| `58a900bff` feat: add workspace distro grant guard denial | Grant guard | No. | Grant denial belongs to authorization contract, not TOML override. |
| `c20d1599d` docs: mark workspace distro S10 complete | Status docs | No. | No architecture correction. |
| `b042d39e9` feat: add workspace distro base improvement launch | Base improvement | No. | Keep base writes grant-governed; no customize bypass. |
| `801f93ba4` docs: mark workspace distro S11 complete | Status docs | No. | No architecture correction. |
| `ff91dfed4` test: cover workspace distro multi repo launch | Workspace tests | No. | Tests should assert CLI behavior, not customization behavior. |
| `70434058c` docs: mark workspace distro S4 complete | Status docs | No. | No architecture correction. |
| `d9ddc3da8` wip | Commit hygiene | No. | Rename or squash before merge; no TOML correction. |
| `483f10fca` feat(workspace-distro): add v2 session packet kit | Packet kit | No. | Keep packet kit artifact-driven. |
| `d3a1554d5` wip | Commit hygiene | No. | Rename or squash before merge; no TOML correction. |
| `292d1c160` feat(workspace): remove distro naming | Workspace rename | No. | Rename keeps Workspace schema boundary; no customize role. |
| `a1c161dfb` feat(workspace): add v4 session setup gate | Setup gate | No: setup refs are Workspace packet fields. | Use explicit setup refs or skipped reasons, not TOML. |
| `e3f5ac0e8` wip | Commit hygiene | No. | Rename or squash before merge; no TOML correction. |
| `e5f8840fe` feat(workspace): add v5 status inspectability | Status | No. | Status must remain read-only projection from artifacts. |
| `1a7030be0` feat(workspace): add v6 inventory handoff | List/handoff | No. | Handoff should report stored artifact state, not customization. |
| `021357759` feat(workspace): add v7 session archives | Archive | No. | Archive remains evidence bundle, not restore/config input. |
| `e9466b79d` wip | Commit hygiene | No. | Rename or squash before merge; no TOML correction. |
| `4f4e3136b` feat(workspace): add v8 routing contract | Routing | No. | Route from workflow catalog/CLI argument; do not use customized config as authority. |
| `c1fbfb608` feat(workspace): add v9 result ledger | Result ledger | No. | Results record manual evidence JSON only. |
| `f752cbf54` chore(workspace): record session state | Coordination state | No. | Keep state as evidence only. |
| `0ba3af07a` feat(workspace): add manual executor contract | Executor contract | No. | Executor contract remains manual readiness artifact, not agent customization. |
| `5781270d5` docs(workspace): add v11 closeout plan | Closeout plan | No. | Closeout docs should keep data-only JSON boundary. |
| `4527d1703` feat(workspace): add manual closeout | Closeout | No. | Closeout must not become approval or config source. |
| `7cf850570` feat(workspace): add v13 release readiness | Release readiness | No. | Release gates should cite quality/contract checks, not customization. |
| `7e12e2d6b` feat(workspace): add evidence index trust layer | Evidence index | No. | Evidence index reads stored session artifacts only. |
| `b6a70b10f` feat(workspace): add read-only archive diff | Archive diff | No. | Diff verified archives only. |
| `01546d281` feat(workspace): add v16 review manifest | Review manifest | No. | Manifest is evidence, not customization approval. |
| `f7ccf10a3` chore(workspace): record v16 coordination state | Coordination state | No. | Keep as branch evidence. |
| `65bef3890` docs(workspace): consolidate workspace documentation | Docs consolidation | No. | Consolidated docs should keep Customize only in explicit customization sections. |
| `e58ec30c2` docs(workspace): plan v18 codex affordances | Codex affordances | Conditional: mention `bmad-customize` only as operator aid. | State Codex config and customization are advisory, never Workspace authority. |
| `28377c5f2` test(workspace): quarantine release labels to history | Tests/docs cleanup | No. | No customization correction. |
| `0c04c9eec` docs(workspace): compile history bmads | History docs | No. | Preserve historical context; do not make it normative customization guidance. |
| `14bd6c99b` feat(workspace): reject legacy artifacts | Legacy rejection | No. | Reject legacy artifacts through schema rules, not config overrides. |
| `fdec3618f` docs(workspace): compile strict reject history | History docs | No. | No architecture correction. |
| `77d368051` feat(workspace): remove archive compatibility surface | Archive contract | No. | Keep strict archive contract independent of customization. |
| `4d742960a` docs(workspace): compile archive manifest cleanup history | History docs | No. | No architecture correction. |
| `977f9b967` revert: remove prompt builder skill | Revert | No. | Revert supports boundary: prompt builder is not customization. |
| `15c620e23` docs(workspace): compile prompt builder removal history | History docs | No. | Record removal without prescribing TOML. |
| `82cd68406` feat(workspace): harden release safety gates | Release gates | No. | Keep release checks deterministic and artifact-based. |
| `385540243` docs(workspace): compile release hardening history | History docs | No. | No architecture correction. |
| `12ab0d209` feat: add codex self-improvement workflow | Self-improve workflow | Conditional: use `bmad-customize` only for per-skill behavior changes. | State self-improve policy/runbook changes are source edits plus tests, not `_bmad/custom` overrides. |
| `15759a925` feat(skills): add self-improve operator runbook | Self-improve runbook | Conditional. | If operator asks to change a skill persona/workflow behavior, route to `bmad-customize`; policy invariants remain source docs/tests. |
| `5bbd34cd4` chore: preserve pre-automation worktree state | Self-improve policy | No. | Dirty-worktree preservation is git policy, not customization. |
| `7b99f6d4c` fix(self-improve): harden dirty worktree preflight | Self-improve preflight | No. | Keep secret/large-file scan deterministic. |
| `d2ce4e38b` fix(self-improve): add activation-state evidence contract | Activation evidence | No. | Activation state belongs to checkpoint evidence. |
| `ea35a12be` test: cover self-improve invariant contracts | Invariant tests | No. | Deterministic invariant tests should not read custom TOML. |
| `abe53ebcd` fix(party-mode): add self-improve contract checks | Party Mode checks | Conditional: Customize may shape agent persona only. | Party Mode contract checks should remain policy/test assertions, not agent overrides. |
| `393de54ec` chore(workspace): update hermes coordination state | Coordination state | No. | No architecture correction. |
| `26352a091` feat: add self-improve capability invariants | Shared capability invariants | Conditional. | Document shared planning capabilities as operator-invoked aids; do not imply Customize changes Workspace schema. |
| `ac8d08b97` feat: expose planning capabilities across BMAD | Shared capabilities | Conditional. | If per-skill wording needs customization, use exposed `customize.toml`; capability declarations stay in source JSON/docs. |
| `2def0a68a` feat(self-improve): validate resume checkpoint evidence | Resume evidence | No. | Resume validation reads checkpoint evidence, not customization. |
| `a1772fcdd` feat(self-improve): harden resume evidence gates | Resume gates | No. | Continuation gates must remain explicit evidence checks. |
| `ce0403ada` docs: clarify Codex advanced config boundaries | Codex config boundary | Yes: use as education wording only. | Reinforce that Codex config is capability context, not Workspace authority or Customize input. |
| `54fd60edc` feat: add repository graph pipeline | Graph pipeline | No. | Graph generation is build artifact pipeline, not customization. |
| `2de68fbe8` feat(workspace): add Graphify graph evidence intake | Graph evidence intake | No. | Intake may record existing graph artifacts; no live Graphify or TOML hydration. |
| `2de09c795` feat(workspace): add evidence gate v1 packets | Evidence gates | Conditional. | Keep evidence gates declared in packet JSON and refs; do not source gates from `_bmad/custom`. |
| `a367eb642` fix(workspace): block unknown advisory routes | Routing guard | No. | Unknown route rejection remains catalog-based. |
| `ed885f804` test(workspace): cover fuzzy advisory route rejection | Routing tests | No. | No customization correction. |
| `55e3b0a9e` docs(workspace): map validator owner review gates | Release/checklist docs | No. | Map ownership to deterministic validators, not custom TOML. |
| `cdfdb600e` feat(workspace): add capability verifier | Capability verifier | Yes: use `bmad-customize` as authoring/education control plane only. | Add config-blind verifier regression test and steer examples to `capability-request.template.json`; never read `_bmad/custom`, `customize.toml`, Codex config, app-server APIs, live Graphify, or hand-authored TOML. |

## Party Mode Notes

Winston consensus: most commits are Workspace artifact/JSON/CLI concerns; `bmad-customize` belongs only where per-skill override authoring is explicitly exposed.

Amelia correction: add a failing public behavior test proving `verify-capability` ignores `_bmad/custom`, `customize.toml`, Codex config, app-server APIs, and live Graphify.

Paige wording rule: say "derive fixture from template" and "education/control plane"; never say "verifier reads customized TOML."
