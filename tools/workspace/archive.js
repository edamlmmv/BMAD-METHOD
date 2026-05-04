const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { readSessionStatus } = require('./status');
const { renderSessionHandoff } = require('./handoff');
const { scanForSecrets, validateResultArtifact } = require('./result');

const ARCHIVE_VERSION = 1;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

function archiveSession({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT, outputPath }) {
  assertSessionId(sessionId, 'archive');
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('ARCHIVE_OUTPUT_UNSAFE: archive requires --output <archive-dir>');
  }

  const archiveRoot = path.resolve(outputPath);
  assertOutputAvailable(archiveRoot);

  const status = readSessionStatus({ sessionId, runtimeRoot });
  if (status.status === 'invalid') {
    throw new Error(`SESSION_INVALID: session artifacts are invalid for ${sessionId}`);
  }
  if (status.checks.some((item) => item.code === 'RESULT_SECRET_DETECTED')) {
    throw new Error(`RESULT_SECRET_DETECTED: result ledger contains secret-like content for ${sessionId}`);
  }

  const handoff = renderSessionHandoff({ sessionId, runtimeRoot });
  const sessionRoot = status.sessionRoot;
  const runtimeRootResolved = path.resolve(runtimeRoot);
  const tempRoot = `${archiveRoot}.tmp-${process.pid}-${Date.now()}`;

  try {
    fs.mkdirSync(tempRoot);
    const copiedArtifacts = copySessionArtifacts({ sessionRoot, status, archiveRoot: tempRoot });

    writeJson(path.join(tempRoot, 'status.json'), status);
    fs.writeFileSync(path.join(tempRoot, 'handoff.md'), `${handoff.trimEnd()}\n`);
    fs.writeFileSync(path.join(tempRoot, 'closeout.md'), renderCloseout(status));

    const files = collectArchiveFiles(tempRoot);
    const checksums = renderChecksums(files);
    fs.writeFileSync(path.join(tempRoot, 'checksums.sha256'), checksums);

    const manifest = {
      schemaVersion: 1,
      archiveVersion: ARCHIVE_VERSION,
      createdAt: new Date().toISOString(),
      sessionId,
      sessionType: status.sessionType,
      source: {
        runtimeRoot: runtimeRootResolved,
        sessionRoot,
      },
      tool: {
        name: 'bmad-workspace',
        version: readPackageVersion(),
      },
      statusRef: 'status.json',
      handoffRef: 'handoff.md',
      closeoutRef: 'closeout.md',
      artifacts: copiedArtifacts,
      files,
    };
    writeJson(path.join(tempRoot, 'manifest.json'), manifest);

    fs.renameSync(tempRoot, archiveRoot);
    return {
      schemaVersion: 1,
      archiveVersion: ARCHIVE_VERSION,
      sessionId,
      archiveRoot,
      manifestPath: path.join(archiveRoot, 'manifest.json'),
      statusPath: path.join(archiveRoot, 'status.json'),
      handoffPath: path.join(archiveRoot, 'handoff.md'),
      closeoutPath: path.join(archiveRoot, 'closeout.md'),
      fileCount: files.length,
    };
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function verifyArchive({ archivePath }) {
  if (!archivePath || typeof archivePath !== 'string') {
    throw new Error('ARCHIVE_NOT_FOUND: verify-archive requires <archive-dir>');
  }

  const archiveRoot = path.resolve(archivePath);
  if (!fs.existsSync(archiveRoot)) {
    throw new Error(`ARCHIVE_NOT_FOUND: ${archiveRoot}`);
  }
  const archiveStat = fs.lstatSync(archiveRoot);
  if (!archiveStat.isDirectory() || archiveStat.isSymbolicLink()) {
    throw new Error(`ARCHIVE_NOT_FOUND: ${archiveRoot} is not a directory`);
  }

  const manifestPath = path.join(archiveRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`ARCHIVE_MANIFEST_MISSING: ${manifestPath}`);
  }

  const manifest = readManifest(manifestPath);
  validateManifestShape(manifest);
  validateControlFiles(archiveRoot);

  const verifiedFiles = [];
  for (const file of manifest.files) {
    assertSafeArchivePath(file.path);
    const filePath = path.join(archiveRoot, file.path);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`ARCHIVE_FILE_MISSING: ${file.path}`);
    }
    const actualSha = sha256File(filePath);
    if (actualSha !== file.sha256) {
      throw new Error(`ARCHIVE_CHECKSUM_MISMATCH: ${file.path}`);
    }
    validateArchivedResultFile(filePath, file.path);
    verifiedFiles.push(file.path);
  }

  validateChecksumFile(archiveRoot, manifest.files);

  return {
    schemaVersion: 1,
    archiveVersion: manifest.archiveVersion,
    ok: true,
    archiveRoot,
    sessionId: manifest.sessionId,
    checkedFiles: verifiedFiles.length,
  };
}

function assertSessionId(sessionId, commandName) {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(`SESSION_NOT_FOUND: ${commandName} requires a valid session id`);
  }
}

function assertOutputAvailable(archiveRoot) {
  if (path.parse(archiveRoot).root === archiveRoot) {
    throw new Error(`ARCHIVE_OUTPUT_UNSAFE: ${archiveRoot}`);
  }
  if (fs.existsSync(archiveRoot)) {
    throw new Error(`ARCHIVE_OUTPUT_EXISTS: ${archiveRoot}`);
  }

  const parent = path.dirname(archiveRoot);
  try {
    fs.accessSync(parent, fs.constants.W_OK);
  } catch (error) {
    throw new Error(`ARCHIVE_OUTPUT_UNWRITABLE: ${parent}: ${error.message}`);
  }
}

function copySessionArtifacts({ sessionRoot, status, archiveRoot }) {
  const artifacts = {
    instance: copyIfPresent(sessionRoot, archiveRoot, 'instance.json'),
    repoPack: copyIfPresent(sessionRoot, archiveRoot, 'repo-pack.json'),
    grants: copyIfPresent(sessionRoot, archiveRoot, 'grants.json'),
    capabilityContract: copyIfPresent(sessionRoot, archiveRoot, 'capabilities.json'),
    intake: copyIfPresent(sessionRoot, archiveRoot, status.artifacts.intake.ref),
    packet: copyIfPresent(sessionRoot, archiveRoot, 'packets/bmad-work-packet.json'),
    renderedPrompt: copyIfPresent(sessionRoot, archiveRoot, 'packets/rendered-prompt.md'),
    results: copyResultArtifacts({ sessionRoot, archiveRoot, status }),
    review: copyIfPresent(sessionRoot, archiveRoot, 'review/summary.json'),
  };

  const review = readOptionalJson(path.join(sessionRoot, 'review/summary.json'));
  const reviewRepos = [];
  for (const repo of review?.repos || []) {
    const statusRef = toSessionRelativePath(sessionRoot, repo.statusPath);
    const patchRef = repo.patchPath ? toSessionRelativePath(sessionRoot, repo.patchPath) : null;
    reviewRepos.push({
      repoId: repo.repoId,
      status: copyIfPresent(sessionRoot, archiveRoot, statusRef),
      patch: copyIfPresent(sessionRoot, archiveRoot, patchRef),
    });
  }
  artifacts.reviewRepos = reviewRepos;
  return artifacts;
}

function copyResultArtifacts({ sessionRoot, archiveRoot, status }) {
  const copied = [];
  for (const result of status.results?.entries || []) {
    copied.push({
      resultId: result.resultId,
      result: result.valid ? copyIfPresent(sessionRoot, archiveRoot, result.ref) : { present: false, ref: result.ref },
    });
  }
  return copied;
}

function copyIfPresent(sessionRoot, archiveRoot, sessionRef) {
  if (!sessionRef) {
    return { present: false };
  }
  assertSafeArchivePath(sessionRef);
  const source = path.join(sessionRoot, sessionRef);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    return {
      present: false,
      ref: sessionRef,
    };
  }

  const destinationRef = path.posix.join('session-artifacts', toPosix(sessionRef));
  assertSafeArchivePath(destinationRef);
  const destination = path.join(archiveRoot, destinationRef);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return {
    present: true,
    sourceRef: sessionRef,
    archiveRef: destinationRef,
  };
}

function toSessionRelativePath(sessionRoot, absolutePath) {
  if (!absolutePath) {
    return null;
  }
  const relativePath = path.relative(sessionRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return toPosix(relativePath);
}

function collectArchiveFiles(archiveRoot) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = toPosix(path.relative(archiveRoot, absolutePath));
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile() || relativePath === 'manifest.json' || relativePath === 'checksums.sha256') {
        continue;
      }
      assertSafeArchivePath(relativePath);
      const bytes = fs.statSync(absolutePath).size;
      files.push({
        path: relativePath,
        sha256: sha256File(absolutePath),
        bytes,
      });
    }
  }

  walk(archiveRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function renderChecksums(files) {
  return `${files.map((file) => `${file.sha256}  ${file.path}`).join('\n')}\n`;
}

function renderCloseout(status) {
  const errors = status.checks.filter((item) => item.severity === 'error');
  const warnings = status.checks.filter((item) => item.severity === 'warning');
  const readiness = status.baseImprovementReadiness?.state || 'not-applicable';
  return `# BMAD Workspace Session Closeout

- sessionId: \`${status.sessionId}\`
- sessionType: \`${status.sessionType}\`
- state: \`${status.status}\`
- setup: \`${status.setup?.state || 'missing'}\`
- routeWorkflow: \`${status.routing?.selectedWorkflow || 'Not found'}\`
- routeSource: \`${status.routing?.source || 'legacy-missing'}\`
- results: \`${status.results?.count || 0}\`
- latestResult: \`${status.results?.latest?.resultId || 'Not found'}\`
- review: \`${status.review?.state || 'missing'}\`
- Base Improvement readiness: \`${readiness}\`

## Blockers

${formatChecks(errors)}

## Warnings

${formatChecks(warnings)}

## Next BMAD Route

${nextRoute(status)}

## Boundary

Archive is an evidence bundle only. It does not restore, import, replay, execute, schedule, repair, merge, or change durable state.
`;
}

function nextRoute(status) {
  const codes = new Set(status.checks.map((item) => item.code));
  if (codes.has('MISSING_INTAKE')) {
    return `Run \`bmad workspace intake ${status.sessionId}\` before packet work.`;
  }
  if (codes.has('WORK_PACKET_MISSING')) {
    return `Run \`bmad workspace packet ${status.sessionId}\` after fresh intake and Setup Gate evidence.`;
  }
  if (codes.has('STALE_INTAKE') || codes.has('SETUP_REF_CHECKSUM_MISMATCH')) {
    return 'Refresh evidence manually, then rebuild the BMAD Work Packet.';
  }
  if (codes.has('REVIEW_MISSING')) {
    return `Run \`bmad workspace review ${status.sessionId}\` before final review.`;
  }
  if (status.routing?.selectedWorkflow) {
    return `Use stored BMAD Work Packet for \`${status.routing.selectedWorkflow}\`. ${status.routing.nextManualStep}`;
  }
  return 'Use stored handoff and BMAD Work Packet for human-guided continuation.';
}

function formatChecks(checks) {
  if (checks.length === 0) {
    return '- None recorded';
  }
  return checks.map((item) => `- ${item.code} [${item.severity}]: ${item.message}${item.path ? ` (${item.path})` : ''}`).join('\n');
}

function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`ARCHIVE_MANIFEST_INVALID: ${manifestPath}: ${error.message}`);
  }
}

function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('ARCHIVE_MANIFEST_INVALID: manifest must be an object');
  }
  if (manifest.schemaVersion !== 1 || manifest.archiveVersion !== ARCHIVE_VERSION) {
    throw new Error('ARCHIVE_UNSUPPORTED_VERSION: expected schemaVersion 1 and archiveVersion 1');
  }
  for (const field of ['createdAt', 'sessionId', 'sessionType', 'statusRef', 'handoffRef', 'closeoutRef']) {
    if (typeof manifest[field] !== 'string' || manifest[field].trim() === '') {
      throw new Error(`ARCHIVE_MANIFEST_INVALID: ${field} must be a non-empty string`);
    }
  }
  if (!manifest.source || typeof manifest.source.runtimeRoot !== 'string' || typeof manifest.source.sessionRoot !== 'string') {
    throw new Error('ARCHIVE_MANIFEST_INVALID: source runtimeRoot and sessionRoot are required');
  }
  if (!manifest.tool || manifest.tool.name !== 'bmad-workspace') {
    throw new Error('ARCHIVE_MANIFEST_INVALID: tool.name must be bmad-workspace');
  }
  if (!Array.isArray(manifest.files)) {
    throw new TypeError('ARCHIVE_MANIFEST_INVALID: files must be an array');
  }
  for (const file of manifest.files) {
    if (!file || typeof file !== 'object' || typeof file.path !== 'string' || typeof file.sha256 !== 'string') {
      throw new Error('ARCHIVE_MANIFEST_INVALID: each file needs path and sha256');
    }
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isInteger(file.bytes)) {
      throw new Error(`ARCHIVE_MANIFEST_INVALID: invalid checksum metadata for ${file.path}`);
    }
  }
}

function validateControlFiles(archiveRoot) {
  for (const requiredPath of ['checksums.sha256', 'status.json', 'handoff.md', 'closeout.md']) {
    const absolutePath = path.join(archiveRoot, requiredPath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`ARCHIVE_FILE_MISSING: ${requiredPath}`);
    }
  }
}

function validateChecksumFile(archiveRoot, files) {
  const checksumPath = path.join(archiveRoot, 'checksums.sha256');
  const expected = renderChecksums(files);
  const actual = fs.readFileSync(checksumPath, 'utf8');
  if (actual !== expected) {
    throw new Error('ARCHIVE_CHECKSUM_MISMATCH: checksums.sha256');
  }
}

function validateArchivedResultFile(filePath, archiveRef) {
  if (!archiveRef.startsWith('session-artifacts/results/') || !archiveRef.endsWith('.json')) {
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const secretFindings = scanForSecrets(raw);
  if (secretFindings.length > 0) {
    throw new Error(`ARCHIVE_RESULT_SECRET_DETECTED: ${archiveRef}`);
  }
  let result;
  try {
    result = JSON.parse(raw);
  } catch (error) {
    throw new Error(`ARCHIVE_RESULT_INVALID: ${archiveRef}: ${error.message}`);
  }
  const validation = validateResultArtifact(result);
  if (!validation.ok) {
    throw new Error(`ARCHIVE_RESULT_INVALID: ${archiveRef}: ${validation.errors.join('; ')}`);
  }
}

function assertSafeArchivePath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.trim() === '' ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.split('/').includes('..')
  ) {
    throw new Error(`ARCHIVE_UNSAFE_PATH: ${relativePath}`);
  }
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    return packageJson.version || null;
  } catch {
    return null;
  }
}

module.exports = {
  archiveSession,
  verifyArchive,
};
