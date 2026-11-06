import { describe, expect, test } from 'bun:test';
import { createActor, SimulatedClock } from 'xstate';
import type { Shout } from '../shout/logic';
import { type ShoutEffects, shoutMachine } from '../shout/machine';

const track = (name: string, more: Shout = {}): Shout => ({
  date: '2026-01-01T00:00:00Z',
  name,
  album: `${name} album`,
  artist: 'artist',
  duration: 200,
  playerPositionMS: 0,
  playerState: true,
  ...more,
});

// lets promises and what they trigger go on
const settle = () => Bun.sleep(0);

function panel() {
  const calls: string[] = [];
  const clock = new SimulatedClock();
  let send: (shout: Shout) => void = () => {};
  let lose = () => {};
  // what transitions wait for : ends at once, unless told otherwise
  let release: (() => void)[] | null = null;
  const wait = () => (release ? new Promise<void>(resolve => release?.push(resolve)) : Promise.resolve());

  const effects: ShoutEffects = {
    follow: (onShout, onLost) => {
      calls.push('follow');
      send = onShout;
      lose = onLost;
      return () => calls.push('unfollow');
    },
    fadeOutNotification: () => {
      calls.push('fadeOut');
      return wait();
    },
    toggleShutter: open => {
      calls.push(open ? 'open' : 'close');
      return wait();
    },
    show: (shout, changes) => calls.push(`show ${shout.name ?? 'nothing'}${changes.length ? '' : ' unchanged'}`),
    announce: () => calls.push('announce'),
    millisecondsSince: () => 0,
  };

  const actor = createActor(shoutMachine, { input: { effects }, clock });
  actor.start();

  return {
    calls,
    clock,
    actor,
    send: (shout: Shout) => send(shout),
    lose: () => lose(),
    stuck: () => {
      release = [];
    },
    finish: () => {
      const waiting = release ?? [];
      release = null;
      for (const resolve of waiting) resolve();
    },
  };
}

async function following() {
  const it = panel();
  it.actor.send({ type: 'start' });
  await settle();
  return it;
}

describe('connection', () => {
  test('nothing is followed until the page shows', () => {
    expect(panel().calls).toEqual([]);
  });

  test('starts once', async () => {
    const it = await following();
    it.actor.send({ type: 'start' });
    expect(it.calls).toEqual(['follow']);
  });

  test('a lost stream is closed, then followed again later', async () => {
    const it = await following();
    it.lose();
    await settle();
    expect(it.calls).toEqual(['follow', 'unfollow']);

    it.clock.increment(4999);
    expect(it.calls).toEqual(['follow', 'unfollow']);

    it.clock.increment(1);
    expect(it.calls).toEqual(['follow', 'unfollow', 'follow']);
  });

  test('shouts still arrive after a reconnection', async () => {
    const it = await following();
    it.lose();
    await settle();
    it.clock.increment(5000);
    it.send(track('back'));
    await settle();
    expect(it.calls).toContain('show back');
  });
});

describe('showing', () => {
  test('a first track opens the panel, shows, and announces', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    expect(it.calls).toEqual(['follow', 'open', 'show one', 'announce']);
  });

  test('the same track going on is not announced', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    it.send(track('one', { playerState: false }));
    await settle();
    expect(it.calls.filter(call => call === 'announce')).toHaveLength(1);
    expect(it.calls).not.toContain('fadeOut');
  });

  test('the same shout twice changes nothing', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    it.send(track('one'));
    await settle();
    expect(it.calls).toContain('show one unchanged');
    expect(it.calls.filter(call => call === 'announce')).toHaveLength(1);
  });

  test('a next track brings the notification back first', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    it.calls.length = 0;

    it.send(track('two'));
    await settle();
    expect(it.calls).toEqual(['fadeOut', 'open', 'show two', 'announce']);
  });

  test('nothing playing anymore closes the panel, silently', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    it.calls.length = 0;

    it.send({ date: '2026-01-01T00:00:00Z' });
    await settle();
    expect(it.calls).toEqual(['close', 'show nothing']);
  });

  test('a track reopening after that does not fade a notification away', async () => {
    const it = await following();
    it.send(track('one'));
    await settle();
    it.send({ date: '2026-01-01T00:00:00Z' });
    await settle();
    it.calls.length = 0;

    it.send(track('two'));
    await settle();
    expect(it.calls).toEqual(['open', 'show two', 'announce']);
  });

  test('tells whether the panel is to stay open, when the window resizes', async () => {
    const it = await following();
    expect(it.actor.getSnapshot().context.worthDisplaying).toBe(false);
    it.send(track('one'));
    await settle();
    expect(it.actor.getSnapshot().context.worthDisplaying).toBe(true);
  });
});

describe('shouts coming fast', () => {
  test('one at a time, the latest only', async () => {
    const it = await following();
    it.stuck();
    it.send(track('one'));
    await settle();
    it.send(track('two'));
    it.send(track('three'));
    await settle();
    expect(it.calls).not.toContain('show two');
    expect(it.calls).not.toContain('show three');

    it.finish();
    await settle();
    await settle();
    expect(it.calls.filter(call => call.startsWith('show'))).toEqual(['show one', 'show three']);
  });
});

describe('transitions never ending', () => {
  test('the panel goes on after a while', async () => {
    const it = await following();
    it.stuck();
    it.send(track('one'));
    await settle();
    expect(it.calls).not.toContain('show one');

    it.clock.increment(999);
    expect(it.calls).not.toContain('show one');

    it.clock.increment(1);
    expect(it.calls).toContain('show one');
  });

  test('and still shows the next ones', async () => {
    const it = await following();
    it.stuck();
    it.send(track('one'));
    await settle();
    it.clock.increment(1000);
    it.send(track('two'));
    await settle();
    it.clock.increment(1000);
    it.clock.increment(1000);
    expect(it.calls).toContain('show two');
  });

  test('a transition ending too late changes nothing', async () => {
    const it = await following();
    it.stuck();
    it.send(track('one'));
    await settle();
    it.clock.increment(1000);
    const shown = it.calls.filter(call => call.startsWith('show')).length;

    it.finish();
    await settle();
    expect(it.calls.filter(call => call.startsWith('show'))).toHaveLength(shown);
  });
});
