function enrichChecks(checks = [], context = {}) {
  return checks.map((item) => enrichCheck(item, context));
}

function enrichCheck(item, context = {}) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  if (item.nextManualAction) {
    return item;
  }
  return {
    ...item,
    nextManualAction: nextManualActionForCode(item.code, context),
  };
}

function nextManualActionForError(message, context = {}) {
  const code = extractCode(message);
  return nextManualActionForCode(code, context);
}

function extractCode(message) {
  if (typeof message !== 'string') {
    return null;
  }
  const match = message.match(/\b[A-Z][A-Z0-9_]+(?=:|\b)/);
  return match ? match[0] : null;
}

function nextManualActionForCode(code, context = {}) {
  const sessionId = context.sessionId || '<session-id>';
  const runtime = context.runtimeRoot ? ` --runtime-root ${context.runtimeRoot}` : '';
  switch (code) {
    case 'MISSING_INTAKE': {
      return `Run bmad workspace intake ${sessionId}${runtime}.`;
    }
    case 'WORK_PACKET_MISSING':
    case 'RESULT_PACKET_MISSING':
    case 'CLOSEOUT_PACKET_MISSING': {
      return `Run bmad workspace packet ${sessionId}${runtime} after fresh intake and Setup Gate evidence.`;
    }
    case 'STALE_INTAKE': {
      return `Run bmad workspace intake ${sessionId}${runtime}, then rebuild the BMAD Work Packet.`;
    }
    case 'SETUP_REF_MISSING':
    case 'SETUP_REF_CHECKSUM_MISMATCH':
    case 'SETUP_REF_CHECKSUM_MISSING': {
      return `Refresh Setup Gate evidence, then run bmad workspace packet ${sessionId}${runtime}.`;
    }
    case 'SETUP_REF_EXTERNAL_UNVERIFIED': {
      return 'Confirm external Setup Gate provenance before manual execution.';
    }
    case 'REVIEW_MISSING':
    case 'CLOSEOUT_REVIEW_MISSING': {
      return `Run bmad workspace review ${sessionId}${runtime}.`;
    }
    case 'EXECUTOR_CONTRACT_MISSING':
    case 'EXECUTOR_CONTRACT_INVALID':
    case 'EXECUTOR_CONTRACT_INVALID_JSON':
    case 'EXECUTOR_CONTRACT_REF_MISSING': {
      return `Rebuild the BMAD Work Packet with bmad workspace packet ${sessionId}${runtime}.`;
    }
    case 'RESULT_INVALID':
    case 'RESULT_INVALID_JSON':
    case 'RESULT_SECRET_DETECTED': {
      return 'Inspect the Result Ledger artifact, remove unsafe content manually, then rerun status.';
    }
    case 'CLOSEOUT_INVALID':
    case 'CLOSEOUT_INVALID_JSON':
    case 'CLOSEOUT_SECRET_DETECTED': {
      return 'Inspect the Manual Closeout artifact, remove unsafe content manually, then rerun status.';
    }
    case 'RESULT_EXISTS': {
      return 'Choose a new --result-id or inspect the existing Result Ledger artifact.';
    }
    case 'CLOSEOUT_EXISTS': {
      return 'Choose a new --closeout-id or inspect the existing Manual Closeout artifact.';
    }
    case 'RESULT_INPUT_REQUIRED':
    case 'RESULT_INPUT_INVALID_JSON':
    case 'RESULT_INPUT_NOT_FOUND': {
      return 'Provide a readable --input result JSON file and rerun result recording.';
    }
    case 'CLOSEOUT_INPUT_REQUIRED':
    case 'CLOSEOUT_INPUT_INVALID_JSON':
    case 'CLOSEOUT_INPUT_NOT_FOUND': {
      return 'Provide a readable --input closeout JSON file and rerun closeout recording.';
    }
    case 'ROUTE_WORKFLOW_UNKNOWN':
    case 'ROUTE_DECISION_REQUIRED': {
      return 'Select an explicit route with --workflow <skill[:action]> and rebuild the packet.';
    }
    case 'ARCHIVE_OUTPUT_EXISTS': {
      return 'Choose a new --output archive directory.';
    }
    case 'ARCHIVE_CHECKSUM_MISMATCH':
    case 'ARCHIVE_EVIDENCE_INDEX_INVALID':
    case 'ARCHIVE_MANIFEST_INVALID': {
      return 'Inspect the archive bundle and rerun bmad workspace verify-archive.';
    }
    case 'ARCHIVE_NOT_FOUND':
    case 'ARCHIVE_MANIFEST_MISSING': {
      return 'Provide an existing archive directory to bmad workspace verify-archive.';
    }
    case 'DIFF_SOURCE_REQUIRED': {
      return 'Provide --left <archive-dir> and --right <archive-dir> to bmad workspace diff.';
    }
    case 'DIFF_SOURCE_NOT_FOUND':
    case 'DIFF_SOURCE_UNSUPPORTED': {
      return 'Provide existing Workspace archive directories to bmad workspace diff.';
    }
    case 'DIFF_ARCHIVE_INVALID':
    case 'DIFF_UNSAFE_PATH': {
      return 'Inspect the archive bundles with bmad workspace verify-archive before diffing.';
    }
    case 'SESSION_NOT_FOUND':
    case 'SESSION_INVALID': {
      return 'Verify the session id and --runtime-root, then rerun bmad workspace status.';
    }
    case 'BASE_IMPROVEMENT_NOT_READY': {
      return 'Complete Base Improvement grant, setup, and Worktree Review evidence.';
    }
    case 'GRANT_VIOLATION': {
      return 'Review Grant Guard violation evidence before continuing.';
    }
    default: {
      return `Inspect bmad workspace status ${sessionId}${runtime} before continuing.`;
    }
  }
}

module.exports = {
  enrichCheck,
  enrichChecks,
  nextManualActionForCode,
  nextManualActionForError,
};
