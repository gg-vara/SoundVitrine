// How long CSS transitions last at most, delays included, from their computed lists : "0.5s, 200ms"
const toMs = (list: string) => list.split(',').map(time => Number.parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000));

export function longestTransitionMs(durations: string, delays: string): number {
  const delayList = toMs(delays);
  return Math.max(...toMs(durations).map((duration, index) => duration + (delayList[index % delayList.length] ?? 0)));
}
