// Finding artists by what is typed, in any script, and where it shows in their names. A name is reduced to what can be
// compared, each character remembering where it comes from : what is found can't be highlighted elsewhere

export type Range = [start: number, end: number];

interface Reduced {
  text: string;
  // of each character of the text, where it comes from in the name
  sources: Range[];
}

const LETTERS = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// letters that hold no accent to remove
const SPELLED_OUT: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', ð: 'd', ł: 'l', þ: 'th', ı: 'i', ς: 'σ' };

// where marks are accents, to ignore. Elsewhere they may be vowels (हिन्दी, ไทย), which make the word
const ACCENTED_SCRIPTS = /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u;

function reduceLetter(letter: string): string {
  const compatible = letter.normalize('NFKC');
  if (/^[\s·/_,:;-]+$/u.test(compatible)) return '-';
  if (compatible === '&') return '-and-';

  const decomposed = compatible.toLowerCase().normalize('NFD');
  const base = ACCENTED_SCRIPTS.test(decomposed) ? decomposed.replace(/\p{M}/gu, '') : decomposed.normalize('NFC');
  return base.replace(/./gu, character => SPELLED_OUT[character] ?? character).replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

function reduce(name: string): Reduced {
  let text = '';
  const sources: Range[] = [];
  for (const { segment, index } of LETTERS.segment(name)) {
    const source: Range = [index, index + segment.length];
    const reduced = reduceLetter(segment);
    for (let position = 0; position < reduced.length; position++) {
      const unit = reduced.charAt(position);
      // no separator first, nor twice in a row
      if (unit === '-' && (text === '' || text.endsWith('-'))) continue;
      text += unit;
      sources.push(source);
    }
  }
  return { text, sources };
}

function rangeIn({ text, sources }: Reduced, query: string): Range | null {
  const found = text.indexOf(query);
  const first = sources[found];
  const last = sources[found + query.length - 1];
  return found > -1 && first && last ? [first[0], last[1]] : null;
}

// for names nothing remains of ("!!!", "+/-") : as they are
function literalRangeIn(name: string, query: string): Range | null {
  const found = name.toLowerCase().indexOf(query);
  return found > -1 ? [found, found + query.length] : null;
}

// searches "names", in their order, reduced when first needed
export function createNameSearch(names: string[]) {
  let reducedNames: { name: string; reduced: Reduced }[] | undefined;

  return (typed: string, limit: number): [name: string, range: Range][] => {
    reducedNames ??= names.map(name => ({ name, reduced: reduce(name) }));

    const query = reduce(typed).text;
    const literal = typed.trim().toLowerCase();
    if (query === '' && literal === '') return [];

    const results: [string, Range][] = [];
    for (const { name, reduced } of reducedNames) {
      if (results.length === limit) break;
      const range = query === '' ? literalRangeIn(name, literal) : rangeIn(reduced, query);
      if (range) results.push([name, range]);
    }
    return results;
  };
}
