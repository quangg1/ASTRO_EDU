/**
 * Render rootDir=client: đảm bảo packages/contracts có node_modules (zod) trước khi next build.
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

const env = { ...process.env, npm_config_production: 'false' };

try {
  if (existsSync(path.join(contractsDir, 'package-lock.json'))) {
    execSync('npm ci --omit=dev', { cwd: contractsDir, stdio: 'inherit', env });
  } else {
    execSync('npm install --omit=dev', { cwd: contractsDir, stdio: 'inherit', env });
  }
} catch {
  execSync('npm install --omit=dev', { cwd: contractsDir, stdio: 'inherit', env });
}
