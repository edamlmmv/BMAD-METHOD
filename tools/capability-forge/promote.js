const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { forgeError } = require('./errors');
const { resolvePromotionTarget, resolveUnderRoot } = require('./paths');
const { sha256 } = require('./store-postgres');
const { validateDraft } = require('./validate');

const REQUIRED_PROMOTION_FILES = Object.freeze(['SKILL.md', 'module.yaml', 'module-help.csv']);

async function promoteDraft({
  allowDirty = false,
  approved = false,
  approvedBy = 'operator',
  config,
  fileSystem = fs,
  store,
  slug,
  target,
}) {
  const targetPath = resolvePromotionTarget({
    allowedRoots: config.workspace.runtime_roots,
    projectRoot: config.project_root,
    target,
  });
  if (approved !== true) {
    throw forgeError('FORGE_PROMOTE_REQUIRES_APPROVED', 'promote requires explicit approval');
  }
  if (!allowDirty && isGitDirty(config.project_root)) {
    throw forgeError('FORGE_PROMOTE_DIRTY', 'promotion requires a clean worktree; rerun only after review or explicit tested override');
  }
  const validation = await validateDraft({ config, store, slug, writeReport: false });
  if (validation.status !== 'approved') {
    throw forgeError('FORGE_PROMOTE_NOT_APPROVED', 'promotion requires approved database-backed draft state');
  }
  const graph = await store.getPackGraph(slug);
  if (graph.pack.status !== 'approved') {
    throw forgeError('FORGE_PROMOTE_NOT_APPROVED', 'promotion requires approved database status');
  }
  assertDeclaredPromotionArtifacts(graph, slug);

  const sourceRoot = resolveUnderRoot(config.project_root, `.capability-forge/drafts/${slug}`, 'draft root');
  for (const fileName of REQUIRED_PROMOTION_FILES) {
    if (!fileSystem.existsSync(path.join(sourceRoot, fileName))) {
      throw forgeError('FORGE_PROMOTE_MISSING_ARTIFACT', `export-bmad before promotion; missing ${fileName}`);
    }
  }

  const relativeTarget = relativeProjectPath(config.project_root, targetPath);
  const sourceSnapshot = snapshotFiles(fileSystem, sourceRoot, REQUIRED_PROMOTION_FILES);
  const targetExists = fileSystem.existsSync(targetPath);
  const targetSnapshot =
    targetExists && hasRequiredFiles(fileSystem, targetPath, REQUIRED_PROMOTION_FILES)
      ? snapshotFiles(fileSystem, targetPath, REQUIRED_PROMOTION_FILES)
      : null;
  const prepared = await preparePromotion({
    approvedBy,
    graph,
    relativeTarget,
    sourceSnapshot,
    store,
    targetExists,
    targetSnapshot,
  });
  if (prepared.finalized) {
    return { targetPath };
  }

  try {
    copyArtifactsAtomically({
      fileSystem,
      files: REQUIRED_PROMOTION_FILES,
      runtimeRoots: promotionRuntimeRoots(config),
      sourceRoot,
      stagingRoot: promotionStagingRoot({ config, targetPath }),
      targetPath,
    });
  } catch (error) {
    if (error?.code === 'FORGE_PROMOTE_CONFLICT') {
      throw error;
    }
    await markPromotionFailed({
      approvedBy,
      graph,
      reason: error.message,
      relativeTarget,
      store,
    });
    throw forgeError('FORGE_PROMOTE_COPY_FAILED', `promotion copy failed: ${error.message}`);
  }

  const promotedSnapshot = snapshotFiles(fileSystem, targetPath, REQUIRED_PROMOTION_FILES);
  if (promotedSnapshot !== sourceSnapshot) {
    await markPromotionFailed({
      approvedBy,
      graph,
      reason: 'promoted artifact snapshot did not match prepared snapshot',
      relativeTarget,
      store,
    });
    throw forgeError('FORGE_PROMOTE_RECONCILE_REQUIRED', 'promoted artifact snapshot did not match prepared snapshot');
  }
  await finalizePromotion({
    approvedBy,
    graph,
    relativeTarget,
    snapshot: sourceSnapshot,
    store,
  });
  return { targetPath };
}

function assertDeclaredPromotionArtifacts(graph, slug) {
  const declared = new Set(graph.artifacts.map((artifact) => `${artifact.kind}:${artifact.relative_path}`));
  const missing = promotionArtifacts(slug)
    .map((artifact) => `${artifact.kind}:${artifact.relativePath}`)
    .filter((artifactKey) => !declared.has(artifactKey));
  if (missing.length > 0) {
    throw forgeError('FORGE_PROMOTE_MISSING_ARTIFACT', `database draft missing promotion artifact row: ${missing.join(', ')}`);
  }
}

function promotionArtifacts(slug) {
  const draftRoot = `.capability-forge/drafts/${slug}`;
  return [
    { kind: 'skill_md', relativePath: `${draftRoot}/SKILL.md` },
    { kind: 'module_yaml', relativePath: `${draftRoot}/module.yaml` },
    { kind: 'module_help_csv', relativePath: `${draftRoot}/module-help.csv` },
  ];
}

async function preparePromotion({ approvedBy, graph, relativeTarget, sourceSnapshot, store, targetExists, targetSnapshot }) {
  let finalized = false;
  await store.withTransaction(async (client) => {
    await lockPromotion(client, store, graph.pack.id, relativeTarget);
    const existing = await selectPromotion(client, store, graph.pack.id, relativeTarget);
    if (existing) {
      if (existing.status === 'promoted') {
        throw forgeError('FORGE_PROMOTE_COLLISION', `promotion target already promoted: ${relativeTarget}`);
      }
      if (existing.status === 'prepared') {
        if (targetExists) {
          if (targetSnapshot !== existing.artifact_snapshot_sha256 || targetSnapshot !== sourceSnapshot) {
            throw forgeError('FORGE_PROMOTE_RECONCILE_REQUIRED', 'prepared promotion target snapshot does not match current draft');
          }
          await markPromotionPromoted(client, store, graph.pack.id, relativeTarget, approvedBy);
          finalized = true;
          return;
        }
        if (existing.artifact_snapshot_sha256 !== sourceSnapshot) {
          throw forgeError('FORGE_PROMOTE_RECONCILE_REQUIRED', 'prepared promotion snapshot does not match current draft');
        }
        return;
      }
      if (targetExists) {
        throw forgeError('FORGE_PROMOTE_RECONCILE_REQUIRED', 'failed promotion row has an existing target path');
      }
      await updatePromotionPrepared(client, store, graph.pack.id, relativeTarget, approvedBy, sourceSnapshot);
      return;
    }
    if (targetExists) {
      throw forgeError('FORGE_PROMOTE_COLLISION', `promotion target already exists: ${relativeTarget}`);
    }
    await client.query(
      `
        INSERT INTO ${store.qualify('promotion')} (pack_draft_id, target_path, approved_by, status, artifact_snapshot_sha256)
        VALUES ($1, $2, $3, 'prepared', $4)
      `,
      [graph.pack.id, relativeTarget, approvedBy, sourceSnapshot],
    );
    await client.query(
      `
        INSERT INTO ${store.qualify('review_event')} (pack_draft_id, actor, event_type, comment_md)
        VALUES ($1, $2, 'commented', 'Promotion prepared; artifacts will be copied before finalize.')
      `,
      [graph.pack.id, approvedBy],
    );
  });
  return { finalized };
}

async function finalizePromotion({ approvedBy, graph, relativeTarget, snapshot, store }) {
  await store.withTransaction(async (client) => {
    await lockPromotion(client, store, graph.pack.id, relativeTarget);
    const existing = await selectPromotion(client, store, graph.pack.id, relativeTarget);
    if (!existing || existing.status !== 'prepared') {
      throw forgeError('FORGE_PROMOTE_CONFLICT', 'promotion must be prepared before finalize');
    }
    if (existing.artifact_snapshot_sha256 !== snapshot) {
      throw forgeError('FORGE_PROMOTE_RECONCILE_REQUIRED', 'prepared promotion snapshot does not match promoted artifacts');
    }
    await markPromotionPromoted(client, store, graph.pack.id, relativeTarget, approvedBy);
  });
}

async function markPromotionFailed({ approvedBy, graph, reason, relativeTarget, store }) {
  await store.withTransaction(async (client) => {
    await lockPromotion(client, store, graph.pack.id, relativeTarget);
    await client.query(
      `
        UPDATE ${store.qualify('promotion')}
        SET status = 'failed'
        WHERE pack_draft_id = $1 AND target_path = $2 AND status = 'prepared'
      `,
      [graph.pack.id, relativeTarget],
    );
    await client.query(
      `
        INSERT INTO ${store.qualify('review_event')} (pack_draft_id, actor, event_type, comment_md)
        VALUES ($1, $2, 'commented', $3)
      `,
      [graph.pack.id, approvedBy, `Promotion failed before finalize: ${reason}`],
    );
  });
}

async function markPromotionPromoted(client, store, packId, relativeTarget, approvedBy) {
  await client.query(`UPDATE ${store.qualify('pack_draft')} SET status = 'promoted', updated_at = now() WHERE id = $1`, [packId]);
  await client.query(
    `
      UPDATE ${store.qualify('promotion')}
      SET status = 'promoted'
      WHERE pack_draft_id = $1 AND target_path = $2 AND status = 'prepared'
    `,
    [packId, relativeTarget],
  );
  await client.query(
    `
      INSERT INTO ${store.qualify('review_event')} (pack_draft_id, actor, event_type, comment_md)
      VALUES ($1, $2, 'promoted', 'Approved draft artifacts copied to configured safe target.')
    `,
    [packId, approvedBy],
  );
}

async function updatePromotionPrepared(client, store, packId, relativeTarget, approvedBy, sourceSnapshot) {
  await client.query(
    `
      UPDATE ${store.qualify('promotion')}
      SET approved_by = $3, status = 'prepared', artifact_snapshot_sha256 = $4
      WHERE pack_draft_id = $1 AND target_path = $2 AND status = 'failed'
    `,
    [packId, relativeTarget, approvedBy, sourceSnapshot],
  );
}

async function selectPromotion(client, store, packId, relativeTarget) {
  const result = await client.query(
    `
      SELECT status, artifact_snapshot_sha256
      FROM ${store.qualify('promotion')}
      WHERE pack_draft_id = $1 AND target_path = $2
      FOR UPDATE
    `,
    [packId, relativeTarget],
  );
  return result.rows[0] || null;
}

async function lockPromotion(client, store, packId, relativeTarget) {
  const result = await client.query('SELECT pg_try_advisory_xact_lock(hashtext($1)::bigint) AS locked', [
    `${store.qualify('promotion')}:${packId}:${relativeTarget}`,
  ]);
  if (result.rows[0]?.locked !== true) {
    throw forgeError('FORGE_PROMOTE_CONFLICT', `promotion already in progress: ${relativeTarget}`);
  }
}

function copyArtifactsAtomically({ fileSystem, files, runtimeRoots = [], sourceRoot, stagingRoot, targetPath }) {
  const reservationPath = `${targetPath}.lock`;
  const targetParent = path.dirname(targetPath);
  const tempPath = path.join(stagingRoot, `${path.basename(targetPath)}.tmp-${process.pid}-${Date.now()}`);
  let reservation = null;
  fileSystem.rmSync(tempPath, { force: true, recursive: true });
  try {
    fileSystem.mkdirSync(stagingRoot, { recursive: true });
    assertStagingRootOutsideRuntimeRoots({ fileSystem, runtimeRoots, stagingRoot });
    fileSystem.mkdirSync(tempPath, { recursive: true });
    for (const fileName of files) {
      fileSystem.copyFileSync(path.join(sourceRoot, fileName), path.join(tempPath, fileName));
    }
    fileSystem.mkdirSync(targetParent, { recursive: true });
    reservation = reservePromotionTarget(fileSystem, reservationPath);
    if (fileSystem.existsSync(targetPath)) {
      throw promotionConflict(`promotion target already exists before commit: ${targetPath}`);
    }
    renameDirectoryNoReplace({ fileSystem, sourcePath: tempPath, targetPath });
  } catch (error) {
    fileSystem.rmSync(tempPath, { force: true, recursive: true });
    throw error;
  } finally {
    if (reservation) {
      releasePromotionReservation(fileSystem, reservation);
    }
    removeEmptyDirectory(fileSystem, stagingRoot);
  }
}

function promotionStagingRoot({ config, targetPath }) {
  const runtimeRoots = promotionRuntimeRoots(config);
  let stagingRoot = path.join(path.dirname(targetPath), '.forge-promotion-tmp');
  while (runtimeRoots.some((runtimeRoot) => isSameOrInside(stagingRoot, runtimeRoot))) {
    const parent = path.dirname(stagingRoot);
    if (parent === stagingRoot) {
      return path.join(config.project_root, '.forge-promotion-tmp');
    }
    stagingRoot = path.join(path.dirname(parent), '.forge-promotion-tmp');
  }
  return stagingRoot;
}

function promotionRuntimeRoots(config) {
  return config.workspace.runtime_roots.map((runtimeRoot) => resolveUnderRoot(config.project_root, runtimeRoot, 'workspace runtime root'));
}

function assertStagingRootOutsideRuntimeRoots({ fileSystem, runtimeRoots, stagingRoot }) {
  const stagingRealPath = realPathOrAbsolute(fileSystem, stagingRoot);
  for (const runtimeRoot of runtimeRoots) {
    const runtimeRealPath = realPathOrAbsolute(fileSystem, runtimeRoot);
    if (isSameOrInside(stagingRealPath, runtimeRealPath)) {
      throw promotionConflict(`promotion staging root resolves inside runtime root: ${stagingRoot}`);
    }
  }
}

function isSameOrInside(candidatePath, rootPath) {
  return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${path.sep}`);
}

function realPathOrAbsolute(fileSystem, candidatePath) {
  try {
    if (typeof fileSystem.realpathSync?.native === 'function') {
      return fileSystem.realpathSync.native(candidatePath);
    }
    if (typeof fileSystem.realpathSync === 'function') {
      return fileSystem.realpathSync(candidatePath);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  return path.resolve(candidatePath);
}

function reservePromotionTarget(fileSystem, reservationPath) {
  const reservation = { markerPath: path.join(reservationPath, 'forge-promotion-lock.json'), nonce: randomUUID(), reservationPath };
  try {
    fileSystem.mkdirSync(reservationPath, { recursive: false });
    writePromotionReservationMarker(fileSystem, reservation);
    return reservation;
  } catch (error) {
    if (error?.code === 'EEXIST') {
      if (isStaleReservation(fileSystem, reservationPath) && isForgeOwnedReservation(fileSystem, reservationPath)) {
        fileSystem.rmSync(reservationPath, { force: true, recursive: true });
        try {
          fileSystem.mkdirSync(reservationPath, { recursive: false });
          writePromotionReservationMarker(fileSystem, reservation);
        } catch (staleRaceError) {
          if (staleRaceError?.code === 'EEXIST') {
            throw promotionConflict(`promotion already in progress: ${reservationPath}`);
          }
          throw staleRaceError;
        }
        return reservation;
      }
      throw promotionConflict(`promotion already in progress: ${reservationPath}`);
    }
    throw error;
  }
}

function writePromotionReservationMarker(fileSystem, reservation) {
  try {
    fileSystem.writeFileSync(
      reservation.markerPath,
      JSON.stringify(
        {
          kind: 'capability-forge-promotion-lock',
          nonce: reservation.nonce,
          pid: process.pid,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    fileSystem.rmSync(reservation.reservationPath, { force: true, recursive: true });
    throw error;
  }
}

function releasePromotionReservation(fileSystem, reservation) {
  try {
    const marker = JSON.parse(fileSystem.readFileSync(reservation.markerPath, 'utf8'));
    if (marker?.kind === 'capability-forge-promotion-lock' && marker?.nonce === reservation.nonce) {
      fileSystem.rmSync(reservation.reservationPath, { force: true, recursive: true });
    }
  } catch {
    // If the marker disappeared or changed, the reservation is no longer ours.
  }
}

function isForgeOwnedReservation(fileSystem, reservationPath) {
  try {
    const marker = JSON.parse(fileSystem.readFileSync(path.join(reservationPath, 'forge-promotion-lock.json'), 'utf8'));
    return marker?.kind === 'capability-forge-promotion-lock' && typeof marker?.nonce === 'string' && marker.nonce.length > 0;
  } catch {
    return false;
  }
}

function removeEmptyDirectory(fileSystem, dirPath) {
  try {
    fileSystem.rmdirSync(dirPath);
  } catch {
    // Another promotion may still be using the shared staging root.
  }
}

function renameDirectoryNoReplace({ fileSystem, sourcePath, targetPath }) {
  try {
    if (typeof fileSystem.renameNoReplaceSync === 'function') {
      fileSystem.renameNoReplaceSync(sourcePath, targetPath);
      return;
    }
    if (fileSystem.renameSync === fs.renameSync) {
      nativeRenameDirectoryNoReplace(sourcePath, targetPath);
      return;
    }
    fileSystem.renameSync(sourcePath, targetPath);
  } catch (error) {
    if (isTargetCollision(error)) {
      throw promotionConflict(`promotion target already exists before commit: ${targetPath}`);
    }
    throw error;
  }
}

function nativeRenameDirectoryNoReplace(sourcePath, targetPath) {
  const result = spawnSync('python3', ['-c', NATIVE_RENAME_NO_REPLACE_SCRIPT, sourcePath, targetPath], { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status === 0) {
    return;
  }
  const detail = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (/^(17|39|41|66|ENOTEMPTY|EEXIST|EISDIR|ENOTDIR)\b/.test(detail)) {
    throw promotionConflict(`promotion target already exists before commit: ${targetPath}`);
  }
  throw new Error(`atomic no-overwrite rename failed: ${detail || `exit ${result.status}`}`);
}

function promotionConflict(message) {
  return forgeError('FORGE_PROMOTE_CONFLICT', message);
}

function isTargetCollision(error) {
  return ['EEXIST', 'ENOTEMPTY', 'EISDIR', 'ENOTDIR'].includes(error?.code);
}

function isStaleReservation(fileSystem, reservationPath) {
  try {
    const ageMs = Date.now() - fileSystem.statSync(reservationPath).mtimeMs;
    return ageMs > 15 * 60 * 1000;
  } catch {
    return false;
  }
}

function hasRequiredFiles(fileSystem, root, files) {
  return files.every((fileName) => fileSystem.existsSync(path.join(root, fileName)));
}

function snapshotFiles(fileSystem, root, files) {
  return sha256(files.map((fileName) => fileSystem.readFileSync(path.join(root, fileName), 'utf8')).join('\n---\n'));
}

function relativeProjectPath(projectRoot, targetPath) {
  return path.relative(projectRoot, targetPath).split(path.sep).join('/');
}

function isGitDirty(projectRoot) {
  const gitResult = spawnSync('git', ['-C', projectRoot, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  if (gitResult.status !== 0) {
    return false;
  }
  const status = spawnSync('git', ['-C', projectRoot, 'status', '--porcelain'], { encoding: 'utf8' });
  return status.status === 0 && status.stdout.trim() !== '';
}

const NATIVE_RENAME_NO_REPLACE_SCRIPT = String.raw`
import ctypes
import errno
import os
import platform
import sys

source_path = os.fsencode(sys.argv[1])
target_path = os.fsencode(sys.argv[2])

def fail_with_errno(value):
    print(value)
    sys.exit(1)

try:
    if sys.platform == "darwin":
        libc = ctypes.CDLL(None, use_errno=True)
        renamex_np = libc.renamex_np
        renamex_np.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint]
        result = renamex_np(source_path, target_path, ctypes.c_uint(0x00000004))
        if result == 0:
            sys.exit(0)
        fail_with_errno(ctypes.get_errno())

    if sys.platform.startswith("linux"):
        syscall_by_machine = {
            "x86_64": 316,
            "amd64": 316,
            "aarch64": 276,
            "arm64": 276,
            "armv7l": 382,
            "i386": 353,
            "i686": 353,
        }
        syscall_number = syscall_by_machine.get(platform.machine().lower())
        if syscall_number is None:
            print("UNSUPPORTED_PLATFORM")
            sys.exit(2)
        libc = ctypes.CDLL(None, use_errno=True)
        result = libc.syscall(
            ctypes.c_long(syscall_number),
            ctypes.c_int(-100),
            ctypes.c_char_p(source_path),
            ctypes.c_int(-100),
            ctypes.c_char_p(target_path),
            ctypes.c_uint(1),
        )
        if result == 0:
            sys.exit(0)
        fail_with_errno(ctypes.get_errno())

    os.rename(source_path, target_path)
except OSError as error:
    fail_with_errno(error.errno)
`;

module.exports = {
  assertDeclaredPromotionArtifacts,
  copyArtifactsAtomically,
  isGitDirty,
  promoteDraft,
  promotionStagingRoot,
};
