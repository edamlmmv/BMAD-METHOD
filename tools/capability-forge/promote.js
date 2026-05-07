const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { forgeError } = require('./errors');
const { resolvePromotionTarget, resolveUnderRoot } = require('./paths');
const { sha256 } = require('./store-postgres');
const { validateDraft } = require('./validate');

const REQUIRED_PROMOTION_FILES = Object.freeze(['SKILL.md', 'module.yaml', 'module-help.csv']);

async function promoteDraft({ allowDirty = false, approvedBy = 'operator', config, fileSystem = fs, store, slug, target }) {
  const validation = await validateDraft({ config, store, slug, reconcile: true });
  if (validation.status !== 'approved') {
    throw forgeError('FORGE_PROMOTE_NOT_APPROVED', 'promotion requires pack-draft.toml status = "approved"');
  }
  const graph = await store.getPackGraph(slug);
  if (graph.pack.status !== 'approved') {
    throw forgeError('FORGE_PROMOTE_NOT_APPROVED', 'promotion requires approved database status');
  }
  const targetPath = resolvePromotionTarget({
    allowedRoots: config.workspace.runtime_roots,
    projectRoot: config.project_root,
    target,
  });
  if (!allowDirty && isGitDirty(config.project_root)) {
    throw forgeError('FORGE_PROMOTE_DIRTY', 'promotion requires a clean worktree; rerun only after review or explicit tested override');
  }

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
    copyArtifactsAtomically({ fileSystem, files: REQUIRED_PROMOTION_FILES, sourceRoot, targetPath });
  } catch (error) {
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

function copyArtifactsAtomically({ fileSystem, files, sourceRoot, targetPath }) {
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fileSystem.rmSync(tempPath, { force: true, recursive: true });
  try {
    fileSystem.mkdirSync(tempPath, { recursive: true });
    for (const fileName of files) {
      fileSystem.copyFileSync(path.join(sourceRoot, fileName), path.join(tempPath, fileName));
    }
    fileSystem.renameSync(tempPath, targetPath);
  } catch (error) {
    fileSystem.rmSync(tempPath, { force: true, recursive: true });
    throw error;
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

module.exports = {
  copyArtifactsAtomically,
  isGitDirty,
  promoteDraft,
};
