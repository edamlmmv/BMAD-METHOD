---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify/blob/v7/ARCHITECTURE.md
retrieved_at: 2026-05-06
namespace: graphify
---

# Graphify Architecture

Graphify is documented as an assistant skill backed by a Python library. The
pipeline moves through detection, extraction, graph build, clustering, analysis,
report rendering, and export. Modules communicate through plain dictionaries
and NetworkX graph objects.

## Pipeline Modules

Key modules cover file collection, extraction, graph building, clustering,
analysis, reporting, export, ingest, cache handling, security validation, schema
validation, MCP serving, watching, and benchmarking. BMAD persists these as
tool capability context, not as permission to call Graphify.

## MCP Stdio Server

Graphify architecture names a serve module that starts an MCP stdio server from
a graph path. BMAD treats this as an experimental live-tool affordance. Live MCP
activation is not verifier input and not Workspace authority.

## Security And Validation

Graphify validates external URLs, fetched content, graph file paths, and node
labels before use. BMAD still keeps source files and declared Workspace
contracts as authority before planning or edits.
