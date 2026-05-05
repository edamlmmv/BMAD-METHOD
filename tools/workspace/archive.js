const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateWorkPacket } = require('./contracts');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { readEvidenceIndex, validateEvidenceIndex } = require('./evidence');
const { readSessionStatus } = require('./status');
const { renderSessionHandoff } = require('./handoff');
const { validateExecutorContract } = require('./executor-contract');
const { REVIEW_MANIFEST_REF, validateReviewManifest } = require('./review-manifest');
const { scanForSecrets, validateResultArtifact } = require('./result');
const { validateCloseoutArtifact } = require('./closeout');
const { assertPathInside, assertSafeRelativePath } = require('./path-safety');

const ARCHIVE_VERSION = 2;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
const ALLOWED_MANIFEST_FIELDS = new Set([
  'schemaVersion',
  'archiveVersion',
  'createdAt',
  'sessionId',
  'sessionType',
  'source',
  'tool',
  'statusRef',
  'evidenceIndexRef',
  'handoffRef',
  'closeoutRef',
  'artifacts',
  'files',
]);

function archiveSession({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT, outputPath }) {
  assertSessionId(sessionId, 'archive');
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('ARCHIVE_OUTPUT_UNSAFE: archive requires --output <archive-dir>');
  }

  const archiveRoot = path.resolve(outputPath);
  assertOutputAvailable(archiveRoot);

  const status = readSessionStatus({ sessionId, runtimeRoot });
  if (['declared-missing', 'invalid'].includes(status.executorContract?.state)) {
    throw new Error(`EXECUTOR_CONTRACT_INVALID: executor contract is ${status.executorContract.state} for ${sessionId}`);
  }
  if (status.status === 'invalid') {
    throw new Error(`SESSION_INVALID: session artifacts are invalid for ${sessionId}`);
  }
  if (status.checks.some((item) => item.code === 'RESULT_SECRET_DETECTED')) {
    throw new Error(`RESULT_SECRET_DETECTED: result ledger contains secret-like content for ${sessionId}`);
  }
  if (status.checks.some((item) => item.code === 'CLOSEOUT_SECRET_DETECTED')) {
    throw new Error(`CLOSEOUT_SECRET_DETECTED: closeout ledger contains secret-like content for ${sessionId}`);
  }

  const handoff = renderSessionHandoff({ sessionId, runtimeRoot });
  const evidence = readEvidenceIndex({ sessionId, runtimeRoot });
  const sessionRoot = status.sessionRoot;
  const runtimeRootResolved = path.resolve(runtimeRoot);
  const tempRoot = `${archiveRoot}.tmp-${process.pid}-${Date.now()}`;

  try {
    fs.mkdirSync(tempRoot);
    const copiedArtifacts = copySessionArtifacts({ sessionRoot, status, archiveRoot: tempRoot });

    writeJson(path.join(tempRoot, 'status.json'), status);
    writeJson(path.join(tempRoot, 'evidence-index.json'), evidence);
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
      evidenceIndexRef: 'evidence-index.json',
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
      evidenceIndexPath: path.join(archiveRoot, 'evidence-index.json'),
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
  validateControlFiles(archiveRoot, manifest);

  const verifiedFiles = [];
  for (const file of manifest.files) {
    assertSafeArchivePath(file.path);
    const filePath = path.join(archiveRoot, file.path);
    assertPathInside(filePath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`ARCHIVE_FILE_MISSING: ${file.path}`);
    }
    const actualSha = sha256File(filePath);
    if (actualSha !== file.sha256) {
      throw new Error(`ARCHIVE_CHECKSUM_MISMATCH: ${file.path}`);
    }
    validateArchivedResultFile(filePath, file.path);
    validateArchivedCloseoutFile(filePath, file.path, archiveRoot);
    verifiedFiles.push(file.path);
  }

  validateArchivedEvidenceIndex(archiveRoot, manifest);
  validateArchivedExecutorContract(archiveRoot, manifest);
  validateArchivedReviewManifest(archiveRoot, manifest);
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
    executorContract: copyIfPresent(sessionRoot, archiveRoot, status.executorContract?.ref),
    results: copyResultArtifacts({ sessionRoot, archiveRoot, status }),
    review: copyIfPresent(sessionRoot, archiveRoot, 'review/summary.json'),
    reviewManifest: copyIfPresent(sessionRoot, archiveRoot, REVIEW_MANIFEST_REF),
    closeouts: copyCloseoutArtifacts({ sessionRoot, archiveRoot, status }),
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

function copyCloseoutArtifacts({ sessionRoot, archiveRoot, status }) {
  const copied = [];
  for (const closeout of status.closeout?.entries || []) {
    copied.push({
      closeoutId: closeout.closeoutId,
      closeout: closeout.valid ? copyIfPresent(sessionRoot, archiveRoot, closeout.ref) : { present: false, ref: closeout.ref },
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
  assertPathInside(source, sessionRoot, 'ARCHIVE_UNSAFE_PATH');
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    return {
      present: false,
      ref: sessionRef,
    };
  }

  const destinationRef = path.posix.join('session-artifacts', toPosix(sessionRef));
  assertSafeArchivePath(destinationRef);
  const destination = path.join(archiveRoot, destinationRef);
  assertPathInside(destination, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
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
- routeSource: \`${status.routing?.source || 'Not found'}\`
- results: \`${status.results?.count || 0}\`
- latestResult: \`${status.results?.latest?.resultId || 'Not found'}\`
- review: \`${status.review?.state || 'missing'}\`
- closeout: \`${status.closeout?.state || 'none'}\`
- latestCloseout: \`${status.closeout?.latest?.closeoutId || 'Not found'}\`
- latestCloseoutOutcome: \`${status.closeout?.latest?.outcome || 'Not found'}\`
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
  for (const field of Object.keys(manifest)) {
    if (!ALLOWED_MANIFEST_FIELDS.has(field)) {
      throw new Error(`ARCHIVE_MANIFEST_INVALID: ${field} is not allowed by current Workspace archive contract`);
    }
  }
  if (manifest.schemaVersion !== 1 || manifest.archiveVersion !== ARCHIVE_VERSION) {
    throw new Error('ARCHIVE_MANIFEST_INVALID: manifest does not match the current Workspace archive contract');
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
  const seenPaths = new Set();
  if (typeof manifest.evidenceIndexRef !== 'string' || manifest.evidenceIndexRef.trim() === '') {
    throw new Error(`ARCHIVE_MANIFEST_INVALID: evidenceIndexRef must be a non-empty string for archiveVersion ${ARCHIVE_VERSION}`);
  }
  for (const file of manifest.files) {
    if (!file || typeof file !== 'object' || typeof file.path !== 'string' || typeof file.sha256 !== 'string') {
      throw new Error('ARCHIVE_MANIFEST_INVALID: each file needs path and sha256');
    }
    if (seenPaths.has(file.path)) {
      throw new Error(`ARCHIVE_MANIFEST_INVALID: duplicate file path ${file.path}`);
    }
    seenPaths.add(file.path);
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isInteger(file.bytes)) {
      throw new Error(`ARCHIVE_MANIFEST_INVALID: invalid checksum metadata for ${file.path}`);
    }
  }
}

function validateControlFiles(archiveRoot, manifest) {
  const requiredPaths = ['checksums.sha256', 'status.json', 'handoff.md', 'closeout.md', 'evidence-index.json'];
  for (const requiredPath of requiredPaths) {
    assertSafeArchivePath(requiredPath);
    const absolutePath = path.join(archiveRoot, requiredPath);
    assertPathInside(absolutePath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`ARCHIVE_FILE_MISSING: ${requiredPath}`);
    }
  }
}

function validateArchivedEvidenceIndex(archiveRoot, manifest) {
  assertSafeArchivePath(manifest.evidenceIndexRef);
  const evidencePath = path.join(archiveRoot, manifest.evidenceIndexRef);
  assertPathInside(evidencePath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (error) {
    throw new Error(`ARCHIVE_EVIDENCE_INDEX_INVALID: ${manifest.evidenceIndexRef}: ${error.message}`);
  }
  const validation = validateEvidenceIndex(evidence, { expectedSessionId: manifest.sessionId });
  if (!validation.ok) {
    throw new Error(`ARCHIVE_EVIDENCE_INDEX_INVALID: ${manifest.evidenceIndexRef}: ${validation.errors.join('; ')}`);
  }
}

function validateChecksumFile(archiveRoot, files) {
  const checksumPath = path.join(archiveRoot, 'checksums.sha256');
  assertPathInside(checksumPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
  const expected = renderChecksums(files);
  const actual = fs.readFileSync(checksumPath, 'utf8');
  if (actual !== expected) {
    throw new Error('ARCHIVE_CHECKSUM_MISMATCH: checksums.sha256');
  }
}

function validateArchivedExecutorContract(archiveRoot, manifest) {
  const packetArtifact = manifest.artifacts?.packet;
  if (!packetArtifact?.present) {
    return;
  }

  const packetPath = path.join(archiveRoot, packetArtifact.archiveRef);
  assertPathInside(packetPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
  const packet = readOptionalJson(packetPath);
  const packetValidation = validateWorkPacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`ARCHIVE_PACKET_INVALID: ${packetArtifact.archiveRef}: ${packetValidation.errors.join('; ')}`);
  }

  const contractArtifact = manifest.artifacts?.executorContract;
  if (!contractArtifact?.present) {
    throw new Error(`ARCHIVE_EXECUTOR_CONTRACT_MISSING: ${packet.executorContractRef}`);
  }

  let contract;
  try {
    const contractPath = path.join(archiveRoot, contractArtifact.archiveRef);
    assertPathInside(contractPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    throw new Error(`ARCHIVE_EXECUTOR_CONTRACT_INVALID: ${contractArtifact.archiveRef}: ${error.message}`);
  }

  const validation = validateExecutorContract(contract, {
    expectedSessionId: manifest.sessionId,
    expectedPacketRef: packetArtifact.sourceRef,
    expectedRenderedPromptRef: packet.renderedPromptRef,
  });
  if (!validation.ok) {
    throw new Error(`ARCHIVE_EXECUTOR_CONTRACT_INVALID: ${contractArtifact.archiveRef}: ${validation.errors.join('; ')}`);
  }

  for (const ref of [contract.packetRef, contract.renderedPromptRef]) {
    const archivedRef = path.posix.join('session-artifacts', toPosix(ref));
    const archivedPath = path.join(archiveRoot, archivedRef);
    assertPathInside(archivedPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    if (!fs.existsSync(archivedPath) || !fs.statSync(archivedPath).isFile()) {
      throw new Error(`ARCHIVE_EXECUTOR_CONTRACT_REF_MISSING: ${ref}`);
    }
  }
}

function validateArchivedReviewManifest(archiveRoot, manifest) {
  const reviewManifestArtifact = manifest.artifacts?.reviewManifest;
  if (!reviewManifestArtifact?.present) {
    return;
  }

  let reviewManifest;
  try {
    const reviewManifestPath = path.join(archiveRoot, reviewManifestArtifact.archiveRef);
    assertPathInside(reviewManifestPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    reviewManifest = JSON.parse(fs.readFileSync(reviewManifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`ARCHIVE_REVIEW_MANIFEST_INVALID: ${reviewManifestArtifact.archiveRef}: ${error.message}`);
  }

  const validation = validateReviewManifest(reviewManifest, { expectedSessionId: manifest.sessionId });
  if (!validation.ok) {
    throw new Error(`ARCHIVE_REVIEW_MANIFEST_INVALID: ${reviewManifestArtifact.archiveRef}: ${validation.errors.join('; ')}`);
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

function validateArchivedCloseoutFile(filePath, archiveRef, archiveRoot) {
  if (!archiveRef.startsWith('session-artifacts/closeout/') || !archiveRef.endsWith('.json')) {
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const secretFindings = scanForSecrets(raw);
  if (secretFindings.length > 0) {
    throw new Error(`ARCHIVE_CLOSEOUT_SECRET_DETECTED: ${archiveRef}`);
  }
  let closeout;
  try {
    closeout = JSON.parse(raw);
  } catch (error) {
    throw new Error(`ARCHIVE_CLOSEOUT_INVALID: ${archiveRef}: ${error.message}`);
  }
  const validation = validateCloseoutArtifact(closeout);
  if (!validation.ok) {
    throw new Error(`ARCHIVE_CLOSEOUT_INVALID: ${archiveRef}: ${validation.errors.join('; ')}`);
  }

  for (const ref of [
    closeout.packetRef,
    closeout.executorContractRef,
    closeout.reviewRef,
    closeout.reviewManifestRef,
    ...(closeout.resultRefs || []),
    ...(closeout.evidenceRefs || []),
  ]) {
    if (!ref) {
      continue;
    }
    const archivedRef = path.posix.join('session-artifacts', toPosix(ref));
    const archivedPath = path.join(archiveRoot, archivedRef);
    assertPathInside(archivedPath, archiveRoot, 'ARCHIVE_UNSAFE_PATH');
    if (!fs.existsSync(archivedPath) || !fs.statSync(archivedPath).isFile()) {
      throw new Error(`ARCHIVE_CLOSEOUT_REF_MISSING: ${ref}`);
    }
  }
}

function assertSafeArchivePath(relativePath) {
  try {
    assertSafeRelativePath(relativePath, 'ARCHIVE_UNSAFE_PATH');
  } catch {
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
