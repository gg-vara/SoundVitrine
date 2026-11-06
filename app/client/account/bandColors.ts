// The colors of a user's animated band, between how the page computes them and what its editor handles
const hexOf = (channel: string) => Number(channel).toString(16).padStart(2, '0');

// from the computed background of a band : rgb() colors, whatever the browser separates them with
export function colorsOfGradient(backgroundImage: string): string[] {
  return [...backgroundImage.matchAll(/rgb\((\d+)[,\s]+(\d+)[,\s]+(\d+)\)/g)].map(
    ([, red, green, blue]) => `#${hexOf(red ?? '0')}${hexOf(green ?? '0')}${hexOf(blue ?? '0')}`,
  );
}

// over what the server rendered for this user
export const bandRule = (owner: string, colors: string[]) =>
  `.wAnim[data-owner="${owner}"]::after { background:linear-gradient(-45deg, ${colors.join(',')}) !important; }`;
