/** Tiny crypto-based nanoid — no external dependency */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function nanoid(size = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes)
    .map(b => ALPHABET[b % ALPHABET.length])
    .join('')
}
