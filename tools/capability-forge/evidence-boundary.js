const { forgeError } = require('./errors');

const FORBIDDEN_LIVE_EVIDENCE_FIELDS = Object.freeze([
  'queryResults',
  'liveMcp',
  'postgres_live',
  'dockerRuntime',
  'network',
  'liveSchema',
  'sampleRows',
  'sampleRow',
]);

function assertSecretSafeEvidence(content, label) {
  const allowed = content.replaceAll('ctx7_test_placeholder_DO_NOT_USE', '');
  if (/ctx7_[A-Za-z0-9_-]{12,}/.test(allowed)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains Context7-key-like value`);
  }
  if (/\bsk-[A-Za-z0-9_-]{8,}/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains API-key-like value`);
  }
  if (/postgres(?:ql)?:\/\/[^"'<\s)]+/i.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains PostgreSQL URL`);
  }
  if (/POSTGRES_URL\s*=\s*(?!set\b|unset\b)/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains raw POSTGRES_URL value`);
  }
  if (/DATABASE_URL\s*=/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains DATABASE_URL value`);
  }
  if (/PGPASSWORD\s*=/.test(content)) {
    throw forgeError('FORGE_SECRET_DETECTED', `${label} contains PGPASSWORD value`);
  }
  for (const field of FORBIDDEN_LIVE_EVIDENCE_FIELDS) {
    const fieldPattern = new RegExp(String.raw`(?:"${field}"|\b${field})\s*:`, 'i');
    if (fieldPattern.test(content)) {
      throw forgeError('FORGE_SECRET_DETECTED', `${label} contains forbidden live evidence field: ${field}`);
    }
  }
}

module.exports = {
  assertSecretSafeEvidence,
  FORBIDDEN_LIVE_EVIDENCE_FIELDS,
};
