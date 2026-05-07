const path = require('node:path');
const fs = require('node:fs');
const { parseToml } = require('./toml');
const { forgeError } = require('./errors');

const DEFAULT_CONFIG_PATH = '.capability-forge/forge.toml';

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw forgeError('FORGE_CONFIG_INVALID', `${label} must be a non-empty string`);
  }
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw forgeError('FORGE_CONFIG_INVALID', `${label} must be an array of non-empty strings`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw forgeError('FORGE_CONFIG_INVALID', `${label} must be a table`);
  }
}

function loadForgeConfig(configPath = DEFAULT_CONFIG_PATH, cwd = process.cwd()) {
  const resolvedConfigPath = path.resolve(cwd, configPath);
  if (!fs.existsSync(resolvedConfigPath)) {
    throw forgeError('FORGE_CONFIG_MISSING', `Forge v2 requires config file: ${resolvedConfigPath}`);
  }
  const parsed = parseToml(fs.readFileSync(resolvedConfigPath, 'utf8'), resolvedConfigPath);
  requireExact(parsed.schema_version, 'capability-forge.v2', 'schema_version');

  requireObject(parsed.database, 'database');
  requireString(parsed.database.url_env, 'database.url_env');
  requireString(parsed.database.schema, 'database.schema');
  if (!/^[a-z_][a-z0-9_]*$/.test(parsed.database.schema)) {
    throw forgeError('FORGE_CONFIG_INVALID', 'database.schema must be a safe PostgreSQL identifier');
  }

  requireObject(parsed.evidence, 'evidence');
  requireStringArray(parsed.evidence.roots, 'evidence.roots');
  requireStringArray(parsed.evidence.include, 'evidence.include');
  requireStringArray(parsed.evidence.exclude, 'evidence.exclude');

  requireObject(parsed.output, 'output');
  requireString(parsed.output.draft_root, 'output.draft_root');
  requireString(parsed.output.report_root, 'output.report_root');

  requireObject(parsed.workspace, 'workspace');
  requireExact(parsed.workspace.write_mode, 'draft_only', 'workspace.write_mode');
  requireStringArray(parsed.workspace.runtime_roots, 'workspace.runtime_roots');

  requireObject(parsed.bmad, 'bmad');
  requireString(parsed.bmad.default_parent_module, 'bmad.default_parent_module');

  const projectRoot = path.dirname(path.dirname(resolvedConfigPath));
  return {
    ...parsed,
    config_path: resolvedConfigPath,
    project_root: projectRoot,
  };
}

function requireExact(actual, expected, label) {
  if (actual !== expected) {
    throw forgeError('FORGE_CONFIG_INVALID', `${label} must be ${JSON.stringify(expected)}`);
  }
}

function getDatabaseUrl(config, env = process.env) {
  const value = env[config.database.url_env];
  if (!value) {
    throw forgeError('FORGE_DATABASE_MISSING', `Missing database URL env var: ${config.database.url_env}`);
  }
  return value;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  getDatabaseUrl,
  loadForgeConfig,
};
