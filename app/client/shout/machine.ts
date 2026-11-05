// How the shout panel goes : following the shouts on one side, showing them one at a time on the other. What it does to
// the page and the network comes from "effects", so this runs anywhere : see tests/shout-machine.test.ts
import { assign, enqueueActions, fromCallback, fromPromise, setup } from 'xstate';
import { changedFields, isNewTrack, isNoMusic, isWorthDisplaying, type Shout } from './logic';

export interface ShoutEffects {
  // until the returned function is called
  follow: (onShout: (shout: Shout) => void, onLost: () => void) => () => void;
  fadeOutNotification: () => Promise<unknown>;
  toggleShutter: (open: boolean) => Promise<unknown>;
  show: (shout: Shout, changes: (keyof Shout)[]) => void;
  announce: () => void;
  millisecondsSince: (date: string) => number;
}

interface ShoutContext {
  effects: ShoutEffects;
  // what shows
  current: Shout;
  // on its way to show
  incoming: Shout | null;
  // the next to show : only the latest counts
  pending: Shout | null;
  worthDisplaying: boolean;
  open: boolean;
  // the notification has gone away, and must come back before the next track
  announced: boolean;
}

type ShoutEvent = { type: 'start' } | { type: 'shout'; shout: Shout } | { type: 'stream.lost' };

const announcesTrack = (current: Shout, shout: Shout) => !isNoMusic(shout) && isNewTrack(changedFields(current, shout));

export const shoutMachine = setup({
  types: {
    context: {} as ShoutContext,
    events: {} as ShoutEvent,
    input: {} as { effects: ShoutEffects },
  },
  actors: {
    stream: fromCallback<ShoutEvent, ShoutEffects>(({ input, sendBack }) =>
      input.follow(
        shout => sendBack({ type: 'shout', shout }),
        () => sendBack({ type: 'stream.lost' }),
      ),
    ),
    fadeOut: fromPromise<unknown, ShoutEffects>(({ input }) => input.fadeOutNotification()),
    toggle: fromPromise<unknown, { effects: ShoutEffects; open: boolean }>(({ input }) => input.effects.toggleShutter(input.open)),
  },
  delays: {
    // without flooding a server that is restarting
    retry: 5000,
    // these wait for CSS transitions of .5s at most, whose end never comes when nothing moves, or in a hidden tab
    settle: 1000,
  },
  guards: {
    hasPending: ({ context }) => context.pending !== null,
    pendingFollowsNotification: ({ context }) =>
      context.pending !== null && context.open && context.announced && announcesTrack(context.current, context.pending),
  },
  actions: {
    keepLatest: assign({ pending: ({ event }) => (event.type === 'shout' ? event.shout : null) }),
    takePending: assign({
      incoming: ({ context }) => context.pending,
      pending: null,
      worthDisplaying: ({ context }) => context.pending !== null && isWorthDisplaying(context.pending, context.effects.millisecondsSince),
    }),
    showIncoming: enqueueActions(({ context, enqueue }) => {
      const shout = context.incoming;
      if (!shout) return;

      const announced = announcesTrack(context.current, shout);
      const changes = changedFields(context.current, shout);
      enqueue(() => context.effects.show(shout, changes));
      if (announced) enqueue(() => context.effects.announce());
      enqueue.assign({
        current: shout,
        incoming: null,
        open: context.worthDisplaying,
        announced: context.announced || announced,
      });
    }),
  },
}).createMachine({
  id: 'shout',
  type: 'parallel',
  context: ({ input }) => ({
    effects: input.effects,
    current: {},
    incoming: null,
    pending: null,
    worthDisplaying: false,
    open: false,
    announced: false,
  }),
  states: {
    connection: {
      initial: 'stopped',
      states: {
        stopped: {
          on: { start: 'following' },
        },
        following: {
          invoke: { src: 'stream', input: ({ context }) => context.effects },
          on: { 'stream.lost': 'retrying' },
        },
        retrying: {
          after: { retry: 'following' },
        },
      },
    },

    display: {
      initial: 'idle',
      on: { shout: { actions: 'keepLatest' } },
      states: {
        idle: {
          always: [
            { guard: 'pendingFollowsNotification', target: 'fadingOut', actions: 'takePending' },
            { guard: 'hasPending', target: 'toggling', actions: 'takePending' },
          ],
        },
        fadingOut: {
          invoke: {
            src: 'fadeOut',
            input: ({ context }) => context.effects,
            onDone: 'toggling',
            onError: 'toggling',
          },
          after: { settle: 'toggling' },
        },
        toggling: {
          invoke: {
            src: 'toggle',
            input: ({ context }) => ({ effects: context.effects, open: context.worthDisplaying }),
            onDone: 'showing',
            onError: 'showing',
          },
          after: { settle: 'showing' },
        },
        showing: {
          entry: 'showIncoming',
          always: 'idle',
        },
      },
    },
  },
});
