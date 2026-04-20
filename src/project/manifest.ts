import { existsSync } from "node:fs";
import { join } from "node:path";

const MANIFESTS = ["package.json", "Cargo.toml", "pyproject.toml", "Gemfile", "go.mod"];

export function detectManifests(cwd: string): string[] {
  return MANIFESTS.filter((m) => existsSync(join(cwd, m)));
}
