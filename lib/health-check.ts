/** Explicit demo thresholds, not market-derived investment recommendations. */
export function healthTargets(current: number, largest: number, limit: number) {
  const allocation = Math.min(current, limit);
  // Proportional reduction limits account-level exposure, not relative concentration.
  const concentration =
    largest > 30 ? Math.min(allocation, (current * 30) / largest) : allocation;
  return { allocation, concentration: Math.floor(concentration * 10) / 10 };
}
