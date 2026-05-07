---
name: bmad-capability-pack-forge
description: 'Generates draft BMAD capability-pack artifacts from local evidence files. Use when you need to turn Context7 docs evidence and optional Workspace evidence refs into reviewable capability request, readiness, customization, and Codex task drafts.'
---

# Capability Pack Forge

Capability Pack Forge is a source artifact generator for BMAD capability packs.
It consumes local evidence files and emits draft artifacts for human review.

It is not a Workspace command, runtime, verifier, installer, grant source,
scheduler, live adapter, or `_bmad/custom` authority.

## Operator Model

Forge consumes evidence files, emits draft capability-pack artifacts, then a
human reviews the output and chooses the next BMAD workflow.

Use Forge when:

- Context7 docs evidence should become a repeatable BMAD capability pack.
- A Capability Request needs companion readiness, customization, and Codex task
  drafts.
- Optional Graphify, PostgreSQL, Docker, Git, or Codex observations need to be
  referenced as advisory evidence without becoming live integrations.

## Command

```bash
node {project-root}/tools/capability-pack-forge.js --input <forge-request.json> --output <dir>
```

The input must be local JSON. Evidence paths inside the request must be local
relative paths under the request file directory.

## Inputs

- Context7 docs evidence JSON.
- Existing or candidate Workspace Capability Request JSON.
- Optional Graphify, PostgreSQL, Docker, Git, or Codex evidence references.
- Optional target customization surface name.
- Acceptance criteria.

## Outputs

Generated artifacts:

- `manifest.json`
- `capability-pack.json`
- `capability-request.json`
- `operator-evidence-template.json`
- `customization-draft.toml`
- `skill-outline.md`
- `readiness-checklist.md`
- `codex-task-packet.md`

The Codex task packet is an instruction draft only. The customization draft is
inactive until routed through `skill:bmad-customize`.

## Boundaries

Forge must not:

- call live Context7, MCP, Docker, PostgreSQL, Git, Codex app-server, Apple
  Passwords, keychain, or network
- add or change `bmad workspace` commands
- change `bmad workspace verify-capability`
- read `_bmad/custom` as authority
- install skills
- configure MCP
- run Graphify
- query databases
- launch Docker
- execute Codex task packets
- store raw secrets or query results

`kind: "bmad-capability-pack"` means artifact identity only. It is not a grant,
install manifest, execution permission, verifier proof, or runtime authority.

## Validation

Run targeted validation after Forge changes:

```bash
node {project-root}/test/test-capability-pack-forge.js
node {project-root}/test/test-workspace-contracts.js
node {project-root}/test/test-workspace-cli.js
npm run validate:skills
npm run validate:refs
npm run validate:graphify-manifests
```

Before push readiness, run:

```bash
npm ci && npm run quality
```
