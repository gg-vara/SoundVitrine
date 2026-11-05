import { describe, expect, test } from 'bun:test';
import { createActor, SimulatedClock } from 'xstate';
import { type StartupEffects, startupMachine } from '../shell/machine';

// lets promises and what they trigger go on
const settle = () => Bun.sleep(0);

function startup(overrides: Partial<StartupEffects> = {}) {
  const calls: string[] = [];
  const clock = new SimulatedClock();
  const effects: StartupEffects = {
    showLoader: () => {
      calls.push('showLoader');
      return Promise.resolve();
    },
    loadLibrary: () => {
      calls.push('loadLibrary');
      return Promise.resolve();
    },
    showPage: () => {
      calls.push('showPage');
      return Promise.resolve();
    },
    removeLoader: () => calls.push('removeLoader'),
    startLiveUpdates: () => calls.push('startLiveUpdates'),
    reportFailure: error => calls.push(`failure: ${(error as Error).message}`),
    ...overrides,
  };
  const actor = createActor(startupMachine, { input: { effects }, clock }).start();
  return { actor, calls, clock };
}

const never = () => new Promise<void>(() => {});

describe('starting the page', () => {
  test('in order, once each', async () => {
    const { actor, calls } = startup();
    await settle();
    expect(calls).toEqual(['showLoader', 'loadLibrary', 'showPage', 'removeLoader', 'startLiveUpdates']);
    expect(actor.getSnapshot().value).toBe('started');
  });

  test('live updates wait for the page to show', async () => {
    const { calls } = startup({ showPage: never });
    await settle();
    expect(calls).not.toContain('startLiveUpdates');
    expect(calls).not.toContain('removeLoader');
  });

  test('the library waits for the loader', async () => {
    const { calls } = startup({ showLoader: never });
    await settle();
    expect(calls).not.toContain('loadLibrary');
  });
});

describe('in a hidden tab, where a transition never ends', () => {
  test('the library comes down anyway', async () => {
    const { calls, clock } = startup({ showLoader: never });
    await settle();
    clock.increment(1000);
    await settle();
    expect(calls).toContain('loadLibrary');
  });

  test('the page starts anyway', async () => {
    const { actor, calls, clock } = startup({ showPage: never });
    await settle();
    clock.increment(1000);
    await settle();
    expect(calls).toContain('startLiveUpdates');
    expect(actor.getSnapshot().value).toBe('started');
  });

  test('a late end changes nothing', async () => {
    let end = () => {};
    const { calls, clock } = startup({
      showPage: () =>
        new Promise<void>(resolve => {
          end = resolve;
        }),
    });
    await settle();
    clock.increment(1000);
    await settle();
    end();
    await settle();
    expect(calls.filter(call => call === 'startLiveUpdates')).toHaveLength(1);
  });
});

describe('a library that does not come', () => {
  test('is told, and the page stays behind the loader', async () => {
    const { actor, calls } = startup({ loadLibrary: () => Promise.reject(new Error('status 500')) });
    await settle();
    expect(calls).toContain('failure: status 500');
    expect(calls).not.toContain('showPage');
    expect(calls).not.toContain('startLiveUpdates');
    expect(actor.getSnapshot().value).toBe('failed');
  });

  test('a slow one is not given up on', async () => {
    const { actor, clock } = startup({ loadLibrary: never });
    await settle();
    clock.increment(60_000);
    await settle();
    expect(actor.getSnapshot().value).toBe('loadingLibrary');
  });
});

test('an end of the loader that fails does not stop anything', async () => {
  const { calls } = startup({ showLoader: () => Promise.reject(new Error('no loader')) });
  await settle();
  expect(calls).toContain('startLiveUpdates');
});
