// over what the server rendered for this user
export const bandRule = (owner: string, colors: string[]) =>
  `.band[data-owner="${owner}"]::after { background:linear-gradient(-45deg, ${colors.join(',')}) !important; }`;
