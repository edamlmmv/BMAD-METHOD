---
source_marker: graphify-v7-doc
source_url: https://github.com/safishamsi/graphify/blob/v7/docs/how-it-works.md
retrieved_at: 2026-05-06
namespace: graphify
---

# Graphify How It Works

Graphify processes code, media, documents, papers, and images into a graph.
BMAD records this as source evidence for advisory graph context and capability
authoring.

## Three Passes

Code structure extraction uses local tree-sitter parsing. Video and audio
transcription use local faster-whisper. Document, paper, image, and transcript
extraction can use parallel Claude subagents and costs tokens.

## Confidence Tagging

Graphify labels relationships as extracted, inferred, or ambiguous. BMAD must
keep ambiguous and inferred graph relationships advisory until source files or
manual review confirms them.

## SHA256 Cache

Graphify fingerprints extracted files by content hash and skips unchanged files
on reruns. Cache state helps explain freshness risk but is not Workspace
verifier input.

## Graph Format

Graphify outputs NetworkX node-link graph JSON with stable node ids, labels,
source files, edge relations, confidence data, and optional hyperedges.
