function withSessionAliases(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const aliased = { ...result };
  if (typeof aliased.missionId === 'string' && !('sessionId' in aliased)) {
    aliased.sessionId = aliased.missionId;
  }
  if (typeof aliased.missionRoot === 'string' && !('sessionRoot' in aliased)) {
    aliased.sessionRoot = aliased.missionRoot;
  }

  return aliased;
}

function resolveLaunchSessionId({ missionId, sessionId }) {
  if (missionId && sessionId && missionId !== sessionId) {
    throw new Error('conflicting-session-id-and-mission-id');
  }

  return sessionId || missionId;
}

module.exports = {
  resolveLaunchSessionId,
  withSessionAliases,
};
