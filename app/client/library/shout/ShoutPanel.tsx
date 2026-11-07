// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// What the owner of the library is listening to

import { createSignal, Show } from 'solid-js';
import { createActor } from 'xstate';
import { play } from '../../shared/motion';
import { createCoverFinder, onCoverBroken, onCoverLoaded } from '../cover/cover';
import { fitShutter, setShutter } from '../navigation';
import { youtubeSearchUrl } from '../youtube';
import { followShouts } from './live';
import { elapsedSince, metaText, movesTimeline, type Shout } from './logic';
import { shoutMachine } from './machine';

const CONTAINER_ID = 'shoutContainer';
const MUTE_STORAGE_KEY = 'muteShoutNotification';
const NOTIFICATION_SECONDS = 0.5;

export interface ShoutPanelControls {
  start: () => void;
  resize: () => void;
}

// the height of the closed panel is measured with these : they never show, as a shout comes before it opens
const PLACEHOLDER = 'PLACEHOLDER';

function millisecondsSince(date: string): number {
  const elapsed = elapsedSince(date, Date.now());
  if (elapsed < 0) console.warn('A shout cannot come from the future : its date must be UTC+0', date);
  return elapsed;
}

export function ShoutPanel(props: { controls: (controls: ShoutPanelControls) => void }) {
  const [shown, setShown] = createSignal<Shout | null>(null);
  const [muted, setMuted] = createSignal(localStorage.getItem(MUTE_STORAGE_KEY) === '1');

  const sound = new Audio('/public/audio/long-expected.mp3');
  sound.autoplay = false;

  let notification!: HTMLDivElement;
  let cover!: HTMLDivElement;
  let timeline!: HTMLDivElement;
  const findCover = createCoverFinder('shout', () => cover);

  const track = () => {
    const shout = shown();
    return shout?.artist && shout.name ? youtubeSearchUrl(shout.artist, shout.name) : undefined;
  };

  function toggleMuted() {
    const mute = !muted();
    localStorage.setItem(MUTE_STORAGE_KEY, mute ? '1' : '0');
    setMuted(mute);
  }

  function restartTimeline(shout: Shout) {
    const playing = Boolean(shout.playerState);
    timeline.style.animationDuration = '';
    timeline.style.animationDelay = '';
    timeline.style.animationPlayState = '';
    timeline.classList.remove('animTimeline');

    // for the animation to start over
    void timeline.offsetWidth;

    const position = (shout.playerPositionMS ?? 0) + (playing && shout.date ? millisecondsSince(shout.date) : 0);
    timeline.style.animationDuration = `${shout.duration}s`;
    timeline.style.animationDelay = `${-position}ms`;
    if (!playing) timeline.style.animationPlayState = 'paused';
    timeline.classList.add('animTimeline');
  }

  function playSound() {
    const hasUserBeenActive = navigator.userActivation?.hasBeenActive;
    // Firefox
    const allowedByPolicy =
      (navigator as { getAutoplayPolicy?: (media: HTMLMediaElement) => string }).getAutoplayPolicy?.(sound) === 'allowed';
    if (!hasUserBeenActive && !allowedByPolicy) return;

    sound.volume = muted() ? 0 : 0.5;
    // refused by Chrome at times : expected
    sound.play().catch(() => {});
  }

  function showWidget() {
    const widget = document.getElementById('shoutWidget');
    if (!widget) return;
    requestAnimationFrame(() => {
      widget.classList.remove('show');
      void widget.offsetWidth;
      widget.classList.add('show');
    });
  }

  const actor = createActor(shoutMachine, {
    input: {
      effects: {
        follow: followShouts,
        // the notification covers the panel while the next track comes in
        fadeOutNotification: () => {
          notification.classList.remove('fade');
          return play(notification, { height: ['0%', '100%'] }, NOTIFICATION_SECONDS);
        },
        toggleShutter: open => setShutter(CONTAINER_ID, open),
        show: (shout, changes) => {
          if (changes.includes('album')) findCover(shout.album, shout.artist);
          setShown(shout);
          if (movesTimeline(changes)) restartTimeline(shout);
        },
        announce: () => {
          // the panel out of sight : a small floating widget tells about it
          const bounds = document.getElementById(CONTAINER_ID)?.getBoundingClientRect();
          if (bounds && (bounds.bottom < 0 || bounds.left < 0)) showWidget();

          requestAnimationFrame(() => {
            playSound();
            notification.classList.add('fade');
            void play(notification, { height: ['100%', '0%'] }, NOTIFICATION_SECONDS);
          });
        },
        millisecondsSince,
      },
    },
  });
  actor.start();

  props.controls({
    start: () => actor.send({ type: 'start' }),
    resize: () => fitShutter(CONTAINER_ID, actor.getSnapshot().context.worthDisplaying),
  });

  return (
    <>
      <div
        id="shoutNotification"
        class="absolute z-20 flex h-full w-full items-center justify-center overflow-hidden bg-white [&.fade]:h-0"
        ref={notification}
      >
        {i18n.nowPlaying}
      </div>
      <div class="flex w-full flex-row items-center justify-center py-4">
        <a class="ml-2" title={i18n.playOnYT} rel="noopener" href={track()} target={track() ? '_blank' : undefined}>
          <div class={['cover', 'group/cover z-1 h-8 w-8 text-[.5rem] shadow-[0px_0px_10px_#a9a9a9]']} ref={cover}>
            <img class="group-hover/cover:opacity-50" onLoad={onCoverLoaded} onError={onCoverBroken} alt="" />
            <i class="fab fa-youtube absolute top-[.5em] left-2 z-5000 text-[1rem] text-[red] opacity-0 [transition:all_.3s_ease] group-hover/cover:opacity-100" />
          </div>
        </a>
        <div class="z-1 mx-2">
          <div>
            <div>{shown() ? (shown()?.name ?? '') : PLACEHOLDER}</div>
            <div class="text-[.7rem]">
              <Show when={shown()?.genre} fallback={shown() ? metaText(shown() as Shout) : PLACEHOLDER}>
                <span>{metaText(shown() as Shout)}</span>
                <span class="text-[grey]">{` // ${shown()?.genre}`}</span>
              </Show>
            </div>
          </div>
        </div>
        <div
          class="absolute bottom-0 left-0 z-0 h-[.1rem] w-full bg-black opacity-10 [transition:all_.1s_ease] group-hover:h-full"
          ref={timeline}
        />
        <label class="clickable absolute right-0 mr-4 text-[.7rem] text-[grey] opacity-0 [transition:all_.3s_ease] group-hover:opacity-100">
          <input id="muzzleShout" type="checkbox" onChange={toggleMuted} autocomplete="off" />
          <i class={`fas ${muted() ? 'fa-bell-slash' : 'fa-bell'}`} title={muted() ? i18n.playSound : i18n.muteNotif} />
        </label>
      </div>
    </>
  );
}
