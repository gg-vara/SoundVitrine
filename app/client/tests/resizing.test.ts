import { describe, expect, test } from 'bun:test';
import { createResizeHandler, debounced } from '../shell/resizing';

describe('on resizing', () => {
  function handler() {
    const calls: string[] = [];
    let width = 1000;
    const handle = createResizeHandler({ any: [() => calls.push('any')], width: [() => calls.push('width')] }, () => width);
    return {
      calls,
      handle,
      setWidth: (value: number) => {
        width = value;
      },
    };
  }

  test('a change of height alone leaves what depends on the width', () => {
    const { calls, handle } = handler();
    handle();
    expect(calls).toEqual(['any']);
  });

  test('a change of width runs everything, what applies to any change first', () => {
    const { calls, handle, setWidth } = handler();
    setWidth(800);
    handle();
    expect(calls).toEqual(['any', 'width']);
  });

  test('once for a width', () => {
    const { calls, handle, setWidth } = handler();
    setWidth(800);
    handle();
    handle();
    expect(calls.filter(call => call === 'width')).toHaveLength(1);
  });

  test('coming back is a change too', () => {
    const { calls, handle, setWidth } = handler();
    setWidth(800);
    handle();
    setWidth(1000);
    handle();
    expect(calls.filter(call => call === 'width')).toHaveLength(2);
  });
});

describe('waiting for things to be quiet', () => {
  test('runs once, after the last call', async () => {
    let runs = 0;
    const run = debounced(() => runs++, 5);
    run();
    run();
    run();
    expect(runs).toBe(0);
    await Bun.sleep(20);
    expect(runs).toBe(1);
  });
});
