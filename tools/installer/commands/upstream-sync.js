const path = require('node:path');
const { createPlan, applyPlan } = require('../../upstream-sync');

function defaultOutputPath() {
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, '').replaceAll(/\..+$/g, 'Z');
  return path.join('_bmad-output', 'upstream-sync', stamp, 'plan.json');
}

module.exports = {
  command: 'upstream-sync [action]',
  description: 'Plan or apply BMAD upstream updates from git refs/tags',
  options: [
    ['--from <ref>', 'Current BMAD git ref or tag for dry-run planning'],
    ['--to <ref>', 'Target BMAD git ref or tag for dry-run planning'],
    ['--dry-run', 'Create a plan only (default for planning)'],
    ['--output <path>', 'Dry-run evidence path under _bmad-output/upstream-sync/'],
    ['--plan <path>', 'Plan JSON path for apply'],
    ['--approved', 'Required for apply'],
    ['--repo <path>', 'Repository root (default: current directory)'],
  ],
  action: (action, options) => {
    try {
      const repoRoot = path.resolve(options.repo || process.cwd());
      if (action === 'apply') {
        const result = applyPlan({
          repoRoot,
          planPath: options.plan,
          approved: options.approved === true,
        });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exit(0);
      }

      if (action && action !== 'plan') {
        process.stderr.write(`upstream-sync action not implemented: ${action}\n`);
        process.exit(1);
      }

      const plan = createPlan({
        repoRoot,
        fromRef: options.from,
        toRef: options.to,
        outputPath: options.output || defaultOutputPath(),
      });
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      process.exit(0);
    } catch (error) {
      process.stderr.write(`upstream-sync failed: ${error.message}\n`);
      process.exit(1);
    }
  },
};
