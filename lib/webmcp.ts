import { flushSync } from 'react-dom';
import { type Scenario } from './simulation';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerSimulationTools(actions: {
  setAllocation: (n: number) => void;
  setDays: (n: number) => void;
  setScenario: (s: Scenario) => void;
}) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!context?.registerTool) return;
  const controller = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'stage_owlmate_scenario',
          description:
            'Set the visible OwlMate portfolio simulation. Uses fictional scenario assumptions. Does not save a plan or modify real holdings.',
          inputSchema: {
            type: 'object',
            properties: {
              allocation: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                multipleOf: 5,
              },
              days: { type: 'number', enum: [5, 20, 60] },
              scenario: { type: 'string', enum: ['bull', 'base', 'bear'] },
            },
            required: ['allocation', 'days', 'scenario'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('Expected an object');
            const v = input as Record<string, unknown>;
            if (
              Object.keys(v).some(
                (k) => !['allocation', 'days', 'scenario'].includes(k),
              ) ||
              typeof v.allocation !== 'number' ||
              !Number.isFinite(v.allocation) ||
              v.allocation < 0 ||
              v.allocation > 100 ||
              v.allocation % 5 !== 0 ||
              typeof v.days !== 'number' ||
              ![5, 20, 60].includes(v.days) ||
              !['bull', 'base', 'bear'].includes(String(v.scenario))
            )
              throw new Error('Invalid simulation parameters');
            flushSync(() => {
              actions.setAllocation(v.allocation as number);
              actions.setDays(v.days as number);
              actions.setScenario(v.scenario as Scenario);
            });
            return {
              status: 'staged',
              allocation: v.allocation,
              days: v.days,
              scenario: v.scenario,
              realHoldingsChanged: false,
            };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
  } catch {}
  return () => controller.abort();
}
