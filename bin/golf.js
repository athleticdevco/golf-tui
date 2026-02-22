#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = join(__dirname, '..', 'src', 'index.tsx');

const args = process.argv.slice(2);
const insecure = args.includes('--insecure');

const env = { ...process.env };
if (insecure) {
  env.GOLF_TUI_INSECURE = '1';
}

spawnSync('npx', ['tsx', entry], { stdio: 'inherit', env });
