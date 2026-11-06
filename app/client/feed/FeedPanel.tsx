// The latest albums of a library, in a table by how long ago they were added
import { createSignal, For, Show } from 'solid-js';
import type { FeedAlbum } from '../library/data';
import { cellFilter, cellText, FEED_COLUMNS, type FeedColumn, type FeedSort, nextSort, sortedAlbums } from './table';

const TD =
  'p-[.3rem] first:pl-2 last:pr-2 [tr:first-child_&]:pt-2 [tr:last-child_&]:pb-2 [tr:not(:last-child)_&]:[border-bottom:1px_dashed_#ececec] not-last:[border-right:1px_dashed_#ececec]';

function FeedTable(props: { albums: FeedAlbum[]; select: (event: Event) => void }) {
  const [sort, setSort] = createSignal<FeedSort | null>(null);
  const albums = () => sortedAlbums(props.albums, sort());

  return (
    <table class="w-full border-collapse bg-white [font-family:Arial] text-[.5rem] text-[#3a3a3a] shadow-[0px_0px_3px_0px_#d8d8d8]">
      <thead>
        <tr>
          <For each={FEED_COLUMNS}>
            {(column: FeedColumn) => (
              <th
                class="cursor-pointer p-[.3rem] [border-bottom:1px_solid_#f3f3f3] text-[#5a5a5a]"
                onClick={() => setSort(current => nextSort(current, column))}
              >
                {i18n[column.toLowerCase()] || column}
                <Show when={sort()?.column === column}>
                  <span>{sort()?.reversed ? ' ▴' : ' ▾'}</span>
                </Show>
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={albums()}>
          {album => (
            <tr class="[transition:all_.1s_linear] hover:bg-[#f1f1f1]" title={i18n.access}>
              <For each={FEED_COLUMNS}>
                {(column: FeedColumn) => {
                  const filter = cellFilter(album, column);
                  return filter ? (
                    <td class={`${TD} cursor-pointer hover:font-bold`} data-n-filter={filter} onMouseDown={props.select}>
                      {cellText(album, column)}
                    </td>
                  ) : (
                    <td class={TD}>{cellText(album, column)}</td>
                  );
                }}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export function FeedPanel(props: { intervals: Record<string, FeedAlbum[]>; select: (event: Event) => void }) {
  return (
    <For each={Object.entries(props.intervals)}>
      {([interval, albums]) => (
        <section class="break-inside-avoid">
          <h1 class="mx-0 my-4 text-center font-normal text-[#5a5a5a] [section:first-child_&]:mt-0">{interval}</h1>
          <FeedTable albums={albums} select={props.select} />
        </section>
      )}
    </For>
  );
}
