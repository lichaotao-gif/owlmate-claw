import type { ExperimentChannel } from './experiment-channels';

export type ReviewHolding = {
  id: string;
  name: string;
  code: string;
  experimentName: string;
};

export function trustedReviewParent(
  origin: string,
  ownOrigin: string,
  configured: string | undefined,
  development: boolean,
) {
  const allow = [ownOrigin];
  if (development) allow.push('http://localhost:3000', 'http://127.0.0.1:3000');
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (
        ['http:', 'https:'].includes(parsed.protocol) &&
        parsed.origin === configured.replace(/\/$/, '')
      )
        allow.push(parsed.origin);
    } catch {
      // An invalid configuration must never grant cross-origin access.
    }
  }
  return allow.includes(origin);
}

export function collectReviewHoldings(
  channels: readonly ExperimentChannel[],
): ReviewHolding[] {
  const result: ReviewHolding[] = [];
  const seen = new Set<string>();
  for (const channel of channels) {
    for (const asset of channel.assets) {
      if (asset.kind !== 'security' || asset.amount <= 0 || !asset.name.trim())
        continue;
      const id = `${channel.id}:${asset.id}`.slice(0, 160);
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        name: asset.name.trim().slice(0, 60),
        code:
          typeof asset.code === 'string' ? asset.code.trim().slice(0, 32) : '',
        experimentName: channel.name.trim().slice(0, 80) || '未命名实验',
      });
      if (result.length >= 500) return result;
    }
  }
  return result;
}
