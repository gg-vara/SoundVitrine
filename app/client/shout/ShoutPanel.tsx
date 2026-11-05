// What the owner of the library is listening to. Its styles are still in client/legacy/explorer/css/shout.css
import { createSignal, Show } from 'solid-js';
import { createActor } from 'xstate';
import { followShouts } from './live';
import { metaText, movesTimeline, type Shout } from './logic';
import { shoutMachine } from './machine';

const CONTAINER_ID = 'shoutContainer';
const MUTE_STORAGE_KEY = 'muteShoutNotification';

export interface ShoutPanelControls {
  start: () => void;
  resize: () => ResizeInstructions;
}

// the height of the closed panel is measured with these : they never show, as a shout comes before it opens
const PLACEHOLDER = 'PLACEHOLDER';

export function ShoutPanel(props: { controls: (controls: ShoutPanelControls) => void }) {
  const [shown, setShown] = createSignal<Shout | null>(null);
  const [muted, setMuted] = createSignal(localStorage.getItem(MUTE_STORAGE_KEY) === '1');

  const sound = new Audio('/public/audio/long-expected.mp3');
  sound.autoplay = false;

  let notification!: HTMLDivElement;
  let cover!: HTMLDivElement;
  let timeline!: HTMLDivElement;

  const track = () => {
    const shout = shown();
    return shout?.artist && shout.name ? linkToYoutube(shout.artist, shout.name) : undefined;
  };

  function toggleMuted() {
    const mute = !muted();
    localStorage.setItem(MUTE_STORAGE_KEY, mute ? '1' : '0');
    setMuted(mute);
  }

  function updateCover(shout: Shout) {
    resetImgLoader(cover);
    if (!shout.album || !shout.artist) return;
    queryMusicBrainzForAlbumCover('shout', shout.album, shout.artist).then(
      imgUrl => updateImgLoader(cover, imgUrl),
      () => brokenImgFr(cover),
    );
  }

  function restartTimeline(shout: Shout) {
    const playing = Boolean(shout.playerState);
    timeline.style.animationDuration = '';
    timeline.style.animationDelay = '';
    timeline.style.animationPlayState = '';
    timeline.classList.remove('animTimeline');

    // for the animation to start over
    void timeline.offsetWidth;

    const position = (shout.playerPositionMS ?? 0) + (playing && shout.date ? calculateMillisecondsElapsed(shout.date) : 0);
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
    const widget = document.getElementById('shoutNotificationWidget');
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
        fadeOutNotification: () => waitTransitionEnd(notification, () => notification.classList.remove('fade')),
        toggleShutter: open => _toggleShutter(CONTAINER_ID, () => _resizeShutter(CONTAINER_ID, open)),
        show: (shout, changes) => {
          if (changes.includes('album')) updateCover(shout);
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
          });
        },
        millisecondsSince: calculateMillisecondsElapsed,
      },
    },
  });
  actor.start();

  props.controls({
    start: () => actor.send({ type: 'start' }),
    resize: () => _resizeShutter(CONTAINER_ID, actor.getSnapshot().context.worthDisplaying),
  });

  return (
    <>
      <div id="shoutNotification" ref={notification}>
        {i18n.nowPlaying}
      </div>
      <div class="shout">
        <a title={i18n.playOnYT} rel="noopener" href={track()} target={track() ? '_blank' : undefined}>
          <div id="shoutImgLoader" class="imgLoader cover" ref={cover}>
            <img onLoad={imgLoaded} onError={brokenImg} alt="" />
            <i class="fab fa-youtube" />
          </div>
        </a>
        <div class="albumDesc">
          <div>
            <div class="name">{shown() ? (shown()?.name ?? '') : PLACEHOLDER}</div>
            <div class="meta">
              <Show when={shown()?.genre} fallback={shown() ? metaText(shown() as Shout) : PLACEHOLDER}>
                <span>{metaText(shown() as Shout)}</span>
                <span style={{ color: 'grey' }}>{` // ${shown()?.genre}`}</span>
              </Show>
            </div>
          </div>
        </div>
        <div class="timeline" ref={timeline} />
        <label class="mute clickable">
          <input id="muzzleShout" type="checkbox" onChange={toggleMuted} autocomplete="off" />
          <i class={`fas ${muted() ? 'fa-bell-slash' : 'fa-bell'}`} title={muted() ? i18n.playSound : i18n.muteNotif} />
        </label>
      </div>
    </>
  );
}
