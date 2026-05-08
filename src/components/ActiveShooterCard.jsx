// src/components/ActiveShooterCard.jsx
import { IconFlame } from '@tabler/icons-react';
import {
  shooterShots,
  shooterScore,
  currentStreak,
} from '../lib/scoring';

export default function ActiveShooterCard({
  round,
  slot,
  rosterEntry,
  inReviewMode = false,
}) {
  if (!slot) return null;

  const { shooterIdx, roundStation, personalStationShot, personalShotIdx } = slot;
  const allShots = shooterShots(round, shooterIdx);
  const { hits, total } = shooterScore(round, shooterIdx);
  const streak = currentStreak(allShots);

  // Which dots in the current station have been shot already?
  const personalStation = Math.floor(personalShotIdx / 5) + 1;
  const stationStart = (personalStation - 1) * 5;
  const stationShotsTaken = allShots.slice(stationStart, stationStart + 5);

  const firstName = rosterEntry?.firstName ?? 'Unknown';

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
            {hits}/{total}
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
          const isCursor = i === stationShotsTaken.length;

          if (taken) {
            const hit = stationShotsTaken[i].hit;
            return (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  background: hit
                    ? 'var(--color-text-success)'
                    : 'var(--color-text-danger)',
                }}
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