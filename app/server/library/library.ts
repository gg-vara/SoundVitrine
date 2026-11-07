// Music libraries : from the tracks SoundBuddy uploads (current.json), the data the library page shows (unified.json)

import { join } from 'node:path';
import { userFolder } from '../auth/users';
import { COMPILED_MUSIC_LIB_PROFILE_FILE_NAME, MUSIC_LIB_PROFILE_FILE_NAME } from '../config';

// a track, as exported by SoundBuddy (ItunesLibraryParser)
export interface Track {
  Name?: string;
  Album?: string;
  'Album Artist'?: string;
  Genre?: string;
  Year?: number | string;
  'Disc Number'?: number | string;
  'Track Number'?: number | string;
  'Date Added'?: string;
}

// objects keep their keys in insertion order : unlike plain objects, which put integer-like keys first
type Ordered = Map<string, unknown>;

interface Album {
  Year: Track['Year'];
  Genre: string;
  Tracks: Ordered; // track name by "disc.track" number
  DateAdded: Track['Date Added'];
}

interface Artist {
  Genres: string[];
  Albums: Map<string, Album>;
}

// as PHP's ucwords
function capitalizeWords(text: string): string {
  return text.replace(/(^|[ \t\r\n\f\v])([a-z])/g, (_match, space: string, letter: string) => space + letter.toUpperCase());
}

const genreOf = (track: Track) => capitalizeWords(String(track.Genre ?? ''));
const albumArtistOf = (track: Track) => String(track['Album Artist'] ?? '');
const albumOf = (track: Track) => String(track.Album ?? '');
const albumIdOf = (track: Track) => `${albumOf(track)}_${albumArtistOf(track)}_${track.Year ?? ''}`;
const trackNumberOf = (track: Track) => `${track['Disc Number'] ?? ''}.${track['Track Number'] ?? ''}`;

// "id" of each track, uniquely, by genre
function genreLists(tracks: Track[], idOf: (track: Track) => string): Map<string, string[]> {
  const lists = new Map<string, Set<string>>();
  for (const track of tracks) {
    const genre = genreOf(track);
    let ids = lists.get(genre);
    if (!ids) {
      ids = new Set();
      lists.set(genre, ids);
    }
    ids.add(idOf(track));
  }
  return new Map([...lists].map(([genre, ids]) => [genre, [...ids]]));
}

// list sizes, the largest first
function counts(lists: Map<string, string[]>): Ordered {
  return new Map([...lists].map(([genre, ids]) => [genre, ids.length] as const).sort((a, b) => b[1] - a[1]));
}

function albumsByArtist(tracks: Track[]): Map<string, Artist> {
  const artists = new Map<string, Artist>();
  for (const track of tracks) {
    const name = albumArtistOf(track);
    const genre = genreOf(track);

    let artist = artists.get(name);
    if (!artist) {
      artist = { Genres: [], Albums: new Map() };
      artists.set(name, artist);
    }
    if (!artist.Genres.includes(genre)) artist.Genres.push(genre);

    const albumName = albumOf(track);
    let album = artist.Albums.get(albumName);
    if (!album) {
      album = { Year: track.Year, Genre: genre, Tracks: new Map(), DateAdded: track['Date Added'] };
      artist.Albums.set(albumName, album);
    }
    album.Tracks.set(trackNumberOf(track), track.Name);
  }
  return artists;
}

// albums by id, with the latest date one of their tracks was added
function albumsById(tracks: Track[]): Ordered {
  const albums = new Map<string, { Album: string; Artist: string; Year: Track['Year']; DateAdded: Track['Date Added']; Genre: string }>();
  for (const track of tracks) {
    const id = albumIdOf(track);
    const dateAdded = track['Date Added'];
    const album = albums.get(id);
    if (!album) {
      albums.set(id, {
        Album: albumOf(track),
        Artist: albumArtistOf(track),
        Year: track.Year,
        DateAdded: dateAdded,
        Genre: genreOf(track),
      });
    } else if (dateAdded !== undefined && (album.DateAdded === undefined || dateAdded > album.DateAdded)) {
      album.DateAdded = dateAdded;
    }
  }
  return albums;
}

// the shortest names first, then alphabetically : the order the search relies on
function artistNames(artists: Iterable<string>): string[] {
  return [...artists].sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

// the data of the library page, from the uploaded tracks
export function unifiedLibrary(tracks: Track[]): Record<string, unknown> {
  const albumsByGenre = genreLists(tracks, albumIdOf);
  const artistsByGenre = genreLists(tracks, albumArtistOf);
  const artists = albumsByArtist(tracks);

  return {
    albumCounts: counts(albumsByGenre),
    artistsByGenre: artistsByGenre,
    artistCounts: counts(artistsByGenre),
    albums: albumsById(tracks),
    artists: artists,
    artistNames: artistNames(artists.keys()),
  };
}

// JSON, maps becoming objects with their keys in order, and empty ones arrays; missing values are null (as PHP does)
export function toJson(value: unknown): string {
  if (value instanceof Map) {
    if (value.size === 0) return '[]';
    return `{${[...value].map(([key, item]) => `${JSON.stringify(key)}:${toJson(item)}`).join(',')}}`;
  }
  if (Array.isArray(value)) return `[${value.map(toJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}:${toJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function libraryPath(username: string): string {
  return join(userFolder(username), MUSIC_LIB_PROFILE_FILE_NAME);
}

// writes unified.json from current.json
export async function compileLibrary(username: string) {
  const tracks: unknown = await Bun.file(libraryPath(username)).json();
  const list = Array.isArray(tracks) ? tracks : Object.values(tracks ?? {});
  await Bun.write(join(userFolder(username), COMPILED_MUSIC_LIB_PROFILE_FILE_NAME), toJson(unifiedLibrary(list as Track[])));
}
