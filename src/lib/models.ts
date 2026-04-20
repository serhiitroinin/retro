const BASE_WINDOWS: Record<string, number> = {
  "claude-opus-4-7": 200_000,
  "claude-opus-4-6": 200_000,
  "claude-opus-4-5": 200_000,
  "claude-sonnet-4-6": 200_000,
  "claude-sonnet-4-5": 200_000,
  "claude-haiku-4-5": 200_000,
};

const DEFAULT_WINDOW = 200_000;

export function contextWindow(modelId: string | undefined): number {
  if (!modelId) return DEFAULT_WINDOW;
  const oneMillion = modelId.includes("[1m]") || modelId.endsWith("-1m");
  const base = stripModelSuffixes(modelId);
  const hit = BASE_WINDOWS[base];
  if (oneMillion) return 1_000_000;
  return hit ?? DEFAULT_WINDOW;
}

function stripModelSuffixes(id: string): string {
  const noSuffix = id.replace(/\[1m\]$/, "").replace(/-\d{8}$/, "");
  return noSuffix;
}

export function modelFamily(modelId: string | undefined): string {
  if (!modelId) return "unknown";
  const base = stripModelSuffixes(modelId);
  if (base.includes("opus")) return "opus";
  if (base.includes("sonnet")) return "sonnet";
  if (base.includes("haiku")) return "haiku";
  return base;
}
