---
title: "Matt Pocock Skills Vendor Snapshot"
description: Source metadata for vendored Matt Pocock skills
---

# Matt Pocock Skills Vendor Snapshot

Source: <https://github.com/mattpocock/skills>

Commit: `b843cb5ea74b1fe5e58a0fc23cddef9e66076fb8`

Imported: 2026-05-04

License: [LICENSE](./LICENSE)

Local modifications: vendored Markdown files include added documentation
frontmatter so the BMAD docs build can index them.

## Included Skills

| Skill | Upstream path | Local path |
| --- | --- | --- |
| `zoom-out` | `skills/engineering/zoom-out/SKILL.md` | `zoom-out/SKILL.md` |
| `ubiquitous-language` | `skills/deprecated/ubiquitous-language/SKILL.md` | `ubiquitous-language/SKILL.md` |
| `grill-me` | `skills/productivity/grill-me/SKILL.md` | `grill-me/SKILL.md` |
| `tdd` | `skills/engineering/tdd/SKILL.md` | `tdd/SKILL.md` |

The TDD snapshot also includes upstream support files referenced by its
`SKILL.md`: `tests.md`, `mocking.md`, `deep-modules.md`,
`interface-design.md`, and `refactoring.md`.

## Update Procedure

Fetch the upstream repo at the intended commit, replace listed snapshot files,
recalculate sha256 values in [MANIFEST.json](./MANIFEST.json), and run:

```bash
npm run test:workspace
npm run validate:skills
```
