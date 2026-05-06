---
title: "Self-Improve Capability Evidence Gates Customize Review"
description: "Commit-by-commit architecture correction for BMad Customize leverage on codex/self-improve-capability-evidence-gates"
---

# Self-Improve Capability Evidence Gates Customize Review

Scope: `main..codex/self-improve-capability-evidence-gates`, 83 commits.

Review question: for each authored commit, decide whether `bmad-customize` should be leveraged so users do not hand-author TOML.

## Source Map

- `src/core-skills/bmad-customize/SKILL.md` is the guided authoring surface for sparse per-skill `[agent]` and `[workflow]` TOML overrides under `_bmad/custom/`.
- `_bmad/scripts/resolve_customization.py` verifies the three-layer merge: skill `customize.toml`, team override, user override.
- `docs/workspace/templates/capability-request.template.json` is the fixture users should start from for capability verification.
- `tools/workspace/capability-verifier.js` and `tools/workspace/contracts.js` should stay JSON-only and read-only.
- `tools/workspace/capability-contract.js` declares built-in Workspace capabilities in code, not TOML.
- Installed customizable skills were discovered under `.agents/skills`; no existing team or user per-skill overrides are present.

## Architecture Correction

Use `bmad-customize` as the authoring and education control plane for human customization intent. Do not make Workspace commands read `_bmad/custom`, `customize.toml`, central config TOML, local Codex config, app-server APIs, or live Graphify state to prove capability availability.

Correct split:

- Per-skill behavior change: route to `bmad-customize`, write sparse `_bmad/custom/{skill}.toml`, verify with `resolve_customization.py`.
- Capability verification: start from `docs/workspace/templates/capability-request.template.json`, pass self-contained JSON to `bmad workspace verify-capability`.
- Central config or capability declaration generation: outside `bmad-customize` v1; point to Workspace Capability Contract docs and template.
- Self-Improve continuation, Evidence Gate v1, Grant Guard, install, refresh, and quality checks: never replaced by `ok: true` from capability verification.

Recommended code hardening on top of this branch: make `verifyCapabilityRequest` validate embedded `capabilities[]` with the same declaration shape as `validateCapabilityContract` before matching. This keeps pasted JSON fixtures honest while preserving the no-TOML boundary.

## Ignored Commits

Ignored because only `.hermes.md` changed:

- `378ea40247` `wip`
- `d9ddc3da86` `wip`
- `d3a1554d5a` `wip`
- `e3f5ac0e87` `wip`
- `e9466b79df` `wip`
- `f752cbf540` `chore(workspace): record session state`
- `f7ccf10a31` `chore(workspace): record v16 coordination state`
- `393de54ecd` `chore(workspace): update hermes coordination state`

## Commit Review

| Commit | Subject | BMad Customize correction |
| --- | --- | --- |
| `5b0c66f5b1` | Implement BMAD prompt builder | If this prompt-builder idea returns, constrain it to routing prompts only. It must not emit TOML snippets; customization requests should invoke `bmad-customize`. Later reverted by `977f9b9679`. |
| `6223d81c0b` | Merge branch `main` | Merge commit has no authored patch. No `bmad-customize` leverage. |
| `1f74a17c16` | chore: refresh BMAD workspace state | No direct leverage. Coordination and ubiquitous language state should avoid advising manual TOML edits; point customization intent at `bmad-customize`. |
| `b50f9fee88` | docs: add BMAD workspace distro artifacts | Add a Workspace docs boundary: when docs discuss changing agent or workflow behavior, link to `bmad-customize` instead of showing hand-authored TOML. |
| `6922602f0a` | Merge branch `main` | Merge commit has no authored patch. No `bmad-customize` leverage. |
| `028c9c6719` | docs: add workspace distro v1 backlog | Add backlog acceptance criterion: per-skill customization is authored by `bmad-customize`; Workspace does not consume custom TOML as authority. |
| `6ad93e44a2` | feat: add workspace distro contract validation | No direct leverage. Keep contract validation over JSON artifacts and schema-shaped data, not TOML custom layers. |
| `36127a8e3a` | docs: mark workspace distro S1 complete | No direct leverage. Traceability row can mention no customization authoring touched. |
| `1547789032` | feat: add workspace distro CLI help | CLI help should not imply Workspace reads `_bmad/custom`. If help references customization, route user to `bmad-customize`. |
| `fdcee942da` | docs: mark workspace distro S2 complete | No direct leverage. Completion note can record CLI boundary as non-customization. |
| `ada39dd0da` | feat: add workspace distro launch | No direct leverage. Launch creates session state; it should not infer behavior overrides from project TOML. |
| `9069f9611e` | docs: mark workspace distro S3 complete | No direct leverage. |
| `49d4080826` | docs: fix workspace distro evidence hashes | No direct leverage. Hash correction only. |
| `0456fc556c` | feat: add workspace distro repo intake | No direct leverage. Repo intake evidence should remain source/provenance only, not customization config. |
| `7dff286d3f` | docs: mark workspace distro S5 complete | No direct leverage. |
| `a11c93a2b3` | feat: add workspace distro packet freshness guard | No direct leverage. Freshness guard should validate intake refs, not custom TOML recency. |
| `53d884b3bc` | docs: mark workspace distro S6 complete | No direct leverage. |
| `20bc4d1888` | feat: add workspace distro mission packet builder | If packet builder prompts mention agent/workflow behavior changes, make them operator setup evidence produced by `bmad-customize`; do not generate or parse TOML inside packet creation. |
| `b0196a995a` | docs: mark workspace distro S7 complete | No direct leverage. |
| `5301a6a59e` | feat: add workspace distro worktree review | No direct leverage. Review may flag custom TOML diffs, but should not author them. |
| `f104e58509` | docs: mark workspace distro S8 complete | No direct leverage. |
| `d66731944a` | feat: add workspace distro destroy | No direct leverage. Destroy must not touch `_bmad/custom`. |
| `5d97fc107b` | docs: mark workspace distro S9 complete | No direct leverage. |
| `58a900bffc` | feat: add workspace distro grant guard denial | No direct leverage. Grant Guard decides write authority, not customization merge. |
| `c20d1599df` | docs: mark workspace distro S10 complete | No direct leverage. |
| `b042d39e96` | feat: add workspace distro base improvement launch | Base Improvement grants are separate from per-skill customization. If behavior override is needed, require a separate `bmad-customize` artifact before launch, not inline TOML. |
| `801f93ba4e` | docs: mark workspace distro S11 complete | No direct leverage. |
| `ff91dfed44` | test: cover workspace distro multi repo launch | No direct leverage. Multi-repo launch should not discover customization from repo roots unless explicit future feature. |
| `70434058c3` | docs: mark workspace distro S4 complete | No direct leverage. |
| `483f10fca3` | feat(workspace-distro): add v2 session packet kit | Templates and prompts should say customization intent is handled by `bmad-customize` and recorded as manual setup evidence. Avoid embedding TOML examples in packet templates. |
| `292d1c1602` | feat(workspace): remove distro naming | Rename is fine. Preserve same boundary under new name: Workspace routes workflows; `bmad-customize` authors overrides. |
| `a1c161dfb8` | feat(workspace): add v4 session setup gate | Setup capabilities are not customization surfaces. Add note: if setup reveals agent/workflow behavior drift, run `bmad-customize` separately and attach result as evidence. |
| `e5f8840fe1` | feat(workspace): add v5 status inspectability | Status should report stored artifacts only. Do not add `_bmad/custom` inspection as status blocker; use resolver output if customization evidence matters. |
| `1a7030be01` | feat(workspace): add v6 inventory handoff | Handoff can mention custom overrides only as operator context. It should instruct users to use `bmad-customize`, not paste TOML. |
| `021357759a` | feat(workspace): add v7 session archives | No direct leverage. Archives should not copy project `_bmad/custom` unless a future explicit evidence ref is added. |
| `4f4e3136ba` | feat(workspace): add v8 routing contract | Routing selects a BMAD workflow, not its override state. If selected workflow needs behavior change, route to `bmad-customize` after deterministic route selection. |
| `c1fbfb6085` | feat(workspace): add v9 result ledger | Result ledger records manual facts only. If a result claims customization changed, require resolver output path/hash, not raw TOML content. |
| `0ba3af07a2` | feat(workspace): add manual executor contract | Executor Contract should keep `_bmad/custom` outside execution authority. Customization is an operator preparation action through `bmad-customize`, not a runtime permission. |
| `5781270d5a` | docs(workspace): add v11 closeout plan | No direct leverage. Closeout can record customization follow-up but should not prescribe TOML edits. |
| `4527d17038` | feat(workspace): add manual closeout | Closeout should treat customization as evidence/ref only. Do not let closeout outcome imply an override was applied unless `bmad-customize` verification exists. |
| `7cf850570f` | feat(workspace): add v13 release readiness | Add release checklist item: per-skill customization docs route through `bmad-customize`; Workspace verifier/status do not read custom TOML. |
| `7e12e2d6b3` | feat(workspace): add evidence index trust layer | Evidence Index should not crawl `_bmad/custom` by default. If customization evidence becomes needed, record explicit resolver output. |
| `b6a70b10fb` | feat(workspace): add read-only archive diff | No direct leverage. Archive diff should compare archived evidence, not live customization files. |
| `01546d2818` | feat(workspace): add v16 review manifest | Review Manifest can flag hand-authored TOML as a review concern. Preferred correction: require `bmad-customize` transcript or resolver output for intentional overrides. |
| `65bef3890b` | docs(workspace): consolidate workspace documentation | Consolidated docs should centralize one rule: Workspace docs explain capability/request boundaries; `bmad-customize` explains and writes per-skill TOML overrides. |
| `e58ec30c22` | docs(workspace): plan v18 codex affordances | Treat `bmad-customize` as an operator affordance for guided authoring only. Do not classify it as a live Workspace adapter. |
| `28377c5f25` | test(workspace): quarantine release labels to history | No direct leverage. Tests should keep release labels/history separate from customization authoring. |
| `0c04c9eec0` | docs(workspace): compile history bmads | No direct leverage. Compiled history should not become customization guidance. Link out to `bmad-customize` if needed. |
| `14bd6c99b9` | feat(workspace): reject legacy artifacts | Good boundary fit. Add explicit reject/ignore language if legacy artifacts include hand-authored TOML masquerading as Workspace evidence. |
| `fdec3618fb` | docs(workspace): compile strict reject history | No direct leverage. |
| `77d368051d` | feat(workspace): remove archive compatibility surface | No direct leverage. Removing compatibility surface reduces accidental config interpretation. |
| `4d742960a2` | docs(workspace): compile archive manifest cleanup history | No direct leverage. |
| `977f9b9679` | revert: remove prompt builder skill | Good correction. Removing prompt builder avoids a second authoring path that could bypass `bmad-customize`. |
| `15c620e23e` | docs(workspace): compile prompt builder removal history | No direct leverage. History can note prompt authoring is not customization authoring. |
| `82cd684064` | feat(workspace): harden release safety gates | Add a safety gate: capability verification and Workspace release checks must not require or parse `_bmad/custom`; per-skill TOML examples should route to `bmad-customize`. |
| `3855402433` | docs(workspace): compile release hardening history | No direct leverage. |
| `12ab0d209c` | feat: add codex self-improvement workflow | Self-Improve runbook should instruct agents to invoke `bmad-customize` for behavior overrides. It should not ask operators to hand-author TOML during automation loops. |
| `15759a9250` | feat(skills): add self-improve operator runbook | Same correction: operator runbook can reference `bmad-customize` as manual authoring step, with resolver evidence recorded before continuation. |
| `5bbd34cd4f` | chore: preserve pre-automation worktree state | No direct leverage for preservation. Policy docs changed here should still say custom override edits are preserved as user work unless explicitly in scope and authored through `bmad-customize`. |
| `7b99f6d4c0` | fix(self-improve): harden dirty worktree preflight | No direct leverage. Dirty preflight should treat existing `_bmad/custom/*.toml` as user work, not automation input. |
| `d2ce4e38bb` | fix(self-improve): add activation-state evidence contract | Activation State should not include raw custom TOML as proof. If customization matters, record resolver output and expected skill hash separately. |
| `ea35a12bef` | test: cover self-improve invariant contracts | Add future invariant: Self-Improve cannot satisfy capability or behavior-change gates by hand-authored TOML alone; use `bmad-customize` plus resolver evidence. |
| `abe53ebcd3` | fix(party-mode): add self-improve contract checks | Party Mode should challenge proposed TOML hand edits and route accepted per-skill behavior changes to `bmad-customize`. |
| `26352a091a` | feat: add self-improve capability invariants | Capability ids and planning capability declarations are data contracts, not TOML custom surfaces. Add wording that `bmad-customize` handles only per-skill behavior changes. |
| `ac8d08b978` | feat: expose planning capabilities across BMAD | Help/Workspace/Self-Improve can recommend `bmad-customize` when planning discovers behavior customization needs. Planning capability JSON should stay separate. |
| `2def0a68ab` | feat(self-improve): validate resume checkpoint evidence | Resume validation should accept customization only as explicit resolver evidence, not as raw `_bmad/custom` file presence. |
| `a1772fcdd7` | feat(self-improve): harden resume evidence gates | Add gate language: hand-authored TOML is not sufficient evidence; `bmad-customize` verification output is the durable proof. |
| `ce0403ada3` | docs: clarify Codex advanced config boundaries | Good adjacent boundary. Pair Codex config advisory language with BMad behavior guidance: use `bmad-customize`, not Codex config TOML, for BMad skill behavior. |
| `54fd60edc2` | feat: add repository graph pipeline | No direct leverage. Graphify artifacts are advisory repo knowledge and must not generate or authorize custom TOML. |
| `2de68fbe8c` | feat(workspace): add Graphify graph evidence intake | No direct leverage. Graph evidence intake should remain advisory and not read custom overrides. |
| `2de09c795b` | feat(workspace): add evidence gate v1 packets | Evidence Gate v1 should depend on packet evidence refs and capability ids, not customization TOML. If authoring capability requests is needed, route users to `bmad-customize` guidance and JSON template. |
| `a367eb6422` | fix(workspace): block unknown advisory routes | No direct leverage. Unknown route rejection is workflow catalog hygiene, not customization merge. |
| `ed885f804b` | test(workspace): cover fuzzy advisory route rejection | No direct leverage. |
| `55e3b0a9e4` | docs(workspace): map validator owner review gates | Add reviewer gate: ensure docs/tests do not ask users to hand-author per-skill TOML when `bmad-customize` can author and verify it. |
| `cdfdb600e7` | feat(workspace): add capability verifier | Mostly correct: it adds `bmad-customize` authoring guidance while keeping verifier JSON-only. Strengthen by validating embedded `capabilities[]` declaration shape, linking the template from `bmad-customize` examples, and keeping tests that forbid `_bmad/custom`, TOML parsing, app-server calls, and Graphify execution in verifier code. |

## Net Recommendation

Keep the final architecture direction: `bmad-customize` helps humans author per-skill overrides and understand capability request fixtures; Workspace verification remains a pure declared-contract JSON check.

Patch priority:

1. Strengthen `verifyCapabilityRequest` declaration validation.
2. Add release/review checklist text that hand-authored per-skill TOML should be replaced by `bmad-customize` output plus resolver evidence.
3. Add a short cross-link from `docs/workspace/templates/capability-request.template.json` docs to `bmad-customize` for guided authoring context.
