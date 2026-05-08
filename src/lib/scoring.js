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

// ----- Rotation math --------------------------------------------------------

// Given a starting post and round-station (1-5), where is that shooter physically?
export function physicalPostOf(startingPost, roundStation) {
  return ((startingPost - 1 + roundStation - 1) % 5) + 1;
}

// Given a physical post and round-station, what starting post would have placed
// a shooter there? Inverse of physicalPostOf.
export function startingPostAt(physicalPost, roundStation) {
  return (((physicalPost - roundStation) % 5) + 5) % 5 + 1;
}

// ----- Firing order ---------------------------------------------------------

// Generate the full chronological plan of shot slots for a round, accounting
// for any "left the line" markers. Each entry describes one slot:
//   { shooterIdx, roundStation, physicalPost, personalStationShot, personalShotIdx }
// personalStationShot is 0-indexed within a station (0..4).
// personalShotIdx is 0-indexed across the shooter's whole round.
export function firingOrder(round) {
  const plan = [];
  const personalShotsPlanned = round.shooters.map(() => 0);

  for (let roundStation = 1; roundStation <= 5; roundStation++) {
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let physicalPost = 1; physicalPost <= 5; physicalPost++) {
        const startingPost = startingPostAt(physicalPost, roundStation);
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
          roundStation,
          physicalPost,
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

// Round-station the squad is currently at. Defaults to 5 if the round is
// complete (the squad finishes at station 5).
export function currentRoundStation(round) {
  const slot = activeSlot(round);
  return slot ? slot.roundStation : 5;
}

// Physical-post layout of the squad at a given round-station. Returns an array
// of length 5 indexed by physicalPost-1; each entry is a shooterIdx or null
// (null means no shooter has rotated into that post — possible when the squad
// has fewer than 5 shooters).
export function squadByPhysicalPost(round, roundStation = null) {
  const rs = roundStation ?? currentRoundStation(round);
  const layout = [null, null, null, null, null];
  for (let i = 0; i < round.shooters.length; i++) {
    const post = physicalPostOf(round.shooters[i].startingPost, rs);
    layout[post - 1] = i;
  }
  return layout;
}