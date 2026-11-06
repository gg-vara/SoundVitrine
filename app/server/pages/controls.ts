// How the controls of the account pages look. Tailwind reads these here : client/style.css scans this folder

const HYPE =
  'flex items-center justify-center rounded-[20px] [border:0] [box-shadow:0px_0px_5px_0px_rgba(0,0,0,.33)] [font-family:inherit] [font-size:inherit] [&_i]:mr-[.5em] [&_i]:text-[.8em] [&_span]:mb-[-.1em]';

export const HYPE_BUTTON = `${HYPE} bg-[#333] p-[.25rem] text-[#DDD] [transition:color_.33s_ease,background-color_.33s_ease] hover:bg-[#EEE] hover:text-[#333]`;

export const HYPE_SUBMIT = `${HYPE} mb-[1rem] text-[#162f0ed6] [transition:color_.5s_ease,box-shadow_.5s_ease] hover:text-[green] hover:[box-shadow:0px_0px_5px_0px_rgba(0,0,0,.5)]`;

export const TEXT_INPUT = 'w-full rounded-[5px] border border-dashed border-[rgba(0,0,0,.33)] p-[.5rem] pt-[1.1rem] text-[.75rem]';

// holding what its "placeholder" attribute says
export const MAGNIFIK =
  '[&::after]:absolute [&::after]:top-[.25rem] [&::after]:right-[.25rem] [&::after]:text-[.55rem] [&::after]:text-[grey] [&::after]:[content:attr(placeholder)] [&::after]:[transition:all_.5s_ease]';

export const MAGNIFIK_INPUT = `${TEXT_INPUT} [background:rgba(255,255,255,.75)] [&:-webkit-autofill]:[animation-fill-mode:both] [&:-webkit-autofill]:[animation-name:autofill]`;

// "hide" comes from a click on it
export const POPUP =
  'flex max-h-[1000px] cursor-pointer justify-center overflow-hidden px-0 py-[1rem] [transition:all_.5s_ease] [&.hide]:max-h-0 [&.hide]:p-0';

export const POPUP_CONTENT =
  'max-w-[75%] overflow-hidden border-[5px] border-dashed border-[rgba(255,255,255,.25)] bg-[#f10000] p-[1rem] whitespace-normal text-[#ebebeb] select-none [transition:all_.5s_ease] [.hide>&]:border-transparent [.hide>&]:bg-transparent [.hide>&]:text-transparent [&::after]:absolute [&::after]:top-0 [&::after]:right-[.25rem] [&::after]:[content:"🗙"]';

export const DOWNLOAD_EXPLAIN = 'flex flex-col bg-white px-0 py-[.25em] text-[#515151] [transition:opacity_.2s] hover:opacity-80';

export const DOWNLOAD_NAME = 'text-[#d20068] [text-shadow:white_0_0_2px]';

// the editors of the account page : the classes without a look of their own are what client/account/ looks for
export const EDITORS = 'flex justify-center';

export const BAND_EDITOR =
  'absolute top-[30%] flex h-[3rem] w-full items-center justify-center [transition:all_.5s_ease] [&_input]:cursor-pointer [&.open_.wAnim::after]:[animation-duration:2s] [&:not(.open)_input]:pointer-events-none [&:not(.open):hover]:cursor-pointer [&:not(.open):hover]:opacity-50';

export const BAND_COLOR_PICKER = 'flex h-full w-full items-center justify-center opacity-0 [transition:all_.5s_ease] [.open>&]:opacity-100';

// over the colors, which are wider than the band in the narrower pages
export const BAND_CONTROLS = 'absolute right-0 z-10 bottom-[-1.25rem] flex w-full flex-row justify-between';

export const BAND_COLORS = 'absolute bottom-[-1.3rem] [&>*]:[background:none] [&>*]:[border:none]';

const PICTURE_SIZE = 'h-[5rem] w-[5rem] text-[3.5rem]';

// "uploading" comes from client/account/profilePicture.ts
export const PICTURE_EDITOR = `${PICTURE_SIZE} m-[1rem] flex self-center rounded-[40%] bg-[#f3f3f3] [box-shadow:0px_1px_3px_0px] [transition:opacity_.25s_ease] hover:cursor-pointer hover:opacity-50 [&.uploading]:cursor-wait [&.uploading::after]:absolute [&.uploading::after]:top-0 [&.uploading::after]:left-0 [&.uploading::after]:h-full [&.uploading::after]:w-full [&.uploading::after]:flex-col [&.uploading::after]:bg-[url(/public/images/loader.svg)] [&.uploading::after]:bg-[length:75%] [&.uploading::after]:bg-center [&.uploading::after]:bg-no-repeat [&.uploading::after]:[content:""]`;

export const PICTURE_HOLDER = `${PICTURE_SIZE} top-0 left-0 flex [transition:all_.5s_ease] [.uploading>&]:opacity-0 [&>*]:flex [&>*]:h-[5rem] [&>*]:w-[5rem] [&>*]:items-center [&>*]:justify-center [&>*]:text-[3.5rem]`;

export const PICTURE_IMAGE = 'absolute overflow-hidden [&:not([src])]:opacity-0 [&[src]]:rounded-[40%] [&[src]]:bg-[#f3f3f3]';

// what holds a page's content
export const MAIN_FRAME = 'z-0 flex grow flex-col';

export const LOGIN_RACK = 'm-[.5rem] flex flex-col';

export const ACCOUNT_CREATION = 'flex flex-col text-center';

export const ACCOUNT_MANAGEMENT = `${ACCOUNT_CREATION} [&_button:not(:first-child):not(:only-child)]:mt-[1rem] [&>*:not(:first-child):not(:only-child)]:mt-[1rem]`;

export const FOOTER = 'mb-[.5rem] flex w-full flex-row-reverse items-center justify-between bg-[#dcdcdc]';

const FOOTER_PART = 'flex h-full items-center bg-white text-[.65rem]';

export const FOOTER_MIDDLE = `${FOOTER_PART} p-[.35rem]`;

export const CREDITS = `${FOOTER_PART} mr-[5%] self-end p-[.35rem] text-[#525252] [&_a]:h-[.75rem] [&_img]:h-[.75rem]`;

export const LANGUAGES = `${FOOTER_PART} ml-[5%] self-start px-[.35rem] py-0 [&_img]:h-[1.3rem] [&>*]:flex [&>*:not(:first-child)]:ml-[.5rem] [&>*:not(.unselected)_img]:border [&>*:not(.unselected)_img]:border-dashed [&>*:not(.unselected)_img]:border-[#6a67bd57] [&>*:not(.unselected)_img]:px-[.2rem] [&>*:not(.unselected)_img]:py-0`;
