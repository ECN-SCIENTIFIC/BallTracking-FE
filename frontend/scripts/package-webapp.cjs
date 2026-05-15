const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const buildDir = path.join(root, 'build');
const packageJsonPath = path.join(root, 'package.json');
const isWindows = process.platform === 'win32';
const pkgBin = path.join(root, 'node_modules', '.bin', isWindows ? 'pkg.cmd' : 'pkg');
const npmBin = isWindows ? 'npm.cmd' : 'npm';

const args = new Set(process.argv.slice(2));
const packageAll = args.has('--all');
const target = process.env.PKG_TARGET || 'node18-win-x64';
const outputName = process.env.PKG_OUTPUT || 'balltracking.exe';

function run(command, commandArgs) {
  execFileSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
  });
}

function assertFile(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
}

fs.mkdirSync(distDir, { recursive: true });

console.log('Building static web app...');
run(npmBin, ['run', 'build']);

assertFile(path.join(buildDir, 'index.html'), 'Build did not produce build/index.html');
assertFile(path.join(buildDir, 'config.json'), 'Build did not include build/config.json');
assertFile(pkgBin, 'pkg executable was not found. Run npm install before packaging.');

console.log('Packaging self-contained executable...');
if (packageAll) {
  run(pkgBin, [
    packageJsonPath,
    '--targets',
    'node18-win-x64,node18-linux-x64,node18-macos-x64',
    '--out-path',
    distDir,
  ]);
} else {
  run(pkgBin, [
    packageJsonPath,
    '--target',
    target,
    '--output',
    path.join(distDir, outputName),
  ]);
}

const runtimeConfig = path.join(root, 'config.json');
if (fs.existsSync(runtimeConfig)) {
  fs.copyFileSync(runtimeConfig, path.join(distDir, 'config.json'));
}

console.log(`Packaged web app written to ${distDir}`);
console.log('The executable embeds the built app; dist/config.json is an optional runtime override.');
