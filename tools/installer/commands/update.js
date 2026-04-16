const path = require('node:path');
const { execFileSync } = require('node:child_process');
const fs = require('../fs-native');
const prompts = require('../prompts');
const { Installer } = require('../core/installer');

const installer = new Installer();

const QUICK_UPDATE_PREFIXES = ['src/', 'tools/installer/'];
const QUICK_UPDATE_EXACT = new Set(['package.json']);

const RUNTIME_INSTALL_PREFIXES = ['src/', 'tools/runtime/'];
const RUNTIME_INSTALL_EXACT = new Set(['package.json', 'bmad.config.yaml', 'BMAD.md', '.hermes.md']);

function runGit(cwd, args, options = {}) {
  const { allowFailure = false, inherit = false } = options;

  try {
    return execFileSync('git', args, {
      cwd,
      encoding: inherit ? undefined : 'utf8',
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (allowFailure) {
      return null;
    }

    const stderr = error.stderr?.toString().trim();
    const stdout = error.stdout?.toString().trim();
    const detail = stderr || stdout || error.message;
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

function normalizeGitOutput(output) {
  return output ? output.toString().trim() : '';
}

function splitLines(output) {
  return normalizeGitOutput(output)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function parsePorcelainStatus(output) {
  return normalizeGitOutput(output)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      code: line.slice(0, 2),
      file: line.slice(3),
    }));
}

function listMatches(paths, prefixes, exactMatches) {
  return paths.filter((file) => exactMatches.has(file) || prefixes.some((prefix) => file.startsWith(prefix)));
}

function summarizeList(items, limit = 8) {
  if (items.length === 0) return 'none';
  if (items.length <= limit) return items.join('\n');
  return `${items.slice(0, limit).join('\n')}\n...and ${items.length - limit} more`;
}

function boolLabel(value) {
  return value ? 'yes' : 'no';
}

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60);
}

function intersectFiles(left, right) {
  const rightSet = new Set(right);
  return left.filter((file) => rightSet.has(file));
}

function getCommitSummaries(cwd, rangeSpec) {
  return splitLines(runGit(cwd, ['log', '--reverse', '--format=%H%x09%s', rangeSpec])).map((line) => {
    const [sha, subject] = line.split('\t');
    return { sha, subject };
  });
}

function getCommitFiles(cwd, sha) {
  return splitLines(runGit(cwd, ['diff-tree', '--no-commit-id', '--name-only', '-r', sha]));
}

function getDiffFiles(cwd, rangeSpec) {
  return splitLines(runGit(cwd, ['diff', '--name-only', rangeSpec]));
}

function getRemotes(cwd) {
  return splitLines(runGit(cwd, ['remote']));
}

function parseRemoteTrackingRef(cwd, ref) {
  if (!ref || ref.startsWith('refs/')) {
    return null;
  }

  const slashIndex = ref.indexOf('/');
  if (slashIndex <= 0) {
    return null;
  }

  const remote = ref.slice(0, slashIndex);
  const branch = ref.slice(slashIndex + 1);

  return getRemotes(cwd).includes(remote) && branch ? { remote, branch } : null;
}

function classifyMergeStatus({ ahead, behind, overlapFiles }) {
  if (behind === 0) return 'already-contained';
  if (ahead === 0) return 'fast-forward';
  if (overlapFiles.length === 0) return 'diverged-no-overlap';
  return 'conflict-risk';
}

function mergeStatusSummary(status) {
  switch (status) {
    case 'already-contained': {
      return 'Target ref is already contained in the current branch.';
    }
    case 'fast-forward': {
      return 'Current branch can be fast-forwarded to the target ref.';
    }
    case 'diverged-no-overlap': {
      return 'Both sides changed since the merge base, but no overlapping files were detected.';
    }
    case 'conflict-risk': {
      return 'Both sides changed overlapping files since the merge base; manual merge analysis is recommended.';
    }
    default: {
      return 'Merge status is unknown.';
    }
  }
}

async function writeBmadUpdateBrief(gitRoot, context) {
  const outputFolder = await installer.getOutputFolder(gitRoot);
  const outputDir = path.join(gitRoot, outputFolder);
  await fs.ensureDir(outputDir);

  const created = new Date().toISOString();
  const dateStamp = created.slice(0, 10);
  const briefPath = path.join(outputDir, `git-update-brief-${dateStamp}-${slugify(context.targetRef)}.md`);

  const formatCommitSection = (title, commits) => {
    const lines = [`## ${title}`, ''];

    if (commits.length === 0) {
      lines.push('- none', '');
      return lines.join('\n');
    }

    for (const commit of commits) {
      lines.push(`### ${commit.sha.slice(0, 8)} ${commit.subject}`);
      if (commit.files.length === 0) {
        lines.push('- files: none detected');
      } else {
        lines.push('- files:');
        for (const file of commit.files) {
          lines.push(`  - ${file}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  const contents = [
    '---',
    'type: bmad-git-update-brief',
    `created: "${created}"`,
    `source_branch: "${context.branch}"`,
    `target_ref: "${context.targetRef}"`,
    `merge_base: "${context.mergeBase}"`,
    `ahead: ${context.ahead}`,
    `behind: ${context.behind}`,
    `merge_status: "${context.mergeStatus}"`,
    '---',
    '',
    '## Summary',
    '',
    `- source branch: \`${context.branch}\``,
    `- target ref: \`${context.targetRef}\``,
    `- ahead / behind relative to target: ${context.ahead} / ${context.behind}`,
    `- merge status: \`${context.mergeStatus}\``,
    `- interpretation: ${mergeStatusSummary(context.mergeStatus)}`,
    `- overlapping files since merge base: ${context.overlapFiles.length}`,
    '',
    '## File Delta Summary',
    '',
    `- current-branch-only files: ${context.currentOnlyFiles.length}`,
    `- target-only files: ${context.targetOnlyFiles.length}`,
    '',
    '## Overlap Files',
    '',
    ...(context.overlapFiles.length > 0 ? context.overlapFiles.map((file) => `- ${file}`) : ['- none']),
    '',
    formatCommitSection('Target-Only Commits', context.targetOnlyCommits),
    formatCommitSection('Current-Branch-Only Commits', context.currentOnlyCommits),
    '## Recommended BMAD Flow',
    '',
    '- Start with `bmad-discovery-rigor` using this brief as the source artifact.',
    '- If the target branch introduces conventions you want to adopt, update source BMAD surfaces rather than generated installs.',
    '- If overlap files are present, use `bmad-quick-dev` or `bmad-code-review` to resolve the merge intentionally after discovery.',
    '- Regenerate generated BMAD/runtime surfaces only after source-level decisions are complete.',
    '',
  ].join('\n');

  await fs.writeFile(briefPath, contents, 'utf8');
  return briefPath;
}

module.exports = {
  command: 'update',
  description: 'Plan or apply a safe git-based BMAD update for this checkout',
  options: [
    ['--directory <path>', 'Project directory or git checkout to inspect (default: current directory)'],
    ['--target <ref>', 'Explicit git ref to compare against (for example: upstream/main)'],
    ['--apply', 'Apply the plan when the target is fast-forward compatible and refresh generated BMAD/runtime surfaces'],
    ['--fetch', 'Fetch the target remote before computing update status (apply implies fetch when target is remote-tracking)'],
    ['--skip-quick-update', 'Skip BMAD quick-update after a successful fast-forward update'],
    ['--skip-runtime-install', 'Skip runtime bundle reinstall after a successful fast-forward update'],
    ['-y, --yes', 'Accept prompts automatically where possible'],
  ],
  action: async (options) => {
    try {
      const projectDir = path.resolve(options.directory || process.cwd());
      const gitRoot = normalizeGitOutput(runGit(projectDir, ['rev-parse', '--show-toplevel']));
      const { bmadDir } = await installer.findBmadDir(gitRoot);
      const hasBmadInstall = await fs.pathExists(bmadDir);

      const branch = normalizeGitOutput(runGit(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']));
      const upstream = normalizeGitOutput(
        runGit(gitRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
          allowFailure: true,
        }),
      );
      const targetRef = options.target?.trim() || upstream || null;

      if (!targetRef) {
        throw new Error('No target ref configured. Set a branch upstream or pass --target <ref>.');
      }

      const dirtyEntries = parsePorcelainStatus(runGit(gitRoot, ['status', '--porcelain', '--untracked-files=all']));
      const dirtyFiles = dirtyEntries.map((entry) => `${entry.code.trim() || '??'} ${entry.file}`);

      if (options.apply && dirtyEntries.length > 0) {
        await prompts.intro('BMAD Git Update');
        await prompts.note(
          [`Repo root: ${gitRoot}`, `Branch: ${branch}`, `Target ref: ${targetRef}`, 'Working tree dirty: yes'].join('\n'),
          'Apply Blocked',
        );
        await prompts.note(summarizeList(dirtyFiles), 'Local Changes');
        throw new Error('Refusing to apply update over a dirty worktree. Commit, stash, or branch your local changes first.');
      }

      const remoteTarget = parseRemoteTrackingRef(gitRoot, targetRef);
      if (options.fetch || (options.apply && remoteTarget)) {
        if (remoteTarget) {
          const s = await prompts.spinner();
          s.start(`Fetching ${remoteTarget.remote}/${remoteTarget.branch}...`);
          runGit(gitRoot, ['fetch', '--prune', remoteTarget.remote, remoteTarget.branch]);
          s.stop(`Fetched ${remoteTarget.remote}/${remoteTarget.branch}`);
        } else if (options.fetch) {
          await prompts.log.warn(`Target ref ${targetRef} is not a remote-tracking ref; skipping fetch.`);
        }
      }

      const counts = normalizeGitOutput(runGit(gitRoot, ['rev-list', '--left-right', '--count', `HEAD...${targetRef}`])).split(/\s+/);
      const ahead = Number.parseInt(counts[0] || '0', 10);
      const behind = Number.parseInt(counts[1] || '0', 10);
      const incomingFiles = behind > 0 ? getDiffFiles(gitRoot, `HEAD..${targetRef}`) : [];

      const mergeBase = normalizeGitOutput(runGit(gitRoot, ['merge-base', 'HEAD', targetRef], { allowFailure: true }));
      const currentOnlyFiles = mergeBase ? getDiffFiles(gitRoot, `${mergeBase}..HEAD`) : [];
      const targetOnlyFiles = mergeBase ? getDiffFiles(gitRoot, `${mergeBase}..${targetRef}`) : [];
      const overlapFiles = intersectFiles(currentOnlyFiles, targetOnlyFiles);
      const mergeStatus = classifyMergeStatus({ ahead, behind, overlapFiles });

      const currentOnlyCommits =
        mergeBase && ahead > 0
          ? getCommitSummaries(gitRoot, `${mergeBase}..HEAD`).map((commit) => ({
              ...commit,
              files: getCommitFiles(gitRoot, commit.sha),
            }))
          : [];
      const targetOnlyCommits =
        mergeBase && behind > 0
          ? getCommitSummaries(gitRoot, `${mergeBase}..${targetRef}`).map((commit) => ({
              ...commit,
              files: getCommitFiles(gitRoot, commit.sha),
            }))
          : [];

      const quickUpdateFiles = listMatches(incomingFiles, QUICK_UPDATE_PREFIXES, QUICK_UPDATE_EXACT);
      const runtimeInstallFiles = listMatches(incomingFiles, RUNTIME_INSTALL_PREFIXES, RUNTIME_INSTALL_EXACT);
      const shouldQuickUpdate = hasBmadInstall && quickUpdateFiles.length > 0 && !options.skipQuickUpdate;
      const shouldRuntimeInstall = runtimeInstallFiles.length > 0 && !options.skipRuntimeInstall;

      const shouldWriteBrief = mergeBase && (ahead > 0 || behind > 0);
      const briefPath = shouldWriteBrief
        ? await writeBmadUpdateBrief(gitRoot, {
            branch,
            targetRef,
            mergeBase,
            ahead,
            behind,
            mergeStatus,
            overlapFiles,
            currentOnlyFiles,
            targetOnlyFiles,
            currentOnlyCommits,
            targetOnlyCommits,
          })
        : null;

      await prompts.intro('BMAD Git Update');
      await prompts.note(
        [
          `Repo root: ${gitRoot}`,
          `Branch: ${branch}`,
          `Target ref: ${targetRef}`,
          `Branch upstream: ${upstream || 'none'}`,
          `Working tree dirty: ${boolLabel(dirtyEntries.length > 0)}`,
          `Ahead / Behind relative to target: ${ahead} / ${behind}`,
          `Merge status: ${mergeStatus}`,
          `BMAD install detected: ${boolLabel(hasBmadInstall)}`,
          `Would run BMAD quick update: ${boolLabel(shouldQuickUpdate)}`,
          `Would run runtime install: ${boolLabel(shouldRuntimeInstall)}`,
          `BMAD update brief: ${briefPath || 'not needed'}`,
        ].join('\n'),
        'Plan Summary',
      );

      if (dirtyFiles.length > 0) {
        await prompts.note(summarizeList(dirtyFiles), 'Local Changes');
      }

      if (incomingFiles.length > 0) {
        await prompts.note(summarizeList(incomingFiles), 'Incoming Target Changes');
      }

      if (overlapFiles.length > 0) {
        await prompts.note(summarizeList(overlapFiles), 'Overlap Files');
      }

      if (!options.apply) {
        const nextSteps = [];

        if (dirtyEntries.length > 0) {
          nextSteps.push('Clean up or commit your local changes before running apply mode.');
        }
        if (mergeStatus === 'already-contained') {
          nextSteps.push('Target ref is already contained in the current branch.');
        } else if (mergeStatus === 'fast-forward') {
          nextSteps.push('Run `bmad update --apply` when you want to fast-forward this checkout.');
        } else {
          nextSteps.push(`Review the BMAD update brief at ${briefPath} before attempting a manual merge or rebase.`);
        }

        await prompts.outro(nextSteps.join('\n'));
        process.exit(0);
      }

      if (mergeStatus === 'already-contained') {
        await prompts.log.info('No incoming target commits detected. Current branch already contains the target ref.');
      } else if (mergeStatus === 'fast-forward') {
        if (!options.yes) {
          const confirmed = await prompts.confirm({
            message: `Fast-forward ${branch} to ${targetRef}?`,
            default: true,
          });

          if (!confirmed) {
            await prompts.outro('Update cancelled.');
            process.exit(0);
          }
        }

        const s = await prompts.spinner();
        s.start(`Fast-forwarding ${branch} to ${targetRef}...`);
        runGit(gitRoot, ['merge', '--ff-only', targetRef], { inherit: true });
        s.stop(`Updated ${branch}`);
      } else {
        throw new Error(
          `Target ${targetRef} is not fast-forward compatible with ${branch}. Review ${briefPath} and resolve the merge deliberately via BMAD.`,
        );
      }

      if (shouldQuickUpdate) {
        await prompts.log.info('Refreshing BMAD install via quick-update...');
        await installer.quickUpdate({ directory: gitRoot, skipPrompts: options.yes || false });
      } else if (hasBmadInstall) {
        await prompts.log.info('Skipping BMAD quick-update (no source changes requiring regeneration detected).');
      }

      if (shouldRuntimeInstall) {
        await prompts.log.info('Refreshing Hermes/OpenClaw runtime bundles...');
        execFileSync(process.execPath, [path.join(gitRoot, 'tools/runtime/openclaw-hermes-runtime.js'), 'install'], {
          cwd: gitRoot,
          stdio: 'inherit',
        });
      } else {
        await prompts.log.info('Skipping runtime bundle install (no relevant changes detected).');
      }

      await prompts.outro('Git-managed BMAD update complete.');
      process.exit(0);
    } catch (error) {
      await prompts.log.error(`Update failed: ${error.message}`);
      if (process.env.BMAD_DEBUG && error.stack) {
        await prompts.log.message(error.stack);
      }
      process.exit(1);
    }
  },
};
