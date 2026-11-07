// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Pies of a library, by albums or by artists. Chart.js comes when the panel first opens : most visits never need it
import { createSignal } from 'solid-js';
import { slicesOf } from './slices';

export interface StatsPanelControls {
  // draws the pies, once
  open: () => Promise<void>;
}

export interface StatsCounts {
  albums: Record<string, number>;
  artists: Record<string, number>;
}

export function StatsPanel(props: { counts: () => StatsCounts | undefined; controls: (controls: StatsPanelControls) => void }) {
  const [drawn, setDrawn] = createSignal(false);

  let stats!: HTMLDivElement;
  let albums!: HTMLCanvasElement;
  let artists!: HTMLCanvasElement;
  let opening: Promise<void> | undefined;

  async function draw() {
    const counts = props.counts();
    if (!counts) return;

    const { createPie } = await import('./pieChart');
    createPie(albums, slicesOf(counts.albums), 'Albums', i18n.statsPointFormat ?? '');
    createPie(artists, slicesOf(counts.artists), i18n.artists ?? '', i18n.statsPointFormat ?? '');
    setDrawn(true);
  }

  props.controls({
    open: () => {
      opening ??= draw().catch(error => {
        // the next opening tries again
        opening = undefined;
        console.error('The stats could not be drawn', error);
      });
      return opening;
    },
  });

  const show = (panel: number) => {
    stats.scrollTop = stats.clientHeight * panel;
  };

  return (
    <>
      <div
        id="stats"
        class={[
          'flex h-[400px] flex-col overflow-hidden scroll-smooth [transition:opacity_.5s_ease]',
          drawn() ? 'opacity-100' : 'opacity-0',
        ]}
        ref={stats}
      >
        <div class="h-[400px] w-full min-w-0 shrink-0">
          <canvas ref={albums} />
        </div>
        <div class="h-[400px] w-full min-w-0 shrink-0">
          <canvas ref={artists} />
        </div>
      </div>
      <div id="statsSwitcher" class="flex items-center justify-center py-6 text-[1rem]">
        <div class="mr-6 flex items-center">
          <label class="clickable" title="Albums">
            <input class="mx-[3px] my-0" type="radio" name="statsS" onChange={() => show(0)} checked autocomplete="off" />
            <i class="fas fa-compact-disc" />
            <span>Albums</span>
          </label>
        </div>
        <div class="flex items-center">
          <label class="clickable" title={i18n.artists}>
            <input class="mx-[3px] my-0" type="radio" name="statsS" onChange={() => show(1)} autocomplete="off" />
            <i class="fas fa-users" />
            <span>{i18n.artists}</span>
          </label>
        </div>
      </div>
    </>
  );
}
