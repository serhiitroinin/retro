export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printHumanTable(rows: Record<string, string | number>[]): void {
  if (rows.length === 0) {
    console.log("(no rows)");
    return;
  }
  const cols = Object.keys(rows[0] ?? {});
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const header = cols.map((c, i) => c.padEnd(widths[i] ?? 0)).join("  ");
  const sep = widths.map((w) => "─".repeat(w)).join("  ");
  console.log(header);
  console.log(sep);
  for (const r of rows) {
    console.log(cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i] ?? 0)).join("  "));
  }
}

export function printHumanKeyValue(obj: Record<string, unknown>): void {
  const keys = Object.keys(obj);
  const w = Math.max(...keys.map((k) => k.length));
  for (const k of keys) {
    const v = obj[k];
    const display = typeof v === "object" ? JSON.stringify(v) : String(v);
    console.log(`${k.padEnd(w)}  ${display}`);
  }
}
