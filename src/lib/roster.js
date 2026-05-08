// Roster query + mutation helpers.
//
// Match rules (per handoff #2):
//   - Substring, case-insensitive.
//   - Tier 0 = query appears in lastName.
//   - Tier 1 = query appears in firstName.
//   - Tier 2 = query only matches when lastName + " " + firstName are concatenated
//              (e.g. searching "smith j" matches "Smith Jen").
//   - Within a tier, sort alphabetically by Last, First.
//
// Sort: alphabetical by lastName, then firstName. Case-insensitive.

import { generateRosterId } from './rosterIds.js';
import { loadState, saveState } from './storage.js';

function bySortName(a, b) {
  const al = a.lastName.toLowerCase();
  const bl = b.lastName.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  const af = a.firstName.toLowerCase();
  const bf = b.firstName.toLowerCase();
  if (af < bf) return -1;
  if (af > bf) return 1;
  return 0;
}

/** Full roster, sorted Last, First. */
export function getRoster() {
  const state = loadState();
  return [...state.roster].sort(bySortName);
}

/**
 * Look up one entry by ID. Returns undefined if not found.
 */
export function getRosterEntry(id) {
  if (!id) return undefined;
  const state = loadState();
  return state.roster.find((r) => r.id === id);
}

/**
 * Search the roster. Empty / whitespace-only query returns the full sorted list.
 * Returns matched entries ranked by tier, then by Last, First.
 */
export function searchRoster(query) {
  const all = getRoster();
  const q = (query || '').trim().toLowerCase();
  if (!q) return all;

  return all
    .map((entry) => {
      const last = entry.lastName.toLowerCase();
      const first = entry.firstName.toLowerCase();
      let tier = 3; // 3 = no match
      if (last.includes(q)) tier = 0;
      else if (first.includes(q)) tier = 1;
      else if (`${last} ${first}`.includes(q)) tier = 2;
      return { entry, tier };
    })
    .filter((x) => x.tier < 3)
    .sort((a, b) => a.tier - b.tier || bySortName(a.entry, b.entry))
    .map((x) => x.entry);
}

/**
 * Add a new person to the roster. Generates a unique ID, persists, returns the entry.
 *
 * @param {{firstName: string, lastName: string, team?: string}} input
 * @returns {{id: string, firstName: string, lastName: string, team: string}}
 */
export function addToRoster({ firstName, lastName, team }) {
  const fn = (firstName ?? '').trim();
  const ln = (lastName ?? '').trim();
  if (!fn || !ln) throw new Error('Both firstName and lastName are required.');

  const state = loadState();
  const existingIds = state.roster.map((r) => r.id);
  const id = generateRosterId(fn, ln, existingIds);

  // Default team to whatever existing entries use, falling back to empty string.
  const teamValue = team ?? state.roster[0]?.team ?? '';

  const entry = { id, firstName: fn, lastName: ln, team: teamValue };
  state.roster.push(entry);
  saveState(state);
  return entry;
}

// --- Display formatters --------------------------------------------------
// Picker shows "Last, First" for unambiguous selection.
// In-round surfaces (squad strip, active card, end-of-round, PDF) show bare first name.

export function pickerLabel(entry) {
  return `${entry.lastName}, ${entry.firstName}`;
}

export function fullName(entry) {
  return `${entry.firstName} ${entry.lastName}`;
}
