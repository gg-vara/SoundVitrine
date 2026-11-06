// Where the account panel stands : what it shows, what it came from, and if it offers to go back there
export interface AccountHistory {
  current: string;
  previous: string | null;
  showBack: boolean;
}

export const firstHistory = (url: string): AccountHistory => ({ current: url, previous: null, showBack: false });

// a form sent back with its errors stays where it is : what it offered is still valid
export function historyAfter(history: AccountHistory, arrivedAt: string, wantsBack: boolean): AccountHistory {
  if (arrivedAt === history.current) return history;
  return { current: arrivedAt, previous: history.current, showBack: wantsBack };
}
