#!/usr/bin/env node
// Runs every plugin's *.test.ts against the real engine with `claude plugin test`. CI pins the
// Claude Code version through $CLAUDE_BIN; locally it uses the `claude` on PATH.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { claudeCommand } from './rules.mjs';
import { ITEMS_DIR, ROOT_DIR, itemNames } from './workshop.mjs';

const [command, ...args] = claudeCommand();
const failed = itemNames().filter((name) => {
  const dir = path.relative(ROOT_DIR, path.join(ITEMS_DIR, name));
  console.log(`\n${dir}`);
  const run = spawnSync(command, [...args, 'plugin', 'test', dir], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (run.error) {
    console.error(`Can't run ${command}: install Claude Code, or set CLAUDE_BIN.`);
    process.exit(1);
  }
  return run.status !== 0;
});
if (failed.length) {
  console.error(`\nFailed: ${failed.join(', ')}`);
  process.exit(1);
}
