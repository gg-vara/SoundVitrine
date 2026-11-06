// "3 years ago", in the language of the page
export function humanizedSince(date: string, now: Date): string {
  const then = moment(date);
  then.locale(document.documentElement.lang);
  return then.from(now);
}
