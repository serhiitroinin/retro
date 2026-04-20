#!/usr/bin/env bun
import { existsSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const REPO_ROOT = resolve(import.meta.dir, "..");
const BINARY = join(REPO_ROOT, "retro");

if (!existsSync(BINARY)) {
  console.error(`binary not found at ${BINARY}. Run \`bun run build\` first.`);
  process.exit(1);
}

const localBin = join(homedir(), ".local", "bin");
const target = join(localBin, "retro");

mkdirSync(localBin, { recursive: true });
if (existsSync(target)) rmSync(target, { force: true });
symlinkSync(BINARY, target);
console.log(`✓ symlinked ${BINARY} → ${target}`);

const path = process.env.PATH ?? "";
if (!path.split(":").includes(localBin)) {
  console.log(`\n⚠ ${localBin} is not in PATH.`);
  console.log(`  Add to your shell profile:  export PATH="$HOME/.local/bin:$PATH"`);
}
