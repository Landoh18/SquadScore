// src/lib/roundStore.js
//
// Wraps storage.js with round mutations. Stage-3 scoring components call into
// this; nothing here knows about React.
//
// Round shape (from handoff #2):
//   round = {
//     id, date, scorerId, tag, notes,
//     shooters: [{ rosterId, startingPost, leftAfterShot? }],
//     shots: [{ shooterIdx, hit }]
//   }

import { loadState, saveState } from "./storage.js";
import { firingOrder } from "./scoring.js";

// ----- Internal helpers -----------------------------------------------------

function generateRoundId() {
  return (
    "r" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function findRoundOrThrow(state, roundId) {
  const round = state.rounds.find((r) => r.id === roundId);
  if (!round) throw new Error(`Round not found: ${roundId}`);
  return round;
}

// ----- Reads ----------------------------------------------------------------

export function getRound(roundId) {
  const state = loadState();
  return state.rounds.find((r) => r.id === roundId) || null;
}

// All rounds, newest first.
export function getRounds() {
  const state = loadState();
  return [...state.rounds].sort((a, b) => b.date.localeCompare(a.date));
}

// ----- Mutations ------------------------------------------------------------

// Create a new round and persist it. Returns the created round (with id).
//
// shooters: [{ rosterId, startingPost }]
// scorerId: roster id of the scorer
// tag: 'practice' | 'league' | 'tournament' (defaults to 'practice')
// notes: free text (defaults to '')
export function startRound({
  scorerId,
  shooters,
  tag = "practice",
  notes = "",
}) {
  if (!scorerId) throw new Error("startRound: scorerId is required");
  if (!Array.isArray(shooters) || shooters.length === 0) {
    throw new Error("startRound: at least one shooter required");
  }

  const state = loadState();
  const round = {
    id: generateRoundId(),
    date: new Date().toISOString(),
    scorerId,
    tag,
    notes,
    shooters: shooters.map((s) => ({
      rosterId: s.rosterId,
      startingPost: s.startingPost,
    })),
    shots: [],
  };
  state.rounds.push(round);
  saveState(state);
  return round;
}

// Record the live shot. shooterIdx is derived from firing order's active slot,
// so callers just pass hit=true|false. Returns the updated round.
export function appendShot(roundId, hit) {
  const state = loadState();
  const round = findRoundOrThrow(state, roundId);

  const plan = firingOrder(round);
  const slot = plan[round.shots.length];
  if (!slot) throw new Error("Round is already complete");

  round.shots.push({ shooterIdx: slot.shooterIdx, hit: !!hit });
  saveState(state);
  return round;
}

// Replace the hit/miss value at a given chronological shot index. Used by both
// live-scoring review-mode commits and the end-of-round edit-shooter-score
// flow. Returns the updated round.
export function editShot(roundId, shotIdx, hit) {
  const state = loadState();
  const round = findRoundOrThrow(state, roundId);

  if (shotIdx < 0 || shotIdx >= round.shots.length) {
    throw new Error(`Shot index out of range: ${shotIdx}`);
  }

  round.shots[shotIdx] = { ...round.shots[shotIdx], hit: !!hit };
  saveState(state);
  return round;
}

// Mark a shooter as having left the line. Their leftAfterShot is set to the
// number of THEIR shots taken so far, so future slots in firing order are
// skipped. Returns the updated round.
export function markShooterLeft(roundId, shooterIdx) {
  const state = loadState();
  const round = findRoundOrThrow(state, roundId);

  const shooter = round.shooters[shooterIdx];
  if (!shooter) throw new Error(`Shooter not found: idx ${shooterIdx}`);
  if (shooter.leftAfterShot != null) {
    throw new Error("Shooter already marked as left");
  }

  const personalShotsTaken = round.shots.filter(
    (s) => s.shooterIdx === shooterIdx
  ).length;
  shooter.leftAfterShot = personalShotsTaken;
  saveState(state);
  return round;
}

// Rename a shooter by editing the underlying roster entry's firstName. Note:
// because all rounds reference the roster by stable id, this propagates the
// new name to every past and future round — matches the handoff #2 design
// where the roster entry IS the source of truth and the displayed name is
// just a label.
export function renameShooter(roundId, shooterIdx, newFirstName) {
  const trimmed = (newFirstName || "").trim();
  if (!trimmed) throw new Error("Name cannot be empty");

  const state = loadState();
  const round = findRoundOrThrow(state, roundId);

  const shooter = round.shooters[shooterIdx];
  if (!shooter) throw new Error(`Shooter not found: idx ${shooterIdx}`);

  const entry = state.roster.find((r) => r.id === shooter.rosterId);
  if (!entry) {
    throw new Error(`Roster entry not found: ${shooter.rosterId}`);
  }

  entry.firstName = trimmed;
  saveState(state);
  return round;
}

// Permanently delete a round. Returns true if removed, false if not found.
export function deleteRound(roundId) {
  const state = loadState();
  const idx = state.rounds.findIndex((r) => r.id === roundId);
  if (idx === -1) return false;
  state.rounds.splice(idx, 1);
  saveState(state);
  return true;
}