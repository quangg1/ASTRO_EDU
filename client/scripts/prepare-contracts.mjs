/**
 * Render rootDir=client: đảm bảo packages/contracts có node_modules + dist/ trước khi next build.
 * Chạy qua postinstall / prebuild — không cần sửa Build Command trên Dashboard.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(here, '../../packages/contracts');

if (!existsSync(path.join(contractsDir, 'package.json'))) {
  process.exit(0);
}

// Cần devDependencies (typescript) để `npm run build` → dist/index.js
const env = { ...process.env, npm_config_production: 'false' };

function run(cmd) {
  execSync(cmd, { cwd: contractsDir, stdio: 'inherit', env });
}

try {
  if (existsSync(path.join(contractsDir, 'package-lock.json'))) {
    run('npm ci');
  } else {
    run('npm install');
  }
} catch {
  run('npm install');
}

run('npm run build');
