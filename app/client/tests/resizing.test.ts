import { describe, expect, test } from 'bun:test';
import { createResizeHandler, debounced } from '../shell/navigation';

describe('on resizing', () => {
  function handler() {
    let calls = 0;
    let width = 1000;
    const handle = createResizeHandler([() => calls++], () => width);
    return {
      calls: () => calls,
      handle,
      setWidth: (value: number) => {
        width = value;
      },
    };
  }

  test('a change of height alone changes nothing', () => {
    const { calls, handle } = handler();
    handle();
    expect(calls()).toBe(0);
  });

  test('once for a width', () => {
    const { calls, handle, setWidth } = handler();
    setWidth(800);
    handle();
    handle();
    expect(calls()).toBe(1);
  });

  test('coming back is a change too', () => {
    const { calls, handle, setWidth } = handler();
    setWidth(800);
    handle();
    setWidth(1000);
    handle();
    expect(calls()).toBe(2);
  });
});

describe('debounced', () => {
  test('runs once, after the last call', async () => {
    let runs = 0;
    const run = debounced(() => runs++, 5);
    run();
    run();
    run();
    expect(runs).toBe(0);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(runs).toBe(1);
  });
});
