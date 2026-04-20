import { execSync } from "node:child_process";

export function projectIdentity(cwd: string): string {
  try {
    const remote = execSync("git config --get remote.origin.url", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (remote) return remote;
  } catch {
    // fall through to cwd
  }
  return cwd;
}
