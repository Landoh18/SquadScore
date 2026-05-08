// localStorage persistence layer for SquadScore.
//
// Single key ('squadscore:state') holds the full app state as JSON:
//   { version, roster, rounds }
//
// On first load (no key present) the seed roster from handoff #3 is written.
// Corrupted JSON triggers a reseed with a console warning — extremely rare,
// but defensive so a bad localStorage value can't brick the app.

import { SEED_ROSTER } from './seedRoster.js';

const STATE_KEY = 'squadscore:state';

function defaultState() {
  return {
    version: 1,
    roster: SEED_ROSTER.map((e) => ({ ...e })), // shallow clone — primitives only
    rounds: [],
  };
}

/**
 * Read the full app state. Seeds + saves on first call.
 * Always returns a valid state object; never throws.
 */
export function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(STATE_KEY);
  } catch (err) {
    console.error('SquadScore: localStorage unavailable, using in-memory default.', err);
    return defaultState();
  }

  if (!raw) {
    const fresh = defaultState();
    saveState(fresh);
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw);
    // Minimal shape sanity check; reseed on serious corruption.
    if (!parsed || !Array.isArray(parsed.roster) || !Array.isArray(parsed.rounds)) {
      throw new Error('Invalid state shape');
    }
    return parsed;
  } catch (err) {
    console.error('SquadScore: stored state corrupted, reseeding.', err);
    const fresh = defaultState();
    saveState(fresh);
    return fresh;
  }
}

/** Persist the full state. Logs and continues on quota / privacy errors. */
export function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('SquadScore: failed to persist state.', err);
  }
}

/** Wipe everything. Useful for dev / debugging via the browser console. */
export function clearState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (err) {
    console.error('SquadScore: failed to clear state.', err);
  }
}