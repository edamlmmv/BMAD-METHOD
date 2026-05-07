---
title: "PostgreSQL MCP Capability Planning"
description: Secret-safe advisory plan for declared-only PostgreSQL read-only MCP readiness in BMAD Workspace
---

# PostgreSQL MCP Capability Planning

## Summary

BMAD Workspace recognizes `host.mcp.postgresql.readonly` as an optional,
declaration-only `host.mcp` capability for operator-provided PostgreSQL MCP
read-only evidence. The declaration is explicit capability support, not
docs-only. It is not endorsement of the upstream implementation, and the
`interface: readonly-postgresql-mcp` value is BMAD-owned contract language, not
an upstream protocol name.

Primary invariant: `bmad workspace verify-capability` evaluates only the
self-contained Capability Request JSON supplied to it. Same request, same
verdict, even with no live database or MCP runtime. No live PostgreSQL, Docker,
MCP, network, Codex config, _bmad/custom, or Workspace Session artifacts are
allowed in deterministic tests for this capability.

## Source Register

| source_id | Title | URL | Publisher | Retrieved | Used For | Do Not Use For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `modelcontextprotocol_servers` | Model Context Protocol servers | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Model Context Protocol | 2026-05-07 | Reference package lineage and archived/deprecated status | Workspace verifier input, runtime proof, security endorsement | Source must be labeled archived/deprecated and not endorsement. |
| `docker_hub_postgres_mcp` | Docker Hub PostgreSQL MCP server | [mcp/server/postgres](https://hub.docker.com/mcp/server/postgres/overview) | Docker Hub | 2026-05-07 | Packaged PostgreSQL MCP identity and operator setup vocabulary | Runtime proof, secret proof, local availability guarantee | Docker Hub catalog page is source context only. |
| `docker_mcp_cli_docs` | Docker MCP Toolkit CLI | [CLI](https://docs.docker.com/ai/mcp-catalog-and-toolkit/cli/) | Docker Docs | 2026-05-07 | Docker MCP command and secret-handling vocabulary | Verifier behavior, local runtime proof, credential proof | Official Docker CLI docs source. |
| `docker_mcp_catalog_docs` | Docker MCP Catalog | [Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/) | Docker Docs | 2026-05-07 | Catalog source boundary and packaged MCP server vocabulary | Proof PostgreSQL MCP is configured or authorized locally | Official Docker Catalog docs source. |
| `npm_server_postgres` | @modelcontextprotocol/server-postgres | [npm package](https://www.npmjs.com/package/%40modelcontextprotocol/server-postgres) | npm | 2026-05-07 | Reference provider metadata and package identity | Runtime proof, version guarantee, endorsement | Package metadata is advisory only. |
| `bmad_workspace_capability_contract` | BMAD Workspace Capability Contract | docs/workspace/capability-contract.md | BMAD-METHOD | 2026-05-07 | Declared capability schema, exact id matching, grant boundary, sealed verifier invariant | PostgreSQL product claims, live database claims | Local source for BMAD-owned fields only. |

## Boundary Map

| Surface | What It Is | What It Can Support | Boundary |
| --- | --- | --- | --- |
| PostgreSQL MCP reference | `modelcontextprotocol/server-postgres` metadata for a read-only PostgreSQL MCP server | Advisory capability vocabulary and operator evidence planning | Upstream is archived/deprecated source context, not endorsement, not verifier input, and not Workspace authority. |
| `query` tool | Expected read-only query tool exposed by the reference server | Operator can record that `query` is expected when producing `postgres-mcp-operator-evidence.json` | Tool presence is manual evidence only. Live tool output is not verifier input. |
| read-only transaction behavior | Upstream-style server behavior expected to wrap SQL in a read-only transaction | Planning signal for denied writes and read-only access mode | Read-only is not safe; it prevents mutation but can expose sensitive rows. |
| Runtime secret | Operator-owned PostgreSQL connection configuration | Evidence may record only `POSTGRES_URL=set|unset` | BMAD must never read, store, print, log, or serialize the connection string value. |
| Allowed schemas and tables | Operator-approved read scope | Evidence should list allowed schemas and allowed tables when database evidence is needed | Broad database access should be treated as insufficient readiness. |
| Denied writes | Mutation operations and schema changes excluded from the capability | Evidence should list denied writes and confirm no write targets are granted | `writes` remains empty and `external/postgresql/database` remains forbidden. |
| Workspace verifier | `bmad workspace verify-capability` | Declared-contract compatibility over one JSON request | No live PostgreSQL, Docker, MCP, network, Codex config, _bmad/custom, or Workspace Session artifacts. |

## Candidate Declaration

The committed declaration uses only fields accepted by the Workspace verifier:

```json
{
  "id": "host.mcp.postgresql.readonly",
  "group": "host.mcp",
  "provider": "modelcontextprotocol/server-postgres",
  "interface": "readonly-postgresql-mcp",
  "allowedInNormalSession": true,
  "allowedInBaseImprovement": false,
  "requiresGrant": true,
  "writes": [],
  "forbiddenWrites": ["workspace-base", "target-repo", "external/postgresql/database", "scheduler", "daemon", "live-adapter", "secret-store"],
  "outputs": ["postgres-mcp-operator-evidence.json"],
  "upstreamGapProofRequired": false
}
```

The portable fixture is
`docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`.
It embeds the declaration and source-referenced observations so the verifier can
run with no ambient context.

## Operator Evidence Template

Use `docs/workspace/templates/postgres-mcp-operator-evidence.template.json` for
manual evidence. It requires `expectedTools`, `accessMode`, `secretEvidence:
POSTGRES_URL=set|unset`, allowed schemas/tables, denied writes, and a plain
answer for why DB evidence is needed.

This evidence is not verifier input, not grant authority, not runtime
authority, and not Workspace authority. It is an operator readiness artifact
for a human-owned runtime.

## Read Scope Rules

- Read-only is not safe; it prevents mutation but can expose sensitive rows.
- Require least-privilege database roles when an operator provides PostgreSQL
  MCP evidence.
- Record allowed schemas and allowed tables before accepting query evidence.
- Record denied writes such as data mutation, schema mutation, bulk copy, and
  administrative actions.
- Record `POSTGRES_URL=set|unset` only; never record a raw connection string,
  password, token, environment file value, local MCP config secret, shell
  history, transcript, screenshot, or query result containing sensitive rows.
- Treat archived/deprecated upstream status as source context only; it is not
  endorsement and not a readiness pass by itself.

## Negative Fixture Matrix

| Claim Source | Expected Handling |
| --- | --- |
| Live PostgreSQL state | Reject as verifier proof; manual operator evidence only. |
| PostgreSQL MCP runtime state | Reject as verifier proof; runtime is operator-owned. |
| Docker MCP Gateway or Catalog state | Reject as verifier proof; source context only. |
| Local Codex MCP config | Reject as verifier proof; local configuration is not Workspace authority. |
| `_bmad/custom` | Reject as verifier proof; reminders are advisory Customize context only. |
| Workspace Session artifacts | Reject as verifier proof; capability verification is self-contained JSON only. |
| Raw PostgreSQL connection string | Reject and remove; record only `POSTGRES_URL=set|unset`. |
| Query results | Reject as verifier proof; can contain sensitive rows. |

## Validation

Required planning gates:

- `bmad workspace verify-capability --input docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`
- `node test/test-workspace-contracts.js`
- `node test/test-workspace-cli.js`
- `npm run validate:skills`
- `git diff --check`

Before pushing, run `npm ci && npm run quality` on the exact checkout to be
pushed.
