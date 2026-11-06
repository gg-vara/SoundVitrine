// How the controls look, for the server's pages and the account forms (client/account/). Tailwind reads these here : client/style.css scans this folder

const HYPE =
  'flex items-center justify-center rounded-[20px] [border:0] [box-shadow:0px_0px_5px_0px_rgba(0,0,0,.33)] [font-family:inherit] [font-size:inherit] [&_i]:mr-[.5em] [&_i]:text-[.8em] [&_span]:mb-[-.1em]';

export const HYPE_BUTTON = `${HYPE} bg-[#333] p-[.25rem] text-[#DDD] [transition:color_.33s_ease,background-color_.33s_ease] hover:bg-[#EEE] hover:text-[#333]`;

export const HYPE_SUBMIT = `${HYPE} mb-[1rem] text-[#162f0ed6] [transition:color_.5s_ease,box-shadow_.5s_ease] hover:text-[green] hover:[box-shadow:0px_0px_5px_0px_rgba(0,0,0,.5)]`;

export const TEXT_INPUT = 'w-full rounded-[5px] border border-dashed border-[rgba(0,0,0,.33)] p-[.5rem] pt-[1.1rem] text-[.75rem]';

// what holds a page's content
export const MAIN_FRAME = 'z-0 flex grow flex-col';

export const FOOTER = 'mb-[.5rem] flex w-full flex-row-reverse items-center justify-between bg-[#dcdcdc]';

const FOOTER_PART = 'flex h-full items-center bg-white text-[.65rem]';

export const FOOTER_MIDDLE = `${FOOTER_PART} p-[.35rem]`;

export const CREDITS = `${FOOTER_PART} mr-[5%] self-end p-[.35rem] text-[#525252] [&_a]:h-[.75rem] [&_img]:h-[.75rem]`;

export const LANGUAGES = `${FOOTER_PART} ml-[5%] self-start px-[.35rem] py-0 [&_img]:h-[1.3rem] [&>*]:flex [&>*:not(:first-child)]:ml-[.5rem] [&>*:not(.unselected)_img]:border [&>*:not(.unselected)_img]:border-dashed [&>*:not(.unselected)_img]:border-[#6a67bd57] [&>*:not(.unselected)_img]:px-[.2rem] [&>*:not(.unselected)_img]:py-0`;
