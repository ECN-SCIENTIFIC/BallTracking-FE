import type { MillDefinition } from "./caseConfig";

export function buildMillSelectorOptions(
  mills: MillDefinition[],
  allLabel: string,
): Array<{ value: "all" | string; label: string }> {
  const opts: Array<{ value: "all" | string; label: string }> = [];
  for (const m of mills) {
    opts.push({ value: m.id, label: m.label });
  }
  if (mills.length > 1) {
    opts.push({ value: "all", label: allLabel });
  }
  return opts;
}

export function coerceMillSelection(
  current: string,
  mills: MillDefinition[],
): "all" | string {
  if (mills.length === 0) return "all";
  if (mills.length === 1) {
    return mills[0].id;
  }
  if (current === "all" || current === "ALL") {
    return "all";
  }
  const known = mills.some((m) => m.id === current);
  if (known) return current;
  return "all";
}

export function initialMillSelection(mills: MillDefinition[]): "all" | string {
  if (mills.length <= 1) {
    return mills[0]?.id ?? "all";
  }
  return "all";
}
