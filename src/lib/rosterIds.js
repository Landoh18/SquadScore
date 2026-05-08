// Roster ID generation per handoff #2's "ID generation rule".
//
// Format: [FirstInitial][First3OfLast][2DigitSuffix], all uppercase, always 6 chars.
// - Strip apostrophes, periods, spaces, and any other non-letters from names.
// - Short-last-name fallback: borrow letters from the first name to fill the 4-letter prefix.
//     last >= 3 letters: 1 from first + 3 from last
//     last  = 2 letters: 2 from first + 2 from last
//     last  = 1 letter : 3 from first + 1 from last
// - Universal '01' padding (no collision-only suffix), so every ID looks identical in shape.
// - Collisions on the same prefix increment to '02', '03', ... up to '99'.

/** Strip everything that isn't an A–Z letter, then uppercase. */
function lettersOnly(str) {
  return (str || '').replace(/[^A-Za-z]/g, '').toUpperCase();
}

/**
 * Build the 4-letter prefix for a name. Pure — no roster knowledge.
 */
export function rosterIdPrefix(firstName, lastName) {
  const f = lettersOnly(firstName);
  const l = lettersOnly(lastName);

  if (!f || !l) {
    // Defensive fallback. Real use will always have both.
    return (f + l + 'XXXX').slice(0, 4).padEnd(4, 'X');
  }

  // Standard case: 1 from first + 3 from last.
  if (l.length >= 3) return (f.slice(0, 1) + l.slice(0, 3));
  // Last is 2 letters: 2 from first + 2 from last.
  if (l.length === 2) return (f.slice(0, 2) + l);
  // Last is 1 letter: 3 from first + 1 from last.
  return (f.slice(0, 3) + l);
}

/**
 * Generate a full 6-character roster ID, accounting for collisions against
 * an existing set of IDs already in use.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @param {Set<string>|Array<string>|Iterable<string>} existingIds  IDs already taken (case-insensitive).
 * @returns {string} the new ID, e.g. 'ABEN01'
 * @throws if 99 collisions are exceeded for a single prefix (will not happen in practice).
 */
export function generateRosterId(firstName, lastName, existingIds = []) {
  const taken = new Set(
    Array.from(existingIds).map((s) => String(s).toUpperCase())
  );
  const prefix = rosterIdPrefix(firstName, lastName);

  for (let n = 1; n <= 99; n++) {
    const candidate = prefix + String(n).padStart(2, '0');
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Cannot generate roster ID: 99 collisions exhausted for prefix ${prefix}`);
}
