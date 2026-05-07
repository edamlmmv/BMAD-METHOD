class CapabilityForgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CapabilityForgeError';
    this.code = code;
  }
}

function forgeError(code, message) {
  return new CapabilityForgeError(code, message);
}

module.exports = {
  CapabilityForgeError,
  forgeError,
};
