import {
  existsSync,
  mkdirSync,
  symlinkSync,
  lstatSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import type { Args } from "../lib/cli.ts";

export function run(args: Args): void {
  const claudeDir = join(homedir(), ".claude");
  if (!existsSync(claudeDir)) {
    console.error(
      "Claude Code not detected at ~/.claude/ — install it from claude.com/code first",
    );
    process.exit(1);
  }
  const skillsDir = join(claudeDir, "skills");
  mkdirSync(skillsDir, { recursive: true });
  const target = join(skillsDir, "retro");

  const useDev = args.flags.dev === "true";
  const skillSrc = resolveSkillSource();

  if (!skillSrc) {
    console.error(
      "skill source not found — run `retro setup --dev` from the retro repo, or use a compiled binary",
    );
    process.exit(1);
  }

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  if (useDev) {
    symlinkSync(skillSrc, target, "dir");
    console.log(`✓ symlinked ${skillSrc} → ${target} (dev mode)`);
  } else {
    copyRecursive(skillSrc, target);
    console.log(`✓ installed skill from ${skillSrc} → ${target}`);
  }

  console.log(`\nNext: open Claude Code inside a project and run /retro-init`);
}

function resolveSkillSource(): string | null {
  const here = dirname(import.meta.url.replace(/^file:\/\//, ""));
  const candidates = [
    resolve(here, "..", "..", "skill"),
    resolve(here, "..", "skill"),
    resolve(process.cwd(), "skill"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && existsSync(join(c, "SKILL.md"))) return c;
  }
  return null;
}

function copyRecursive(src: string, dst: string): void {
  const st = lstatSync(src);
  if (st.isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dst, entry));
    }
  } else {
    copyFileSync(src, dst);
  }
}
