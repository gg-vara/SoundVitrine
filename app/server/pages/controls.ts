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

// the editors of the account page : the classes without a look of their own are what client/account/ looks for
export const EDITORS = 'flex justify-center';

export const BAND_EDITOR =
  'absolute top-[30%] flex h-[3rem] w-full items-center justify-center [transition:all_.5s_ease] [&_input]:cursor-pointer [&.open_.wAnim::after]:[animation-duration:2s] [&:not(.open)_input]:pointer-events-none [&:not(.open):hover]:cursor-pointer [&:not(.open):hover]:opacity-50';

export const BAND_COLOR_PICKER = 'flex h-full w-full items-center justify-center opacity-0 [transition:all_.5s_ease] [.open>&]:opacity-100';

export const BAND_CONTROLS = 'absolute right-0 bottom-[-1.25rem] flex w-full flex-row justify-between';

export const BAND_COLORS = 'absolute bottom-[-1.3rem] [&>*]:[background:none] [&>*]:[border:none]';

const PICTURE_SIZE = 'h-[5rem] w-[5rem] text-[3.5rem]';

// "uploading" comes from client/account/profilePicture.ts
export const PICTURE_EDITOR = `${PICTURE_SIZE} m-[1rem] flex self-center rounded-[40%] bg-[#f3f3f3] [box-shadow:0px_1px_3px_0px] [transition:opacity_.25s_ease] hover:cursor-pointer hover:opacity-50 [&.uploading]:cursor-wait [&.uploading::after]:absolute [&.uploading::after]:top-0 [&.uploading::after]:left-0 [&.uploading::after]:h-full [&.uploading::after]:w-full [&.uploading::after]:flex-col [&.uploading::after]:bg-[url(/public/images/loader.svg)] [&.uploading::after]:bg-[length:75%] [&.uploading::after]:bg-center [&.uploading::after]:bg-no-repeat [&.uploading::after]:[content:""]`;

export const PICTURE_HOLDER = `${PICTURE_SIZE} top-0 left-0 flex [transition:all_.5s_ease] [.uploading>&]:opacity-0 [&>*]:flex [&>*]:h-[5rem] [&>*]:w-[5rem] [&>*]:items-center [&>*]:justify-center [&>*]:text-[3.5rem]`;

export const PICTURE_IMAGE = 'absolute overflow-hidden [&:not([src])]:opacity-0 [&[src]]:rounded-[40%] [&[src]]:bg-[#f3f3f3]';
