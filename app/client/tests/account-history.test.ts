import { describe, expect, test } from 'bun:test';
import { firstHistory, historyAfter } from '../shell/accountHistory';

const LOGIN = 'http://localhost/account';
const CREATE = 'http://localhost/account/create';

describe("the account panel's history", () => {
  test('starts with nothing to go back to', () => {
    expect(firstHistory(LOGIN)).toEqual({ current: LOGIN, previous: null, showBack: false });
  });

  test('going somewhere remembers where it came from', () => {
    expect(historyAfter(firstHistory(LOGIN), CREATE, true)).toEqual({ current: CREATE, previous: LOGIN, showBack: true });
  });

  test('a link can refuse the back button', () => {
    expect(historyAfter(firstHistory(LOGIN), CREATE, false).showBack).toBe(false);
  });

  test('a form sent back with its errors keeps its back button', () => {
    const onCreate = historyAfter(firstHistory(LOGIN), CREATE, true);
    expect(historyAfter(onCreate, CREATE, false)).toEqual(onCreate);
  });

  test('going back leaves no back button', () => {
    const onCreate = historyAfter(firstHistory(LOGIN), CREATE, true);
    expect(historyAfter(onCreate, LOGIN, false)).toEqual({ current: LOGIN, previous: CREATE, showBack: false });
  });
});
