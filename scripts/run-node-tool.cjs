const { existsSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [, , toolPath, ...toolArguments] = process.argv;

if (!toolPath) {
  console.error('Usage: node scripts/run-node-tool.cjs <tool> [...arguments]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const bundledNode = path.join(projectRoot, 'resources', 'node', 'node.exe');
const nodeExecutable = process.platform === 'win32' && existsSync(bundledNode)
  ? bundledNode
  : process.execPath;
const resolvedToolPath = path.resolve(projectRoot, toolPath);

const result = spawnSync(nodeExecutable, [resolvedToolPath, ...toolArguments], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: false,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
