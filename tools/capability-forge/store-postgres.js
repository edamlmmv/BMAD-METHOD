const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getDatabaseUrl } = require('./config');
const { forgeError } = require('./errors');

const MIGRATION_DIR = path.join(__dirname, 'migrations');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function schemaSql(config) {
  return `"${config.database.schema}"`;
}

function qualify(config, name) {
  return `${schemaSql(config)}.${name}`;
}

function applyConfiguredSchema(sql, config) {
  return sql.replaceAll('capability_forge', config.database.schema);
}

function stripMigrationTransaction(sql) {
  return sql.replace(/^\s*BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, '');
}

function createPostgresStore(config, env = process.env) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: getDatabaseUrl(config, env),
    statement_timeout: config.database.statement_timeout_ms || 5000,
  });

  async function close() {
    await pool.end();
  }

  async function query(text, params = []) {
    return pool.query(text, params);
  }

  async function withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function migrate() {
    await query(`CREATE SCHEMA IF NOT EXISTS ${schemaSql(config)}`);
    await query(`
      CREATE TABLE IF NOT EXISTS ${qualify(config, 'schema_migration')} (
        version TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationFiles = fs
      .readdirSync(MIGRATION_DIR)
      .filter((entry) => /^\d+_.*\.sql$/.test(entry))
      .sort();
    const applied = [];
    for (const fileName of migrationFiles) {
      const version = fileName.replace(/\.sql$/, '');
      const filePath = path.join(MIGRATION_DIR, fileName);
      const rawSql = fs.readFileSync(filePath, 'utf8');
      const checksum = sha256(rawSql);
      const existing = await query(`SELECT checksum FROM ${qualify(config, 'schema_migration')} WHERE version = $1`, [version]);
      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== checksum) {
          throw forgeError('FORGE_MIGRATION_CHECKSUM', `migration ${version} checksum changed`);
        }
        applied.push({ version, status: 'already_applied' });
        continue;
      }
      await withTransaction(async (client) => {
        await client.query(applyConfiguredSchema(stripMigrationTransaction(rawSql), config));
        await client.query(`INSERT INTO ${qualify(config, 'schema_migration')} (version, checksum) VALUES ($1, $2)`, [version, checksum]);
      });
      applied.push({ version, status: 'applied' });
    }
    return applied;
  }

  async function resetDev() {
    await query(`DROP SCHEMA IF EXISTS ${schemaSql(config)} CASCADE`);
    return { droppedSchema: config.database.schema };
  }

  async function createRun(command) {
    const result = await query(`INSERT INTO ${qualify(config, 'forge_run')} (command, status) VALUES ($1, 'running') RETURNING id`, [
      command,
    ]);
    return Number(result.rows[0].id);
  }

  async function finishRun(id, status, notes = '') {
    await query(`UPDATE ${qualify(config, 'forge_run')} SET status = $2, ended_at = now(), notes = $3 WHERE id = $1`, [id, status, notes]);
  }

  async function upsertEvidenceFile(client, file) {
    const result = await client.query(
      `
        INSERT INTO ${qualify(config, 'evidence_file')} (uri, sha256, media_type, bytes, stale)
        VALUES ($1, $2, $3, $4, false)
        ON CONFLICT (sha256)
        DO UPDATE SET uri = EXCLUDED.uri, media_type = EXCLUDED.media_type, bytes = EXCLUDED.bytes, last_seen_at = now(), stale = false
        RETURNING id
      `,
      [file.uri, file.sha256, file.mediaType, file.bytes],
    );
    return Number(result.rows[0].id);
  }

  async function replaceEvidenceSpans(client, evidenceFileId, spans) {
    await client.query(`DELETE FROM ${qualify(config, 'evidence_span')} WHERE evidence_file_id = $1`, [evidenceFileId]);
    for (const span of spans) {
      await client.query(
        `
          INSERT INTO ${qualify(config, 'evidence_span')} (evidence_file_id, heading, line_start, line_end, content_text)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [evidenceFileId, span.heading, span.lineStart, span.lineEnd, span.contentText],
      );
    }
  }

  async function searchEvidence(searchText, limit = 25) {
    const result = await query(
      `
        SELECT
          evidence_ref.ref,
          evidence_ref.uri,
          evidence_ref.heading,
          evidence_ref.line_start,
          evidence_ref.line_end,
          evidence_ref.stale,
          ts_rank_cd(
            evidence_span.search_vector,
            websearch_to_tsquery('english', $1)
          ) AS rank
        FROM ${qualify(config, 'evidence_span')} AS evidence_span
        JOIN ${qualify(config, 'evidence_ref')} AS evidence_ref
          ON evidence_ref.evidence_span_id = evidence_span.id
        WHERE evidence_span.search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY rank DESC, evidence_ref.uri ASC, evidence_ref.line_start ASC
        LIMIT $2
      `,
      [searchText, limit],
    );
    return result.rows;
  }

  async function getPackBySlug(slug) {
    const result = await query(`SELECT * FROM ${qualify(config, 'pack_draft')} WHERE slug = $1`, [slug]);
    return result.rows[0] || null;
  }

  async function getPackGraph(slug) {
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw forgeError('FORGE_PACK_NOT_FOUND', `pack draft not found: ${slug}`);
    }
    const capabilities = (
      await query(`SELECT * FROM ${qualify(config, 'capability_draft')} WHERE pack_draft_id = $1 ORDER BY sort_order, id`, [pack.id])
    ).rows;
    const evidenceRefs = (
      await query(
        `
          SELECT DISTINCT
            evidence_ref.ref,
            evidence_ref.uri,
            evidence_ref.sha256,
            evidence_ref.heading,
            evidence_ref.line_start,
            evidence_ref.line_end,
            capability_evidence_ref.purpose,
            capability_draft.capability_id
          FROM ${qualify(config, 'capability_draft')} AS capability_draft
          JOIN ${qualify(config, 'capability_evidence_ref')} AS capability_evidence_ref
            ON capability_evidence_ref.capability_draft_id = capability_draft.id
          JOIN ${qualify(config, 'evidence_ref')} AS evidence_ref
            ON evidence_ref.evidence_span_id = capability_evidence_ref.evidence_span_id
          WHERE capability_draft.pack_draft_id = $1
          ORDER BY evidence_ref.uri, evidence_ref.line_start
        `,
        [pack.id],
      )
    ).rows;
    const artifacts = (
      await query(`SELECT * FROM ${qualify(config, 'artifact_draft')} WHERE pack_draft_id = $1 ORDER BY kind, relative_path`, [pack.id])
    ).rows;
    return { artifacts, capabilities, evidenceRefs, pack };
  }

  return {
    close,
    config,
    createRun,
    finishRun,
    getPackBySlug,
    getPackGraph,
    migrate,
    qualify: (name) => qualify(config, name),
    query,
    resetDev,
    searchEvidence,
    upsertEvidenceFile,
    replaceEvidenceSpans,
    withTransaction,
  };
}

module.exports = {
  createPostgresStore,
  sha256,
  stripMigrationTransaction,
};
