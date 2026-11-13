// ─────────────────────────────────────────────────────────────────────────────
// Password Generator — uses Web Crypto API ONLY. Never Math.random().
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.?',
} as const;

/** Cryptographically secure random integer in [0, max) */
function secureRandInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Rejection sampling to remove modulo bias
  const limit = Math.floor(0x100000000 / max) * max;
  let val = array[0];
  while (val >= limit) {
    crypto.getRandomValues(array);
    val = array[0];
  }
  return val % max;
}

/** Pick one random character from a charset string */
function pickChar(charset: string): string {
  return charset[secureRandInt(charset.length)];
}

/** Fisher-Yates shuffle with Web Crypto randomness */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePassword(opts: GeneratorOptions): string {
  const { length, uppercase, lowercase, numbers, symbols } = opts;

  // Build the available charset
  let charset = '';
  if (uppercase) charset += CHARSETS.uppercase;
  if (lowercase) charset += CHARSETS.lowercase;
  if (numbers)   charset += CHARSETS.numbers;
  if (symbols)   charset += CHARSETS.symbols;

  // Fallback: at least lowercase
  if (!charset) charset = CHARSETS.lowercase;

  // Guarantee at least one char from each selected category
  const guaranteed: string[] = [];
  if (uppercase && length >= 1) guaranteed.push(pickChar(CHARSETS.uppercase));
  if (lowercase && length >= 2) guaranteed.push(pickChar(CHARSETS.lowercase));
  if (numbers   && length >= 3) guaranteed.push(pickChar(CHARSETS.numbers));
  if (symbols   && length >= 4) guaranteed.push(pickChar(CHARSETS.symbols));

  // Fill remaining slots from full charset
  const fillLen = Math.max(0, length - guaranteed.length);
  const filler = Array.from({ length: fillLen }, () => pickChar(charset));

  // Shuffle and join
  return shuffleArray([...guaranteed, ...filler]).join('');
}

/** Calculate the theoretical charset pool size for the given options */
export function getCharsetSize(opts: GeneratorOptions): number {
  let n = 0;
  if (opts.uppercase) n += 26;
  if (opts.lowercase) n += 26;
  if (opts.numbers)   n += 10;
  if (opts.symbols)   n += CHARSETS.symbols.length;
  return n || 26;
}
