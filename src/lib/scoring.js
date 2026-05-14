// src/lib/scoring.js
//
// Pure logic for live scoring: rotation math, firing order, streaks, per-shooter
// queries. Operates on the round shape from handoff #2:
//
//   round = {
//     id, date, scorerId, tag, notes,
//     shooters: [{ rosterId, startingPost, leftAfterShot? }],
//     shots: [{ shooterIdx, hit }]   // chronological
//   }
//
// shooterIdx in shots is the index into shooters[].
// leftAfterShot is the count of THAT shooter's own shots taken when they left.
//
// Vocabulary:
//   station       — a fixed physical location (1-5, left to right). Stations don't move.
//   round         — five shots taken by one squad at one station. After each round,
//                   the squad rotates one position.
//   round number  — which round of the session we're on (1-5). The squad visits all
//                   5 stations across a session.
//   session       — five rounds. One full play-through = 25 shots per shooter.
//   starting post — the station number a shooter begins their session at.

// ----- Rotation math --------------------------------------------------------

// Given a starting post and round number (1-5), where is that shooter physically?
export function physicalPostOf(startingPost, roundNumber) {
  return ((startingPost - 1 + roundNumber - 1) % 5) + 1;
}

// Given a physical post and round number, what starting post would have placed
// a shooter there? Inverse of physicalPostOf.
export function startingPostAt(physicalPost, roundNumber) {
  return (((physicalPost - roundNumber) % 5) + 5) % 5 + 1;
}

// ----- Firing order ---------------------------------------------------------

// Generate the full chronological plan of shot slots for a round, accounting
// for any "left the line" markers. Each entry describes one slot:
//   { shooterIdx, roundNumber, physicalPost, personalStationShot, personalShotIdx }
// personalStationShot is 0-indexed within a station (0..4).
// personalShotIdx is 0-indexed across the shooter's whole session.
//
// Across the full session, firing order is always S1, S2, S3, S4, S5 cycling.
// Round boundaries (squad rotations) don't change the lead — S1 starts every
// round. If a shooter has left the line, they're skipped at the right point
// in the sequence and the order continues with the next starting-post number.
export function firingOrder(round) {
  const plan = [];
  const personalShotsPlanned = round.shooters.map(() => 0);

  for (let roundNumber = 1; roundNumber <= 5; roundNumber++) {
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let startingPost = 1; startingPost <= 5; startingPost++) {
        const shooterIdx = round.shooters.findIndex(
          (s) => s.startingPost === startingPost
        );
        if (shooterIdx === -1) continue;

        const shooter = round.shooters[shooterIdx];
        const planned = personalShotsPlanned[shooterIdx];

        if (
          shooter.leftAfterShot != null &&
          planned >= shooter.leftAfterShot
        ) {
          continue;
        }

        plan.push({
          shooterIdx,
          roundNumber,
          physicalPost: physicalPostOf(startingPost, roundNumber),
          personalStationShot: cycle,
          personalShotIdx: planned,
        });
        personalShotsPlanned[shooterIdx]++;
      }
    }
  }

  return plan;
}

// The next shot to be taken, or null if the round is complete.
export function activeSlot(round) {
  return firingOrder(round)[round.shots.length] ?? null;
}

// The slot for any shot index (existing or future). Returns null if past end.
export function slotForShot(round, shotIdx) {
  return firingOrder(round)[shotIdx] ?? null;
}

export function isRoundComplete(round) {
  return round.shots.length >= firingOrder(round).length;
}

// ----- Per-shooter queries --------------------------------------------------

// That shooter's chronological shot list (each entry { shooterIdx, hit }).
export function shooterShots(round, shooterIdx) {
  return round.shots.filter((s) => s.shooterIdx === shooterIdx);
}

// { hits, total } for a shooter.
export function shooterScore(round, shooterIdx) {
  const shots = shooterShots(round, shooterIdx);
  let hits = 0;
  for (const s of shots) if (s.hit) hits++;
  return { hits, total: shots.length };
}

// ----- Streaks --------------------------------------------------------------
//
// Single pass through the chronological shot list. Don't reset at station
// boundaries — that's the footgun called out in handoff #1.

export function longestStreak(shots) {
  let max = 0;
  let current = 0;
  for (const s of shots) {
    if (s.hit) {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

// Active streak counted from the latest shot backwards (for the "N in a row" chip).
export function currentStreak(shots) {
  let count = 0;
  for (let i = shots.length - 1; i >= 0; i--) {
    if (shots[i].hit) count++;
    else break;
  }
  return count;
}

// ----- Squad-strip helpers --------------------------------------------------

// Round number the squad is currently on. Defaults to 5 if the round is
// complete (the squad finishes at round 5, station 5).
export function currentRoundNumber(round) {
  const slot = activeSlot(round);
  return slot ? slot.roundNumber : 5;
}

// Physical-post layout of the squad at a given round number. Returns an array
// of length 5 indexed by physicalPost-1; each entry is a shooterIdx or null
// (null means no shooter has rotated into that post — possible when the squad
// has fewer than 5 shooters).
export function squadByPhysicalPost(round, roundNumber = null) {
  const rn = roundNumber ?? currentRoundNumber(round);
  const layout = [null, null, null, null, null];
  for (let i = 0; i < round.shooters.length; i++) {
    const post = physicalPostOf(round.shooters[i].startingPost, rn);
    layout[post - 1] = i;
  }
  return layout;
}

// ----- End-of-round helpers -------------------------------------------------

// Shooters sorted by their starting post (ascending). Returns an array of
// { shooter, idx } where idx is the original index into round.shooters.
// Used by the Overview and per-shooter screens, and by the PDF.
export function shootersByStartingPost(round) {
  return round.shooters
    .map((shooter, idx) => ({ shooter, idx }))
    .sort((a, b) => a.shooter.startingPost - b.shooter.startingPost);
}

// Returns the "left the line" context for a shooter, or null if they finished.
// Two cases:
//   { kind: 'clean', stationsCompleted }       — left between stations
//   { kind: 'mid-station', station, shotsTaken } — left during a station
// `station` is the shooter's chronological station number (1..5) where they left,
// matching what their per-shooter view shows (not the physical station number).
export function leaveContext(round, shooterIdx) {
  const shooter = round.shooters[shooterIdx];
  if (shooter.leftAfterShot == null) return null;
  const n = shooter.leftAfterShot;
  if (n % 5 === 0) {
    return { kind: 'clean', stationsCompleted: n / 5 };
  }
  return {
    kind: 'mid-station',
    station: Math.floor(n / 5) + 1,
    shotsTaken: n % 5,
  };
}