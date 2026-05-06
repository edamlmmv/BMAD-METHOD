# Repository Graph Runbook

## Purpose

Build curated BMAD and Codex knowledge graphs without graphifying the whole
repository. Every generated glossary candidate must trace back to a graph node
and source reference.

## Commands

```shell
node tools/generate-graphify-manifests.js
npm run validate:graphify-manifests
node tools/build-repository-graph.js
npm run validate:graphify-manifests
```

## Ownership

- `.graphify/*.txt` files are deterministic corpus manifests.
- `.graphify/sources/codex/*.md` files are Codex source snapshots and citation metadata.
- `.graphify/sources/graphify/*.md` files are Graphify source snapshots and citation metadata.
- `.graphify/work/` is disposable materialized corpus data.
- `graph/*.graph.json` files are normalized review artifacts.
- `graph/repository-knowledge.graph.json` is derived from per-slice graphs.
- `UBIQUITOUS_LANGUAGE.proposed.md` is a review draft only.

## Scope Rules

- Keep each manifest at 200 files or fewer.
- Use repo-relative sorted paths.
- Exclude generated/noisy paths such as `node_modules/`, `.git/`,
  `dist/`, `build/`, `coverage/`, `graphify-out/`, `graph/`, and lockfiles.
- Exclude lockfiles from graph input, but keep them in the checkout for
  package manager commands such as `npm ci`.
- Use static code extraction only; unresolved dynamic calls are omitted.

## Review Rules

- Per-slice graphs are primary. The merged repository graph is derived.
- Do not hand-edit generated graph JSON.
- Codex terms remain namespaced as `codex` unless source evidence supports a
  BMAD cross-link.
- Canonical `UBIQUITOUS_LANGUAGE.md` remains unchanged until a human accepts
  `UBIQUITOUS_LANGUAGE.proposed.md`.
