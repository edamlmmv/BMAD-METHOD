const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FILES = [
  'self-improvement-goal.md',
  'base-mutation-grant.template.json',
  'bmad-work-packet.template.json',
  'self-improvement-prompt.md',
  'worktree-review-checklist.md',
];

function validateSelfImprovementPacketKit(templateRoot) {
  const errors = [];
  const root = path.resolve(templateRoot);

  for (const fileName of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(root, fileName))) {
      errors.push(`templates.${fileName} is required`);
    }
  }

  if (errors.length > 0) {
    return result(errors);
  }

  validateGoalTemplate(root, errors);
  validateGrantTemplate(root, errors);
  validateWorkPacketTemplate(root, errors);
  validatePromptTemplate(root, errors);
  validateReviewTemplate(root, errors);

  return result(errors);
}

function validateGoalTemplate(root, errors) {
  const content = readText(root, 'self-improvement-goal.md', errors);
  requireText(content, ['Workspace Session', 'BMAD Work Packet', 'Base Mutation Grant', 'Worktree Review'], errors, 'goal template');
}

function validateGrantTemplate(root, errors) {
  const grant = readJson(root, 'base-mutation-grant.template.json', errors);
  if (!grant) {
    return;
  }

  if (grant.baseMutationGrant !== true) {
    errors.push('grant template requires baseMutationGrant=true');
  }
  if (!Array.isArray(grant.allowedBasePaths) || grant.allowedBasePaths.length === 0) {
    errors.push('grant template requires non-empty allowedBasePaths');
  }
  if (typeof grant.bmadArtifactRef !== 'string' || grant.bmadArtifactRef.trim() === '') {
    errors.push('grant template requires bmadArtifactRef');
  }
}

function validateWorkPacketTemplate(root, errors) {
  const packet = readJson(root, 'bmad-work-packet.template.json', errors);
  if (!packet) {
    return;
  }

  for (const field of ['goalRef', 'grantRef', 'promptRef', 'reviewRef', 'acceptanceCriteria', 'traceability']) {
    if (!(field in packet)) {
      errors.push(`work packet template requires ${field}`);
    }
  }

  if (packet.packetType !== 'BMAD Work Packet') {
    errors.push('work packet template requires packetType=BMAD Work Packet');
  }
  if (!Array.isArray(packet.acceptanceCriteria) || packet.acceptanceCriteria.length === 0) {
    errors.push('work packet template requires non-empty acceptanceCriteria');
  }
  if (!packet.traceability || typeof packet.traceability !== 'object') {
    errors.push('work packet template requires traceability object');
  }
}

function validatePromptTemplate(root, errors) {
  const content = readText(root, 'self-improvement-prompt.md', errors);
  requireText(
    content,
    ['BMAD Work Packet', 'Grant Guard', 'Worktree Review', 'No workspace run', 'No auto-promotion'],
    errors,
    'prompt template',
  );
}

function validateReviewTemplate(root, errors) {
  const content = readText(root, 'worktree-review-checklist.md', errors);
  requireText(content, ['Worktree Review', 'Base Mutation Grant', 'Promotion', 'explicit'], errors, 'review template');
}

function readText(root, fileName, errors) {
  try {
    return fs.readFileSync(path.join(root, fileName), 'utf8');
  } catch (error) {
    errors.push(`templates.${fileName} cannot be read: ${error.message}`);
    return '';
  }
}

function readJson(root, fileName, errors) {
  try {
    return JSON.parse(readText(root, fileName, errors));
  } catch (error) {
    errors.push(`templates.${fileName} must be valid JSON: ${error.message}`);
    return null;
  }
}

function requireText(content, requiredText, errors, label) {
  for (const text of requiredText) {
    if (!content.includes(text)) {
      errors.push(`${label} requires "${text}"`);
    }
  }
}

function result(errors) {
  return {
    ok: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateSelfImprovementPacketKit,
};
