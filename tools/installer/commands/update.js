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

function parsePorcelainStatus(output) {
  return output
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

module.exports = {
  command: 'update',
  description: 'Plan or apply a safe git-based BMAD update for this checkout',
  options: [
    ['--directory <path>', 'Project directory or git checkout to inspect (default: current directory)'],
    ['--apply', 'Apply the plan with git pull --ff-only and refresh generated BMAD/runtime surfaces'],
    ['--fetch', 'Fetch upstream refs before computing update status (apply implies fetch)'],
    ['--skip-quick-update', 'Skip BMAD quick-update after a successful pull'],
    ['--skip-runtime-install', 'Skip runtime bundle reinstall after a successful pull'],
    ['-y, --yes', 'Accept prompts automatically where possible'],
  ],
  action: async (options) => {
    try {
      const projectDir = path.resolve(options.directory || process.cwd());
      const gitRootRaw = runGit(projectDir, ['rev-parse', '--show-toplevel']);
      const gitRoot = gitRootRaw.toString().trim();

      const { bmadDir } = await installer.findBmadDir(gitRoot);
      const hasBmadInstall = await fs.pathExists(bmadDir);

      const branch = runGit(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
      const upstreamRefRaw = runGit(gitRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
        allowFailure: true,
      });
      const upstream = upstreamRefRaw?.toString().trim() || null;

      if (options.fetch || options.apply) {
        if (upstream) {
          const remoteName = upstream.split('/')[0];
          const s = await prompts.spinner();
          s.start(`Fetching ${remoteName}...`);
          runGit(gitRoot, ['fetch', '--prune', remoteName]);
          s.stop(`Fetched ${remoteName}`);
        } else if (options.apply) {
          throw new Error('Cannot apply update without an upstream branch configured.');
        }
      }

      const dirtyEntries = parsePorcelainStatus(runGit(gitRoot, ['status', '--porcelain', '--untracked-files=all']).toString());
      const dirtyFiles = dirtyEntries.map((entry) => `${entry.code} ${entry.file}`);

      let ahead = 0;
      let behind = 0;
      let incomingFiles = [];

      if (upstream) {
        const counts = runGit(gitRoot, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`])
          .toString()
          .trim()
          .split(/\s+/);
        ahead = Number.parseInt(counts[0] || '0', 10);
        behind = Number.parseInt(counts[1] || '0', 10);

        if (behind > 0) {
          incomingFiles = runGit(gitRoot, ['diff', '--name-only', `HEAD..${upstream}`])
            .toString()
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        }
      }

      const quickUpdateFiles = listMatches(incomingFiles, QUICK_UPDATE_PREFIXES, QUICK_UPDATE_EXACT);
      const runtimeInstallFiles = listMatches(incomingFiles, RUNTIME_INSTALL_PREFIXES, RUNTIME_INSTALL_EXACT);

      const shouldQuickUpdate = hasBmadInstall && quickUpdateFiles.length > 0 && !options.skipQuickUpdate;
      const shouldRuntimeInstall = runtimeInstallFiles.length > 0 && !options.skipRuntimeInstall;

      await prompts.intro('BMAD Git Update');
      await prompts.note(
        [
          `Repo root: ${gitRoot}`,
          `Branch: ${branch}`,
          `Upstream: ${upstream || 'none'}`,
          `Working tree dirty: ${boolLabel(dirtyEntries.length > 0)}`,
          `Ahead / Behind: ${ahead} / ${behind}`,
          `BMAD install detected: ${boolLabel(hasBmadInstall)}`,
          `Would run BMAD quick update: ${boolLabel(shouldQuickUpdate)}`,
          `Would run runtime install: ${boolLabel(shouldRuntimeInstall)}`,
        ].join('\n'),
        'Plan Summary',
      );

      if (dirtyFiles.length > 0) {
        await prompts.note(summarizeList(dirtyFiles), 'Local Changes');
      }

      if (incomingFiles.length > 0) {
        await prompts.note(summarizeList(incomingFiles), 'Incoming Git Changes');
      }

      if (!options.apply) {
        const nextSteps = [];

        if (dirtyEntries.length > 0) {
          nextSteps.push('Clean up or commit your local changes before running apply mode.');
        }
        if (!upstream) {
          nextSteps.push('Configure an upstream branch before using apply mode.');
        }
        if (upstream && behind > 0) {
          nextSteps.push('Run `bmad update --apply` when you want to fast-forward this checkout.');
        }
        if (upstream && behind === 0) {
          nextSteps.push('No incoming git updates are currently visible from the configured upstream.');
        }

        await prompts.outro(nextSteps.join('\n'));
        process.exit(0);
      }

      if (dirtyEntries.length > 0) {
        throw new Error('Refusing to apply update over a dirty worktree. Commit, stash, or branch your local changes first.');
      }

      if (!upstream) {
        throw new Error('Cannot apply update without an upstream branch configured.');
      }

      if (ahead > 0 && behind > 0) {
        throw new Error('Branch has diverged from upstream. Rebase or merge manually before running this command.');
      }

      if (behind === 0) {
        await prompts.log.info('No incoming git commits detected. Skipping pull.');
      } else {
        if (!options.yes) {
          const confirmed = await prompts.confirm({
            message: `Fast-forward ${branch} from ${upstream}?`,
            default: true,
          });

          if (!confirmed) {
            await prompts.outro('Update cancelled.');
            process.exit(0);
          }
        }

        const s = await prompts.spinner();
        s.start(`Fast-forwarding ${branch} from ${upstream}...`);
        runGit(gitRoot, ['pull', '--ff-only'], { inherit: true });
        s.stop(`Updated ${branch}`);
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
