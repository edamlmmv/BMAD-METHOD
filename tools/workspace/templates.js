const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const REQUIRED_FILES = [
  'base-improvement-goal.md',
  'base-mutation-grant.template.json',
  'bmad-work-packet.template.json',
  'base-improvement-prompt.md',
  'worktree-review-checklist.md',
];

function validateBaseImprovementSessionKit(templateRoot) {
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
  const content = readText(root, 'base-improvement-goal.md', errors);
  requireText(
    content,
    ['Base Improvement Session', 'BMAD Work Packet', 'Base Mutation Grant', 'Worktree Review', 'Setup Gate', 'TDD'],
    errors,
    'goal template',
  );
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

  for (const field of [
    'kind',
    'packetVersion',
    'sessionSetup',
    'goalRef',
    'grantRef',
    'promptRef',
    'reviewRef',
    'evidenceGates',
    'evidenceRefs',
    'acceptanceCriteria',
    'traceability',
  ]) {
    if (!(field in packet)) {
      errors.push(`work packet template requires ${field}`);
    }
  }

  if (packet.kind !== 'bmad-work-packet') {
    errors.push('work packet template requires kind=bmad-work-packet');
  }
  if (packet.packetVersion !== 5) {
    errors.push('work packet template requires packetVersion=5');
  }
  if (!Array.isArray(packet.evidenceGates) || packet.evidenceGates.length === 0) {
    errors.push('work packet template requires non-empty evidenceGates');
  }
  if (!Array.isArray(packet.evidenceRefs) || packet.evidenceRefs.length === 0) {
    errors.push('work packet template requires non-empty evidenceRefs');
  }
  if (!Array.isArray(packet.acceptanceCriteria) || packet.acceptanceCriteria.length === 0) {
    errors.push('work packet template requires non-empty acceptanceCriteria');
  }
  if (!packet.traceability || typeof packet.traceability !== 'object') {
    errors.push('work packet template requires traceability object');
  }
  for (const step of ['zoomOut', 'ubiquitousLanguage', 'grillDecisions', 'tddPlan']) {
    if (!packet.sessionSetup || typeof packet.sessionSetup !== 'object' || !(step in packet.sessionSetup)) {
      errors.push(`work packet template requires sessionSetup.${step}`);
    }
  }
}

function validatePromptTemplate(root, errors) {
  const content = readText(root, 'base-improvement-prompt.md', errors);
  requireText(
    content,
    [
      'Base Improvement Session',
      'BMAD Work Packet',
      'Grant Guard',
      'Worktree Review',
      'Setup Gate',
      'TDD',
      'No workspace run',
      'No auto-promotion',
    ],
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

function validateVendorSnapshots(vendorRoot) {
  const errors = [];
  const root = path.resolve(vendorRoot);
  const manifest = readJson(root, 'MANIFEST.json', errors);
  if (!manifest) {
    return result(errors);
  }

  for (const field of ['vendor', 'upstreamRepo', 'sourceCommit', 'importedAt', 'license', 'updateProcedure']) {
    if (manifest[field] === undefined) {
      errors.push(`vendor manifest requires ${field}`);
    }
  }
  if (!manifest.upstreamRepo || manifest.upstreamRepo !== 'https://github.com/mattpocock/skills') {
    errors.push('vendor manifest requires Matt Pocock upstream repo');
  }
  if (!manifest.license || typeof manifest.license.path !== 'string' || typeof manifest.license.sha256 !== 'string') {
    errors.push('vendor manifest requires license path and sha256');
  } else {
    validateSha256(root, manifest.license.path, manifest.license.sha256, errors);
  }
  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
    errors.push('vendor manifest requires non-empty skills');
  } else {
    for (const skill of manifest.skills) {
      for (const field of ['name', 'path', 'sourcePath', 'sha256']) {
        if (typeof skill[field] !== 'string' || skill[field].trim() === '') {
          errors.push(`vendor skill requires ${field}`);
        }
      }
      if (skill.path) {
        validateSha256(root, skill.path, skill.sha256, errors);
      }
      for (const supportFile of skill.supportFiles || []) {
        for (const field of ['path', 'sourcePath', 'sha256']) {
          if (typeof supportFile[field] !== 'string' || supportFile[field].trim() === '') {
            errors.push(`vendor support file requires ${field}`);
          }
        }
        if (supportFile.path) {
          validateSha256(root, supportFile.path, supportFile.sha256, errors);
        }
      }
    }
  }

  return result(errors);
}

function validateSha256(root, relativePath, expectedHash, errors) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`vendor snapshot missing ${relativePath}`);
    return;
  }
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  if (hash !== expectedHash) {
    errors.push(`vendor snapshot hash mismatch for ${relativePath}`);
  }
}

module.exports = {
  validateBaseImprovementSessionKit,
  validateVendorSnapshots,
};
