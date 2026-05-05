const fs = require('node:fs');
const { verifyCapabilityRequest } = require('./contracts');

function verifyCapabilityInput({ inputPath }) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    return failVerdict('REQUEST_INVALID', 'verify-capability requires --input <request.json>.', '$.input');
  }

  let capabilityRequest;
  try {
    capabilityRequest = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (error) {
    return failVerdict('REQUEST_INVALID', `Capability request input could not be read as JSON: ${error.message}`, '$.input');
  }

  return verifyCapabilityRequest(capabilityRequest);
}

function assertCapabilityVerified(verdict) {
  if (verdict.ok) {
    return verdict;
  }
  const error = new Error(`CAPABILITY_VERIFICATION_FAILED: ${verdict.errors.map((issue) => issue.code).join(', ')}`);
  error.workspaceResult = verdict;
  error.workspaceExitCode = 1;
  throw error;
}

function failVerdict(code, message, issuePath) {
  return {
    kind: 'bmad-workspace-capability-verdict',
    schemaVersion: 1,
    ok: false,
    request: null,
    matchedDeclaration: null,
    errors: [{ code, message, path: issuePath }],
    warnings: [],
    observations: [],
  };
}

module.exports = {
  assertCapabilityVerified,
  verifyCapabilityInput,
};
