import {
  existsSync,
  mkdirSync,
  symlinkSync,
  lstatSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import type { Args } from "../lib/cli.ts";
import { EMBEDDED_SKILL_FILES } from "../embedded.ts";

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
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  if (useDev) {
    const skillSrc = resolveSkillSource();
    if (!skillSrc) {
      console.error("`--dev` requires running from the retro repo (skill/ dir not found)");
      process.exit(1);
    }
    symlinkSync(skillSrc, target, "dir");
    console.log(`✓ symlinked ${skillSrc} → ${target} (dev mode)`);
  } else if (Object.keys(EMBEDDED_SKILL_FILES).length > 0) {
    extractEmbedded(target);
    console.log(`✓ extracted embedded skill (${Object.keys(EMBEDDED_SKILL_FILES).length} files) → ${target}`);
  } else {
    const skillSrc = resolveSkillSource();
    if (!skillSrc) {
      console.error(
        "no embedded skill and no skill/ directory found; run `bun run scripts/build.ts generate` first",
      );
      process.exit(1);
    }
    copyRecursive(skillSrc, target);
    console.log(`✓ copied skill from ${skillSrc} → ${target}`);
  }

  console.log(`\nNext: open Claude Code inside a project and run /retro-init`);
}

function extractEmbedded(target: string): void {
  mkdirSync(target, { recursive: true });
  for (const [rel, content] of Object.entries(EMBEDDED_SKILL_FILES)) {
    const dst = join(target, rel);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, content, "utf8");
  }
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
