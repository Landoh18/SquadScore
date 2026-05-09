// src/components/ActiveShooterCard.jsx
import { IconFlame } from '@tabler/icons-react';
import {
  shooterShots,
  shooterScore,
  currentStreak,
} from '../lib/scoring';

export default function ActiveShooterCard({
  round,
  slot,             // the slot to display (cursor slot in review, active slot when live)
  rosterEntry,
  inReviewMode = false,
  cursorShotIdx = null,  // chronological idx being reviewed; null when live
}) {
  if (!slot) return null;

  const { shooterIdx, roundStation, personalStationShot, personalShotIdx } = slot;
  const allShots = shooterShots(round, shooterIdx);

  // Score: cursor-time in review (only counting up to and including the cursor shot for this shooter),
  // live otherwise.
  let displayHits, displayTotal;
  if (inReviewMode && cursorShotIdx !== null) {
    let hits = 0, total = 0;
    for (let i = 0; i <= cursorShotIdx && i < round.shots.length; i++) {
      if (round.shots[i].shooterIdx === shooterIdx) {
        total += 1;
        if (round.shots[i].hit) hits += 1;
      }
    }
    displayHits = hits;
    displayTotal = total;
  } else {
    const score = shooterScore(round, shooterIdx);
    displayHits = score.hits;
    displayTotal = score.total;
  }

  const streak = currentStreak(allShots);
  const firstName = rosterEntry?.firstName ?? 'Unknown';

  // Which dots in the current station have been shot already?
  const personalStation = Math.floor(personalShotIdx / 5) + 1;
  const stationStart = (personalStation - 1) * 5;
  const stationShotsTaken = allShots.slice(stationStart, stationStart + 5);

  return (
    <div className="px-[18px] pt-5 pb-2">
      <div className="text-[12px] text-[var(--color-text-tertiary)] mb-1">
        Station {roundStation} · shot {personalStationShot} of 5
      </div>
      <div
        className="text-[38px] leading-[1.05] font-medium text-[var(--color-text-primary)]"
        style={{ letterSpacing: '-0.01em' }}
      >
        {firstName}
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <div className="text-[14px] text-[var(--color-text-secondary)]">
          <span className="text-[17px] text-[var(--color-text-primary)] font-medium">
            {displayHits}/{displayTotal}
          </span>
          <span className="ml-1">so far</span>
        </div>

        {streak >= 2 && !inReviewMode && (
          <div
            className="inline-flex items-center gap-[5px] px-2 py-[3px] rounded-full text-[12px] font-medium"
            style={{
              background: 'var(--color-amber-bg)',
              color: 'var(--color-amber-text)',
            }}
          >
            <IconFlame size={13} stroke={2} />
            <span>{streak} in a row</span>
          </div>
        )}
      </div>

      {/* 5 station-progress dots */}
      <div className="mt-4 flex items-center gap-[10px]">
        {[0, 1, 2, 3, 4].map((i) => {
          const taken = i < stationShotsTaken.length;
          const isCursor = inReviewMode
            ? i === personalShotIdx % 5
            : i === stationShotsTaken.length;

          if (taken) {
            const hit = stationShotsTaken[i].hit;
            const fillColor = hit
              ? 'var(--color-text-success)'
              : 'var(--color-text-danger)';

            if (isCursor && inReviewMode) {
              return (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: fillColor,
                    outline: '2px solid var(--color-clay-orange)',
                    outlineOffset: '2px',
                  }}
                />
              );
            }

            return (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{ background: fillColor }}
              />
            );
          }

          if (isCursor) {
            return (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  border: `2px solid ${
                    inReviewMode
                      ? 'var(--color-clay-orange)'
                      : 'var(--color-text-primary)'
                  }`,
                  boxSizing: 'border-box',
                }}
              />
            );
          }

          return (
            <div
              key={i}
              className="w-4 h-4 rounded-full"
              style={{
                border: '1px solid var(--color-text-tertiary)',
                opacity: 0.4,
                boxSizing: 'border-box',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}