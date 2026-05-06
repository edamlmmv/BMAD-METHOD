---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify#full-command-reference
retrieved_at: 2026-05-06
namespace: graphify
---

# Graphify Command Reference

Graphify exposes command surfaces for repository graph generation, static graph
navigation, AI client installation, and hook/watch lifecycle support. This
snapshot records BMAD-relevant command families as advisory operator context.

## Query And Navigation Commands

Graphify supports natural-language graph queries, DFS budgeted queries, path
finding between graph nodes, and node explanation commands. These commands can
help an operator navigate checked-in graph artifacts, but their live output is
not Workspace verifier input.

## Agent Integration Commands

Graphify documents assistant integrations for platforms including Codex. Client
install commands can configure an assistant to consult graph reports before
file reads on platforms that support that behavior. BMAD treats this as local
operator affordance, not Workspace authority.

## Hook And Watch Commands

Graphify includes hook install, uninstall, and status commands for repository
change awareness. BMAD records hook/watch capability as proposed advisory
context only; Workspace must not run hooks or regenerate graph artifacts during
capability verification.
