const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

const SCHEMA_VERSION = 'bmad-upstream-sync-plan.v1';
const ALLOWED_EVIDENCE_PREFIX = '_bmad-output/upstream-sync/';

const AUTHORITY_INVARIANTS = [
  'Git refs/tags are upstream authority; npm package version is sanity evidence only.',
  'Canonical BMAD/Workspace authority stays JSON.',
  'pack-draft.toml is review-only and never verifier, export, status, or promotion authority.',
  'MCP, Graphify, Codex config, Workspace runtime, and PostgreSQL MCP are advisory evidence only.',
  '_bmad/custom is never modified by upstream-sync.',
  'No scheduler, daemon, hidden Codex loop, auto-push, auto-promotion, or hidden execution.',
];

const NON_GOALS = [
  'No scheduler or daemon.',
  'No hidden Codex loop.',
  'No auto-push.',
  'No auto-promotion.',
  'No TOML, MCP, Graphify, Codex config, Workspace runtime, or PostgreSQL MCP authority.',
  'No live PostgreSQL requirement for normal quality.',
  'No automatic _bmad/custom edits.',
];

function createPlan({ repoRoot = process.cwd(), fromRef, toRef, outputPath, now = new Date().toISOString() }) {
  const root = path.resolve(repoRoot);
  if (!fromRef) throw new Error('upstream-sync requires --from <git-ref-or-tag>');
  if (!toRef) throw new Error('upstream-sync requires --to <git-ref-or-tag>');
  if (!outputPath) throw new Error('upstream-sync requires --output under _bmad-output/upstream-sync/');

  const outputAbs = path.resolve(root, outputPath);
  assertEvidencePath(root, outputAbs);

  const fromCommit = git(root, ['rev-parse', `${fromRef}^{commit}`]);
  const toCommit = git(root, ['rev-parse', `${toRef}^{commit}`]);
  const fromTree = git(root, ['rev-parse', `${fromRef}^{tree}`]);
  const toTree = git(root, ['rev-parse', `${toRef}^{tree}`]);
  const headCommit = git(root, ['rev-parse', 'HEAD']);
  const diffText = git(root, ['diff', '--name-status', '--find-renames', `${fromRef}..${toRef}`]);
  const diffEntries = parseNameStatus(diffText);
  const fromInventory = readSkillInventory(root, fromRef);
  const toInventory = readSkillInventory(root, toRef);
  const packageVersion = readPackageVersion(root);
  const gitStatusShort = git(root, ['status', '--short', '--untracked-files=all'], { allowFailure: true });
  const gitRemote = git(root, ['remote', '-v'], { allowFailure: true });
  const changes = classifyChanges({ fromInventory, toInventory, diffEntries });
  const sourcePaths = unique(diffEntries.flatMap((entry) => entry.paths)).filter(Boolean);
  const localDivergence = headCommit === fromCommit ? [] : [{ code: 'LOCAL_HEAD_DIFFERS_FROM_FROM_REF', headCommit, fromCommit }];
  const manualConflicts = sourcePaths
    .filter((entryPath) => toPosix(entryPath).startsWith('_bmad/custom/'))
    .map((entryPath) => ({ code: 'CUSTOM_OVERRIDE_CHANGE_BLOCKED', path: toPosix(entryPath) }));

  const plan = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now,
    command: {
      fromRef,
      toRef,
      repoRoot: root,
      dryRun: true,
      outputPath: toPosix(path.relative(root, outputAbs)),
    },
    authority: {
      gitRefs: 'source-of-truth',
      npmVersion: 'sanity-evidence-only',
      canonicalData: 'json',
      toml: 'review-only',
      advisorySurfaces: ['MCP', 'Graphify', 'Codex config', 'Workspace runtime', 'PostgreSQL MCP'],
    },
    evidence: {
      packageVersion,
      gitStatusShort,
      gitRemote,
      sprintStatus: fileRef(root, '_bmad-output/implementation-artifacts/sprint-status.yaml'),
      finalForgeEvidence: fileRef(root, '_bmad-output/implementation-artifacts/capability-forge-phase-4-completion-2026-05-10.md'),
      diffNameStatus: diffEntries,
      livePostgreSQL: livePostgreSQLState(),
      npmVersion: {
        source: 'package.json',
        version: packageVersion,
        authority: 'sanity-evidence-only',
      },
    },
    preflight: {
      sourceTreeClean: parseStatus(gitStatusShort).filter((entry) => !isAllowedEvidenceRel(entry.path)).length === 0,
      outputWithinAllowedRoot: true,
      allowedDryRunOutputRoot: ALLOWED_EVIDENCE_PREFIX,
      nodeVersion: process.version,
      platform: process.platform,
    },
    hashInputs: {
      fromRef,
      fromCommit,
      fromTree,
      toRef,
      toCommit,
      toTree,
      diffSha256: sha256(diffText),
      skillInventorySha256: sha256(stableStringify({ fromInventory, toInventory })),
    },
    changes: {
      ...changes,
      helpCatalogChanges: entriesFor(
        diffEntries,
        (entryPath) => entryPath === '_bmad/_config/bmad-help.csv' || entryPath.endsWith('/module-help.csv'),
      ),
      installerManifestChanges: entriesFor(
        diffEntries,
        (entryPath) =>
          entryPath.startsWith('tools/installer/') ||
          entryPath.includes('manifest') ||
          entryPath.endsWith('/module.yaml') ||
          entryPath.endsWith('/module-help.csv') ||
          entryPath === 'package.json',
      ),
      docsTemplateTestChanges: entriesFor(
        diffEntries,
        (entryPath) => entryPath.startsWith('docs/') || entryPath.includes('/templates/') || entryPath.startsWith('test/'),
      ),
      localDivergence,
      manualConflicts,
    },
    risks: buildRisks({ gitStatusShort, localDivergence, manualConflicts }),
    manualBlockers: manualConflicts,
    nonGoals: NON_GOALS,
    invariants: AUTHORITY_INVARIANTS,
    codexDelegation: {
      mode: 'copy-ready-prompt-only',
      prompt: [
        'Use bmad-tool-leverage-review-prompt, then bmad-self-improve via bmad-loop.',
        `Implement approved upstream-sync plan ${toPosix(path.relative(root, outputAbs))}.`,
        'Do not run a scheduler, daemon, hidden loop, auto-push, or auto-promotion.',
      ].join('\n'),
    },
    apply: {
      requiresApproved: true,
      command: `bmad upstream-sync apply --plan ${toPosix(path.relative(root, outputAbs))} --approved`,
      dirtyTreePolicy: `Only ${ALLOWED_EVIDENCE_PREFIX} evidence may be dirty before apply.`,
    },
  };

  plan.planHash = computePlanHash(plan);
  fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
  fs.writeFileSync(outputAbs, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  return plan;
}

function applyPlan({ repoRoot = process.cwd(), planPath, approved = false, dryRun = false }) {
  const root = path.resolve(repoRoot);
  if (!approved) throw new Error('upstream-sync apply requires --approved');
  if (!planPath) throw new Error('upstream-sync apply requires --plan <plan.json>');

  const planAbs = path.resolve(root, planPath);
  const plan = JSON.parse(fs.readFileSync(planAbs, 'utf8'));
  if (plan.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`upstream-sync apply blocked: unsupported plan schema ${plan.schemaVersion || 'unknown'}`);
  }

  const hashCheck = verifyPlanHash(plan);
  if (!hashCheck.ok) {
    throw new Error(`upstream-sync apply blocked: plan hash mismatch (${hashCheck.actual} !== ${hashCheck.expected})`);
  }

  const statusEntries = parseStatus(git(root, ['status', '--short', '--untracked-files=all'], { allowFailure: true }));
  const customDirty = statusEntries.filter((entry) => entry.path.startsWith('_bmad/custom/'));
  if (customDirty.length > 0) {
    throw new Error(`upstream-sync apply blocked: _bmad/custom changes are not allowed (${customDirty.map((e) => e.path).join(', ')})`);
  }
  const dirtySource = statusEntries.filter((entry) => !isAllowedEvidenceRel(entry.path));
  if (dirtySource.length > 0) {
    throw new Error(`upstream-sync apply blocked: dirty source tree (${dirtySource.map((e) => e.path).join(', ')})`);
  }

  const fromCommit = git(root, ['rev-parse', `${plan.command.fromRef}^{commit}`]);
  const toCommit = git(root, ['rev-parse', `${plan.command.toRef}^{commit}`]);
  const diffText = git(root, ['diff', '--name-status', '--find-renames', `${plan.command.fromRef}..${plan.command.toRef}`]);
  if (
    fromCommit !== plan.hashInputs.fromCommit ||
    toCommit !== plan.hashInputs.toCommit ||
    sha256(diffText) !== plan.hashInputs.diffSha256
  ) {
    throw new Error('upstream-sync apply blocked: manifest/hash mismatch; regenerate plan.json');
  }

  const actualDiffEntries = parseNameStatus(diffText);
  const plannedCustomChanges = unique(actualDiffEntries.flatMap((entry) => entry.paths || [])).filter((entryPath) =>
    toPosix(entryPath).startsWith('_bmad/custom/'),
  );
  if (plannedCustomChanges.length > 0) {
    throw new Error(`upstream-sync apply blocked: planned _bmad/custom changes are not allowed (${plannedCustomChanges.join(', ')})`);
  }

  const paths = unique(actualDiffEntries.flatMap((entry) => entry.paths || [])).filter(
    (entryPath) => entryPath && !entryPath.startsWith('_bmad/custom/') && !isAllowedEvidenceRel(entryPath),
  );
  if (paths.length === 0) {
    return { ok: true, applied: false, reason: 'no applicable source paths', checkedFiles: [] };
  }

  const patch = git(root, ['diff', '--binary', `${plan.command.fromRef}..${plan.command.toRef}`, '--', ...paths], { trim: false });
  const check = spawnSync('git', ['apply', '--check', '-'], { cwd: root, input: patch, encoding: 'utf8' });
  if (check.status !== 0) {
    throw new Error(`upstream-sync apply blocked: patch check failed: ${(check.stderr || check.stdout || '').trim()}`);
  }
  if (dryRun) {
    return { ok: true, applied: false, reason: 'dry-run apply check passed', checkedFiles: paths };
  }

  const applied = spawnSync('git', ['apply', '--3way', '-'], { cwd: root, input: patch, encoding: 'utf8' });
  if (applied.status !== 0) {
    throw new Error(`upstream-sync apply failed: ${(applied.stderr || applied.stdout || '').trim()}`);
  }
  return { ok: true, applied: true, checkedFiles: paths };
}

function verifyPlanHash(plan) {
  const expected = plan.planHash;
  const actual = computePlanHash(plan);
  return { ok: expected === actual, expected, actual };
}

function computePlanHash(plan) {
  const clone = structuredClone(plan);
  delete clone.planHash;
  return sha256(stableStringify(clone));
}

function classifyChanges({ fromInventory, toInventory, diffEntries }) {
  const fromById = new Map(fromInventory.map((entry) => [entry.id, entry]));
  const toById = new Map(toInventory.map((entry) => [entry.id, entry]));
  const addedBmads = toInventory.filter((entry) => !fromById.has(entry.id)).map(publicSkillEntry);
  const removedBmads = fromInventory.filter((entry) => !toById.has(entry.id)).map(publicSkillEntry);
  const changedBmads = toInventory
    .filter((entry) => fromById.has(entry.id) && fromById.get(entry.id).sha256 !== entry.sha256)
    .map((entry) => ({ ...publicSkillEntry(entry), fromSha256: fromById.get(entry.id).sha256, toSha256: entry.sha256 }));
  const renamedBmads = detectRenames({ fromInventory, toInventory, diffEntries });
  const mergedBmads = detectMergedBmads({ removed: fromInventory.filter((entry) => !toById.has(entry.id)), toInventory });

  return {
    addedBmads,
    removedBmads,
    renamedBmads,
    mergedBmads,
    changedBmads,
  };
}

function detectRenames({ fromInventory, toInventory, diffEntries }) {
  const fromByPath = new Map(fromInventory.map((entry) => [entry.path, entry]));
  const toByPath = new Map(toInventory.map((entry) => [entry.path, entry]));
  const renamed = [];

  for (const entry of diffEntries) {
    if (!entry.status.startsWith('R') || entry.paths.length < 2) continue;
    const fromEntry = fromByPath.get(entry.paths[0]);
    const toEntry = toByPath.get(entry.paths[1]);
    if (fromEntry && toEntry) {
      renamed.push({ fromId: fromEntry.id, toId: toEntry.id, fromPath: fromEntry.path, toPath: toEntry.path });
    }
  }

  const fromRemoved = fromInventory.filter((fromEntry) => !toInventory.some((toEntry) => toEntry.id === fromEntry.id));
  const toAdded = toInventory.filter((toEntry) => !fromInventory.some((fromEntry) => fromEntry.id === toEntry.id));
  for (const fromEntry of fromRemoved) {
    const match = toAdded.find((toEntry) => toEntry.sha256 === fromEntry.sha256 || toEntry.name === fromEntry.name);
    if (match && !renamed.some((entry) => entry.fromId === fromEntry.id && entry.toId === match.id)) {
      renamed.push({ fromId: fromEntry.id, toId: match.id, fromPath: fromEntry.path, toPath: match.path });
    }
  }

  return renamed;
}

function detectMergedBmads({ removed, toInventory }) {
  const merged = [];
  for (const candidate of toInventory) {
    const haystack = `${candidate.id}\n${candidate.name}\n${candidate.description}\n${candidate.content}`.toLowerCase();
    const fromIds = removed
      .filter((entry) => haystack.includes(entry.id.toLowerCase()) || haystack.includes(entry.name.toLowerCase()))
      .map((entry) => entry.id);
    if (fromIds.length >= 2) {
      merged.push({ intoId: candidate.id, fromIds, path: candidate.path });
    }
  }
  return merged;
}

function readSkillInventory(repoRoot, ref) {
  const listing = git(repoRoot, ['ls-tree', '-r', '--name-only', ref, '--', 'src/core-skills', 'src/bmm-skills'], {
    allowFailure: true,
  });
  return listing
    .split('\n')
    .filter((entryPath) => entryPath.endsWith('/SKILL.md'))
    .map((entryPath) => readSkillAtRef(repoRoot, ref, entryPath))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));
}

function readSkillAtRef(repoRoot, ref, entryPath) {
  const content = git(repoRoot, ['show', `${ref}:${entryPath}`], { allowFailure: true, trim: false });
  if (!content) return null;
  const meta = parseSkillFrontmatter(content);
  const id = path.basename(path.dirname(entryPath));
  return {
    id,
    name: meta.name || id,
    description: meta.description || '',
    module: entryPath.startsWith('src/core-skills/') ? 'core' : 'bmm',
    path: toPosix(entryPath),
    sha256: sha256(content),
    content,
  };
}

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function parseNameStatus(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t').filter(Boolean);
      return {
        status: parts[0],
        paths: parts.slice(1).map(toPosix),
      };
    });
}

function parseStatus(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), path: toPosix(line.slice(3).trim()) }))
    .filter((entry) => entry.path);
}

function buildRisks({ gitStatusShort, localDivergence, manualConflicts }) {
  const risks = [];
  if (parseStatus(gitStatusShort).some((entry) => !isAllowedEvidenceRel(entry.path))) {
    risks.push({ code: 'DIRTY_SOURCE_TREE', severity: 'blocker', message: 'Apply requires clean source tree.' });
  }
  if (localDivergence.length > 0) {
    risks.push({ code: 'LOCAL_DIVERGENCE', severity: 'warning', message: 'HEAD differs from --from ref; inspect before apply.' });
  }
  if (manualConflicts.length > 0) {
    risks.push({ code: 'CUSTOM_OVERRIDE_CHANGE_BLOCKED', severity: 'blocker', message: '_bmad/custom changes require manual handling.' });
  }
  risks.push({
    code: 'LIVE_POSTGRESQL_OPTIONAL',
    severity: process.env.CAPABILITY_FORGE_DATABASE_URL ? 'info' : 'warning',
    message: process.env.CAPABILITY_FORGE_DATABASE_URL
      ? 'Live PostgreSQL evidence can run in explicit gates.'
      : 'Live PostgreSQL evidence skipped because CAPABILITY_FORGE_DATABASE_URL is unset.',
  });
  return risks;
}

function entriesFor(diffEntries, predicate) {
  return diffEntries
    .filter((entry) => entry.paths.some(predicate))
    .map((entry) => ({ status: entry.status, paths: entry.paths.filter(predicate) }));
}

function publicSkillEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    module: entry.module,
    path: entry.path,
    sha256: entry.sha256,
  };
}

function fileRef(repoRoot, relPath) {
  return {
    path: relPath,
    present: fs.existsSync(path.join(repoRoot, relPath)),
  };
}

function livePostgreSQLState() {
  return process.env.CAPABILITY_FORGE_DATABASE_URL
    ? { credentialSignal: 'CAPABILITY_FORGE_DATABASE_URL=set', status: 'available', authority: 'optional-live-gate' }
    : {
        credentialSignal: 'CAPABILITY_FORGE_DATABASE_URL=unset',
        status: 'skipped',
        reason: 'CAPABILITY_FORGE_DATABASE_URL unset',
      };
}

function readPackageVersion(repoRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function assertEvidencePath(repoRoot, outputAbs) {
  const rel = toPosix(path.relative(repoRoot, outputAbs));
  if (rel.startsWith('../') || path.isAbsolute(rel)) {
    throw new Error(`dry-run output must stay inside ${ALLOWED_EVIDENCE_PREFIX}`);
  }
  if (!isAllowedEvidenceRel(rel)) {
    throw new Error(`dry-run output must be under ${ALLOWED_EVIDENCE_PREFIX}`);
  }
}

function isAllowedEvidenceRel(relPath) {
  return toPosix(relPath).startsWith(ALLOWED_EVIDENCE_PREFIX);
}

function git(repoRoot, args, options = {}) {
  try {
    const output = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024,
    });
    return options.trim === false ? output : output.trim();
  } catch (error) {
    if (options.allowFailure) return '';
    throw new Error(`git ${args.join(' ')} failed: ${error.stderr || error.message}`);
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function toPosix(value) {
  return String(value || '')
    .split(path.sep)
    .join('/');
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  SCHEMA_VERSION,
  ALLOWED_EVIDENCE_PREFIX,
  createPlan,
  applyPlan,
  verifyPlanHash,
  computePlanHash,
  parseNameStatus,
  parseStatus,
  stableStringify,
};
