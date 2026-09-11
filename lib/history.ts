export type Snapshot = { at: string; total: number };
const LIMIT = 180;
export function readSnapshots(raw: string): Snapshot[] {
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length > LIMIT)
    throw new Error('Invalid history');
  for (const s of list)
    if (
      !s ||
      typeof s.at !== 'string' ||
      !Number.isFinite(Date.parse(s.at)) ||
      !Number.isFinite(s.total) ||
      s.total < 0 ||
      s.total > 1e12
    )
      throw new Error('Invalid snapshot');
  return list;
}
export function appendSnapshot(
  list: Snapshot[],
  total: number,
  at = new Date().toISOString(),
): Snapshot[] {
  const last = list[list.length - 1];
  if (last && Math.abs(last.total - total) < 0.005) return list;
  return [...list, { at, total }].slice(-LIMIT);
}
export function drawdown(list: Snapshot[]) {
  const peak = list.reduce((max, s) => Math.max(max, s.total), 0);
  const current = list.length ? list[list.length - 1].total : 0;
  return {
    peak,
    current,
    percent: peak > 0 ? ((peak - current) / peak) * 100 : 0,
  };
}
