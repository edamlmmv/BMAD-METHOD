const fs = require('node:fs');
const path = require('node:path');
const { verifyArchive } = require('./archive');

const DIFF_SCHEMA_VERSION = 1;
const DIFF_VERSION = 1;

function diffWorkspaceArchives({ leftPath, rightPath }) {
  const left = readArchiveSource(leftPath, 'left');
  const right = readArchiveSource(rightPath, 'right');

  const fileDeltas = diffFileInventories(left.manifest.files, right.manifest.files);
  const statusDeltas = diffNamedValues(
    'status',
    readArchiveJson(left, left.manifest.statusRef),
    readArchiveJson(right, right.manifest.statusRef),
  );
  const evidenceDeltas = diffEvidence(left, right);
  const packetDeltas = diffArtifactJson(left, right, 'packet');
  const closeoutDeltas = diffCloseouts(left, right);

  return {
    schemaVersion: DIFF_SCHEMA_VERSION,
    diffVersion: DIFF_VERSION,
    left: describeSource(left),
    right: describeSource(right),
    summary: summarizeDiff({ fileDeltas, statusDeltas, evidenceDeltas, packetDeltas, closeoutDeltas }),
    fileDeltas,
    statusDeltas,
    evidenceDeltas,
    packetDeltas,
    closeoutDeltas,
  };
}

function readArchiveSource(sourcePath, side) {
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error(`DIFF_SOURCE_REQUIRED: --${side} <archive-dir> is required`);
  }
  if (sourcePath.includes('\0')) {
    throw new Error(`DIFF_UNSAFE_PATH: --${side} contains a null byte`);
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(sourcePath)) {
    throw new Error(`DIFF_SOURCE_UNSUPPORTED: --${side} must be a local Workspace archive directory`);
  }

  const archiveRoot = path.resolve(sourcePath);
  if (!fs.existsSync(archiveRoot)) {
    throw new Error(`DIFF_SOURCE_NOT_FOUND: ${archiveRoot}`);
  }
  const archiveStat = fs.lstatSync(archiveRoot);
  if (!archiveStat.isDirectory() || archiveStat.isSymbolicLink()) {
    throw new Error(`DIFF_SOURCE_UNSUPPORTED: ${archiveRoot} is not a plain archive directory`);
  }
  if (!fs.existsSync(path.join(archiveRoot, 'manifest.json'))) {
    if (fs.existsSync(path.join(archiveRoot, 'instance.json')) || fs.existsSync(path.join(archiveRoot, 'repo-pack.json'))) {
      throw new Error(`DIFF_SOURCE_UNSUPPORTED: ${archiveRoot} looks like a live Workspace Session, not an archive`);
    }
    if (fs.existsSync(path.join(archiveRoot, '.git'))) {
      throw new Error(`DIFF_SOURCE_UNSUPPORTED: ${archiveRoot} looks like a Git worktree, not an archive`);
    }
  }

  let verification;
  try {
    verification = verifyArchive({ archivePath: archiveRoot });
  } catch (error) {
    throw new Error(`DIFF_ARCHIVE_INVALID: ${side}: ${error.message}`);
  }

  const manifest = readJson(path.join(archiveRoot, 'manifest.json'), `DIFF_ARCHIVE_INVALID: ${side}: manifest.json`);
  return {
    side,
    archiveRoot,
    verification,
    manifest,
  };
}

function describeSource(source) {
  return {
    sourceType: 'archive',
    archiveVersion: source.manifest.archiveVersion,
    sessionId: source.manifest.sessionId,
    fileCount: source.manifest.files.length,
  };
}

function diffFileInventories(leftFiles, rightFiles) {
  const leftByPath = mapBy(leftFiles, (file) => file.path);
  const rightByPath = mapBy(rightFiles, (file) => file.path);
  const paths = sortedUnion(Object.keys(leftByPath), Object.keys(rightByPath));
  const result = { added: [], removed: [], changed: [], unchanged: [] };

  for (const filePath of paths) {
    const left = leftByPath[filePath];
    const right = rightByPath[filePath];
    if (!left) {
      result.added.push(fileRecord(right));
      continue;
    }
    if (!right) {
      result.removed.push(fileRecord(left));
      continue;
    }
    if (left.sha256 !== right.sha256 || left.bytes !== right.bytes) {
      result.changed.push({
        path: filePath,
        left: fileRecord(left),
        right: fileRecord(right),
      });
      continue;
    }
    result.unchanged.push(fileRecord(left));
  }

  return result;
}

function fileRecord(file) {
  return {
    path: file.path,
    sha256: file.sha256,
    bytes: file.bytes,
  };
}

function diffEvidence(left, right) {
  if (left.manifest.archiveVersion < 2 || right.manifest.archiveVersion < 2) {
    return {
      state: 'incomparable',
      reason: 'Evidence Index is only required for archiveVersion 2.',
      leftAvailable: left.manifest.archiveVersion >= 2,
      rightAvailable: right.manifest.archiveVersion >= 2,
      artifacts: emptyDeltaSet(),
      checks: emptyDeltaSet(),
    };
  }

  const leftEvidence = readArchiveJson(left, left.manifest.evidenceIndexRef);
  const rightEvidence = readArchiveJson(right, right.manifest.evidenceIndexRef);
  return {
    state: 'compared',
    reason: null,
    leftAvailable: true,
    rightAvailable: true,
    artifacts: diffEvidenceArtifacts(leftEvidence.artifacts || [], rightEvidence.artifacts || []),
    checks: diffEvidenceChecks(leftEvidence.checks || [], rightEvidence.checks || []),
  };
}

function diffEvidenceArtifacts(leftArtifacts, rightArtifacts) {
  const normalize = (artifact) => ({
    key: `${artifact.stage}:${artifact.kind}:${artifact.ref}`,
    stage: artifact.stage,
    kind: artifact.kind,
    ref: artifact.ref,
    present: artifact.present,
    validationState: artifact.validationState,
    sha256: artifact.sha256,
    bytes: artifact.bytes,
  });
  return diffRecords(leftArtifacts.map(normalize), rightArtifacts.map(normalize));
}

function diffEvidenceChecks(leftChecks, rightChecks) {
  const normalize = (check) => ({
    key: `${check.code}:${check.severity}:${check.ref || ''}`,
    code: check.code,
    severity: check.severity,
    ref: check.ref || null,
  });
  return diffRecords(leftChecks.map(normalize), rightChecks.map(normalize));
}

function diffArtifactJson(left, right, artifactName) {
  const leftArtifact = left.manifest.artifacts?.[artifactName];
  const rightArtifact = right.manifest.artifacts?.[artifactName];
  if (!leftArtifact?.present || !rightArtifact?.present) {
    return {
      state: 'incomparable',
      reason: `${artifactName} artifact is missing from one or both archives.`,
      leftAvailable: Boolean(leftArtifact?.present),
      rightAvailable: Boolean(rightArtifact?.present),
      values: emptyDeltaSet(),
    };
  }

  const leftValue = normalizeValue(readArchiveJson(left, leftArtifact.archiveRef));
  const rightValue = normalizeValue(readArchiveJson(right, rightArtifact.archiveRef));
  return {
    state: 'compared',
    reason: null,
    leftAvailable: true,
    rightAvailable: true,
    values: diffNamedValues(artifactName, leftValue, rightValue),
  };
}

function diffCloseouts(left, right) {
  const leftCloseouts = normalizeCloseoutEntries(left);
  const rightCloseouts = normalizeCloseoutEntries(right);
  return {
    state: 'compared',
    reason: null,
    closeouts: diffRecords(leftCloseouts, rightCloseouts),
  };
}

function normalizeCloseoutEntries(source) {
  const entries = source.manifest.artifacts?.closeouts || [];
  const normalized = [];
  for (const entry of entries) {
    if (!entry.closeout?.present) {
      normalized.push({
        key: entry.closeoutId,
        closeoutId: entry.closeoutId,
        present: false,
      });
      continue;
    }
    const value = normalizeValue(readArchiveJson(source, entry.closeout.archiveRef));
    normalized.push({
      key: entry.closeoutId,
      closeoutId: entry.closeoutId,
      present: true,
      outcome: value.outcome || null,
      nextAction: value.nextAction || null,
      summary: value.summary || null,
      value,
    });
  }
  return normalized.sort((left, right) => left.key.localeCompare(right.key));
}

function diffNamedValues(name, leftValue, rightValue) {
  const left = flattenValue(normalizeValue(leftValue));
  const right = flattenValue(normalizeValue(rightValue));
  const keys = sortedUnion(Object.keys(left), Object.keys(right));
  const result = {
    name,
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };

  for (const key of keys) {
    if (!(key in left)) {
      result.added.push({ path: key, right: right[key] });
      continue;
    }
    if (!(key in right)) {
      result.removed.push({ path: key, left: left[key] });
      continue;
    }
    if (stableStringify(left[key]) !== stableStringify(right[key])) {
      result.changed.push({ path: key, left: left[key], right: right[key] });
      continue;
    }
    result.unchanged.push({ path: key, value: left[key] });
  }

  return result;
}

function diffRecords(leftRecords, rightRecords) {
  const left = mapBy(leftRecords, (record) => record.key);
  const right = mapBy(rightRecords, (record) => record.key);
  const keys = sortedUnion(Object.keys(left), Object.keys(right));
  const result = emptyDeltaSet();

  for (const key of keys) {
    if (!(key in left)) {
      result.added.push(withoutKey(right[key]));
      continue;
    }
    if (!(key in right)) {
      result.removed.push(withoutKey(left[key]));
      continue;
    }
    if (stableStringify(left[key]) !== stableStringify(right[key])) {
      result.changed.push({ key, left: withoutKey(left[key]), right: withoutKey(right[key]) });
      continue;
    }
    result.unchanged.push(withoutKey(left[key]));
  }

  return result;
}

function emptyDeltaSet() {
  return {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };
}

function summarizeDiff({ fileDeltas, statusDeltas, evidenceDeltas, packetDeltas, closeoutDeltas }) {
  const counts = {
    files: countDeltas(fileDeltas),
    status: countDeltas(statusDeltas),
    evidenceArtifacts: evidenceDeltas.state === 'compared' ? countDeltas(evidenceDeltas.artifacts) : unavailableCounts(),
    evidenceChecks: evidenceDeltas.state === 'compared' ? countDeltas(evidenceDeltas.checks) : unavailableCounts(),
    packet: packetDeltas.state === 'compared' ? countDeltas(packetDeltas.values) : unavailableCounts(),
    closeouts: countDeltas(closeoutDeltas.closeouts),
  };
  const changed =
    hasChanges(counts.files) ||
    hasChanges(counts.status) ||
    hasChanges(counts.evidenceArtifacts) ||
    hasChanges(counts.evidenceChecks) ||
    hasChanges(counts.packet) ||
    hasChanges(counts.closeouts);

  return {
    changed,
    counts,
    incomparable: [
      ...(evidenceDeltas.state === 'incomparable' ? ['evidenceDeltas'] : []),
      ...(packetDeltas.state === 'incomparable' ? ['packetDeltas'] : []),
    ],
  };
}

function countDeltas(deltaSet) {
  return {
    added: deltaSet.added.length,
    removed: deltaSet.removed.length,
    changed: deltaSet.changed.length,
    unchanged: deltaSet.unchanged.length,
  };
}

function unavailableCounts() {
  return {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };
}

function hasChanges(counts) {
  return counts.added > 0 || counts.removed > 0 || counts.changed > 0;
}

function readArchiveJson(source, archiveRef) {
  assertSafeArchivePath(archiveRef);
  return readJson(path.join(source.archiveRoot, archiveRef), `DIFF_ARCHIVE_INVALID: ${source.side}: ${archiveRef}`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    if (isVolatileKey(key)) {
      continue;
    }
    normalized[key] = normalizeValue(value[key]);
  }
  return normalized;
}

function isVolatileKey(key) {
  return (
    key === 'createdAt' ||
    key === 'generatedAt' ||
    key === 'path' ||
    key === 'sessionRoot' ||
    key === 'runtimeRoot' ||
    key === 'archiveRoot' ||
    key.endsWith('Path') ||
    key.endsWith('Root')
  );
}

function flattenValue(value, prefix = '') {
  if (Array.isArray(value)) {
    return { [prefix || '$']: value };
  }
  if (!value || typeof value !== 'object') {
    return { [prefix || '$']: value };
  }

  const result = {};
  for (const key of Object.keys(value).sort()) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    const child = value[key];
    if (Array.isArray(child) || !child || typeof child !== 'object') {
      result[childPrefix] = child;
      continue;
    }
    Object.assign(result, flattenValue(child, childPrefix));
  }
  return result;
}

function assertSafeArchivePath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.trim() === '' ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.split('/').includes('..')
  ) {
    throw new Error(`DIFF_UNSAFE_PATH: ${relativePath}`);
  }
}

function mapBy(records, getKey) {
  const mapped = {};
  for (const record of records || []) {
    mapped[getKey(record)] = record;
  }
  return mapped;
}

function sortedUnion(left, right) {
  return [...new Set([...(left || []), ...(right || [])])].sort((first, second) => first.localeCompare(second));
}

function withoutKey(record) {
  const { key, ...rest } = record;
  return rest;
}

function stableStringify(value) {
  return JSON.stringify(normalizeValue(value));
}

module.exports = {
  diffWorkspaceArchives,
};
