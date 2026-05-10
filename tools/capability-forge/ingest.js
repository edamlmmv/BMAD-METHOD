const fs = require('node:fs');
const path = require('node:path');
const { sha256 } = require('./store-postgres');
const { assertSecretSafeEvidence } = require('./evidence-boundary');
const { normalizePosix, resolveUnderRoot } = require('./paths');

const DEFAULT_TEXT_EXTENSIONS = new Set(['.md', '.txt', '.csv', '.toml']);

function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.capability-forge') {
        continue;
      }
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile() && DEFAULT_TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function splitIntoSpans(content) {
  const lines = content.split(/\r?\n/);
  const spans = [];
  let currentHeading = '';
  let start = 1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line) && index + 1 > start) {
      spans.push(createSpan(lines, start, index, currentHeading));
      currentHeading = line.replace(/^#{1,6}\s+/, '').trim();
      start = index + 1;
    } else if (/^#{1,6}\s+/.test(line)) {
      currentHeading = line.replace(/^#{1,6}\s+/, '').trim();
    }
  }
  if (lines.length >= start) {
    spans.push(createSpan(lines, start, lines.length, currentHeading));
  }
  return spans.filter((span) => span.contentText.trim() !== '');
}

function createSpan(lines, lineStart, lineEnd, heading) {
  return {
    heading,
    lineStart,
    lineEnd,
    contentText: lines.slice(lineStart - 1, lineEnd).join('\n'),
  };
}

async function ingestEvidence({ config, store }) {
  const runId = await store.createRun('capability-forge ingest');
  try {
    const files = [];
    for (const root of config.evidence.roots) {
      const resolvedRoot = resolveUnderRoot(config.project_root, root, 'evidence.root');
      files.push(...walkFiles(resolvedRoot));
    }

    const evidenceRecords = files.map((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = normalizePosix(path.relative(config.project_root, filePath));
      assertSecretSafeEvidence(content, relativePath);
      return {
        bytes: Buffer.byteLength(content),
        relativePath,
        sha256: sha256(content),
        spans: splitIntoSpans(content),
      };
    });

    let spanCount = 0;
    await store.withTransaction(async (client) => {
      await client.query(`UPDATE ${store.qualify('evidence_file')} SET stale = true`);
      for (const record of evidenceRecords) {
        const evidenceFileId = await store.upsertEvidenceFile(client, {
          bytes: record.bytes,
          mediaType: 'text/plain',
          sha256: record.sha256,
          uri: record.relativePath,
        });
        await store.replaceEvidenceSpans(client, evidenceFileId, record.spans);
        spanCount += record.spans.length;
      }
    });
    await store.finishRun(runId, 'succeeded', `ingested ${files.length} files and ${spanCount} spans`);
    return {
      files: files.length,
      runId,
      spans: spanCount,
    };
  } catch (error) {
    await store.finishRun(runId, 'failed', error.message);
    throw error;
  }
}

module.exports = {
  ingestEvidence,
  splitIntoSpans,
};
