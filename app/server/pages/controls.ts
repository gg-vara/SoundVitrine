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

export const DOWNLOADS = 'm-[.5rem] flex flex-row justify-evenly';
