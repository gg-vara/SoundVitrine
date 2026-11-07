// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the account page offers to change : the colors of the user's animated band, and their picture
import { createSignal, For } from 'solid-js';
import { bandRule } from './bandColors';

const STYLE_ID = 'bandStyle';

// it stays for the rest of the page's life, as the library's own band follows it
function bandStyle(): HTMLElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing) return existing;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.body.appendChild(style);
  return style;
}

function BandEditor(props: { owner: string; colors: string[]; opened: (opened: boolean) => void }) {
  const [saved, setSaved] = createSignal(props.colors);
  const [colors, setColors] = createSignal(props.colors);
  const [open, setOpen] = createSignal(false);
  const style = bandStyle();

  const show = (shown: string[]) => {
    setColors(shown);
    style.textContent = bandRule(props.owner, shown);
  };
  show(props.colors);

  const toggle = (opened: boolean) => {
    setOpen(opened);
    props.opened(opened);
  };

  function close(event: Event, keeping: string[]) {
    // or the click would open it again, on its way up
    event.stopPropagation();
    toggle(false);
    show(keeping);
  }

  // the pickers go the other way around
  const pick = (index: number, color: string) =>
    show(colors().map((current, at) => (at === colors().length - 1 - index ? color : current)));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it opens by a click anywhere on it, its inputs do the rest
    // biome-ignore lint/a11y/useKeyWithClickEvents: as above
    <div id="bandEditor" class={['bandEditor', { open: open() }]} title={i18n.updateBBand} onClick={() => toggle(true)}>
      <div class="band" data-owner={props.owner} />
      <div class="bandColorPicker">
        <div class="absolute right-0 -bottom-5 z-10 flex w-full flex-row justify-between">
          <input type="button" value="✕" title={i18n.cancel} onClick={event => close(event, saved())} />
          <input
            type="button"
            value="✓"
            title={i18n.validate}
            onClick={event => {
              const kept = colors();
              setSaved(kept);
              close(event, kept);
              fetch('/account/colors', { method: 'POST', body: JSON.stringify(kept) }).catch(error => {
                console.error('The colors could not be saved', error);
              });
            }}
          />
        </div>
        <div class="bandColors">
          <For each={[0, 1, 2, 3]}>
            {index => (
              <input
                type="color"
                title=""
                value={[...colors()].reverse()[index]}
                onChange={event => pick(index, event.currentTarget.value)}
                onClick={event => event.stopPropagation()}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

// its address once stored, nothing if the server refuses the file
async function uploadPicture(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/account/picture', { method: 'POST', body });
  if (!response.ok) throw new Error(`/account/picture : ${response.status}`);
  return response.text();
}

function PictureEditor(props: { picture: string | null; hidden: boolean }) {
  const [picture, setPicture] = createSignal(props.picture ?? undefined);
  const [uploading, setUploading] = createSignal(false);
  let picker!: HTMLInputElement;

  async function upload() {
    const file = picker.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const address = await uploadPicture(file);
      // the picture it had stays otherwise
      if (address) {
        // same address as the previous one when of the same type, which the browser keeps for a while : refreshed for its other
        // pages, and this one must not reuse what it already decoded
        void fetch(address, { cache: 'reload' }).catch(() => {});
        setPicture(`${address}?${Date.now()}`);
      }
    } catch (error) {
      console.error('The picture could not be uploaded', error);
    }
    setUploading(false);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it opens the picker by a click anywhere on it
    // biome-ignore lint/a11y/useKeyWithClickEvents: as above
    <span
      id="pictureEditor"
      class={['pictureEditor', { uploading: uploading() }]}
      style={props.hidden ? { opacity: 0, 'pointer-events': 'none' } : undefined}
      title={i18n.updateProfilePic}
      onClick={() => {
        if (!uploading()) picker.click();
      }}
    >
      <input
        class="hidden"
        type="file"
        accept="image/*"
        ref={picker}
        onClick={event => event.stopPropagation()}
        onChange={() => void upload()}
      />
      <div class="pictureHolder">
        <i class="fas fa-user" />
        <img src={picture()} alt="" />
      </div>
    </span>
  );
}

export function Editors(props: { owner: string; colors: string[]; picture: string | null }) {
  const [bandOpen, setBandOpen] = createSignal(false);
  return (
    <div class="flex justify-center">
      <BandEditor owner={props.owner} colors={props.colors} opened={setBandOpen} />
      <PictureEditor picture={props.picture} hidden={bandOpen()} />
    </div>
  );
}
