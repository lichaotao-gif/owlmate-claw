type Schedule = (callback: () => void, delay: number) => () => void;

export function runStrategyGeneration(
  onStep: (step: number) => void,
  onComplete: () => void,
  schedule: Schedule,
) {
  let active = true;
  onStep(0);
  const cancelTimers = [
    schedule(() => {
      if (active) onStep(1);
    }, 450),
    schedule(() => {
      if (active) onStep(2);
    }, 900),
    schedule(() => {
      if (active) {
        active = false;
        onComplete();
      }
    }, 1400),
  ];
  return () => {
    active = false;
    cancelTimers.forEach((cancel) => cancel());
  };
}
