/**
 * A text with its values filled, in the subset of ICU message syntax the screens' texts use: `{name}`, plurals
 * (`{count, plural, =0 {none} one {# item} other {# items}}`, with Arabic's zero, two, few and many) and choices
 * (`{kind, select, a {…} other {…}}`), nested. No React and no i18n library; a value that's missing stays as `{name}`.
 */
export function formatMessage(locale: string, pattern: string, values: Record<string, string | number> = {}): string {
  return render(pattern, 0, pattern.length, locale, values, undefined);
}

function render(s: string, from: number, to: number, locale: string, values: Record<string, string | number>, hash: string | undefined): string {
  let out = '';
  let i = from;
  while (i < to) {
    const ch = s[i];
    if (ch === '#' && hash !== undefined) {
      out += hash;
      i++;
    } else if (ch === '{') {
      const end = matching(s, i);
      out += argument(s, i + 1, end, locale, values);
      i = end + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** The index of the `}` that closes the `{` at `open`. */
function matching(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return s.length - 1;
}

function argument(s: string, from: number, to: number, locale: string, values: Record<string, string | number>): string {
  const body = s.slice(from, to);
  const first = body.indexOf(',');
  const name = (first < 0 ? body : body.slice(0, first)).trim();
  const value = values[name];
  if (first < 0) return value === undefined ? `{${name}}` : String(value);

  const rest = body.slice(first + 1);
  const second = rest.indexOf(',');
  const kind = rest.slice(0, second).trim();
  const options = branches(s, from + first + 1 + second + 1, to);
  if (kind === 'plural') {
    const n = Number(value);
    if (Number.isNaN(n)) return `{${name}}`;
    const branch = options.get(`=${n}`) ?? options.get(new Intl.PluralRules(locale).select(n)) ?? options.get('other');
    return branch ? render(s, branch[0], branch[1], locale, values, formatCount(n, locale)) : '';
  }
  if (kind === 'select') {
    const branch = options.get(String(value)) ?? options.get('other');
    return branch ? render(s, branch[0], branch[1], locale, values, undefined) : '';
  }
  return value === undefined ? `{${name}}` : String(value);
}

/** A plural or select's branches: each key and where its text starts and ends in `s`. */
function branches(s: string, from: number, to: number): Map<string, [number, number]> {
  const found = new Map<string, [number, number]>();
  let i = from;
  while (i < to) {
    while (i < to && /\s/.test(s[i])) i++;
    let key = '';
    while (i < to && s[i] !== '{' && !/\s/.test(s[i])) key += s[i++];
    while (i < to && /\s/.test(s[i])) i++;
    if (i >= to || s[i] !== '{') break;
    const end = matching(s, i);
    found.set(key, [i + 1, end]);
    i = end + 1;
  }
  return found;
}

/** A plural's count where `#` stands, in Latin digits as every number the design system writes. */
function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { numberingSystem: 'latn' }).format(n);
}
