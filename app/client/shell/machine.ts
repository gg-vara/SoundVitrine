// How the library page starts : the loader shows, the library comes down, then the page takes over. What it does to the
// page and the network comes from "effects", so this runs anywhere : see tests/startup-machine.test.ts
import { fromPromise, setup } from 'xstate';

export interface StartupEffects {
  showLoader: () => Promise<unknown>;
  // downloads the library, and gives it to the panels
  loadLibrary: () => Promise<unknown>;
  showPage: () => Promise<unknown>;
  // once the page shows
  removeLoader: () => void;
  startLiveUpdates: () => void;
  reportFailure: (error: unknown) => void;
}

export const startupMachine = setup({
  types: {
    context: {} as { effects: StartupEffects },
    input: {} as { effects: StartupEffects },
    events: {} as { type: 'RETRY' },
  },
  actors: {
    showLoader: fromPromise<unknown, StartupEffects>(({ input }) => input.showLoader()),
    loadLibrary: fromPromise<unknown, StartupEffects>(({ input }) => input.loadLibrary()),
    showPage: fromPromise<unknown, StartupEffects>(({ input }) => input.showPage()),
  },
  delays: {
    // these wait for CSS transitions of .5s, whose end never comes in a hidden tab
    settle: 1000,
  },
}).createMachine({
  id: 'startup',
  context: ({ input }) => ({ effects: input.effects }),
  initial: 'showingLoader',
  states: {
    showingLoader: {
      invoke: {
        src: 'showLoader',
        input: ({ context }) => context.effects,
        onDone: 'loadingLibrary',
        onError: 'loadingLibrary',
      },
      after: { settle: 'loadingLibrary' },
    },
    loadingLibrary: {
      invoke: {
        src: 'loadLibrary',
        input: ({ context }) => context.effects,
        onDone: 'showingPage',
        onError: {
          target: 'failed',
          actions: ({ context, event }) => context.effects.reportFailure(event.error),
        },
      },
    },
    showingPage: {
      invoke: {
        src: 'showPage',
        input: ({ context }) => context.effects,
        onDone: 'started',
        onError: 'started',
      },
      after: { settle: 'started' },
    },
    started: {
      type: 'final',
      entry: ({ context }) => {
        context.effects.removeLoader();
        context.effects.startLiveUpdates();
      },
    },
    // the loader stays, telling so
    failed: {
      on: { RETRY: 'loadingLibrary' },
    },
  },
});
