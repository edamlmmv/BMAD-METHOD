---
title: "Optimization Loop Route Note"
description: Route recommendation for the thin-v1 optimization-loop planning slice
---

# Optimization Loop Route Note

This note captures the `bmad-help` routing decision for the
`optimization-loop` planning slice.

## Recommended Fresh-Context Sequence

Optional support first:

- `[BH]` **BMad Help** — `bmad-help`
  Orient the candidate, route the planning slice, and keep the next skill
  sequence explicit.
- `capability:zoom-out` `zoom-out`
  Recommended for every optimization candidate before the first Workspace
  packet, because the operator must declare the problem, constraints,
  alternatives, and chosen optimization path.
- `capability:grill-me` `grill-me`
  Recommended at the planning checkpoint or when the metric/evidence contract is
  contested.
- `capability:ubiquitous-language` `ubiquitous-language`
  Use only if target, metric, or evidence terms drift across docs, prompts, and
  loop surfaces.

Next required step:

- `[PM]` **Party Mode** — `bmad-party-mode`
  Required to challenge the candidate brief and route before bundle authoring.

Planning support after the gate:

- `[WS]` **BMAD Workspace** — `bmad-workspace`
  Bind the candidate to Setup Gate refs and evidence surfaces.
- `[BC]` **BMad Customize** — `bmad-customize`
  Defer until bundle and Workspace flow are settled; thin config should map
  agreed artifacts rather than shape them.
- `capability:tdd` `tdd`
  Defer until execution planning. TDD should consume the settled contract, not
  invent it.

## Why This Route Fits

The candidate is a loop/workspace contract problem, not a general build-or-fix
problem. It needs:

- agreement on a bounded one-shot objective
- a defensible metric contract
- explicit Workspace evidence rules
- a challenge round before any bundle or config is hardened

That makes `bmad-party-mode` the next required workflow and `bmad-workspace`
the next required support surface.

## Why These Alternatives Are Not Primary

- `bmad-quick-dev` is not primary because the current work is contract planning,
  not code-out implementation.
- `bmad-technical-research` is not primary because the main uncertainty is not
  open-ended technology choice; it is admission, evidence, and stop rules.
- `bmad-self-improve` is not primary because this candidate is a new loop
  surface, not a BMAD self-improvement run.
