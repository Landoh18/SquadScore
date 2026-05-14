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
  cursorShotIdx = null,
}) {
  if (!slot) return null;

  const { shooterIdx, roundNumber, personalStationShot, personalShotIdx } = slot;
  const allShots = shooterShots(round, shooterIdx);

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
  const showStreak = streak >= 2 && !inReviewMode;
  const firstName = rosterEntry?.firstName ?? 'Unknown';

  const personalStation = Math.floor(personalShotIdx / 5) + 1;
  const stationStart = (personalStation - 1) * 5;
  const stationShotsTaken = allShots.slice(stationStart, stationStart + 5);

  const nameSize = 'clamp(38px, 13vw, 60px)';
  const stationHeaderSize = 'clamp(11px, 3.4vw, 14px)';
  const totalSize = 'clamp(12px, 3.6vw, 15px)';
  const dotSize = 'clamp(20px, 7vw, 32px)';
  const bannerSize = 'clamp(13px, 3.8vw, 16px)';

  const cardBorder = showStreak
    ? '2px solid var(--color-amber-text)'
    : '0.5px solid var(--color-text-tertiary)';

  return (
    <div
      className="mx-[14px] mt-3 mb-3"
      style={{
        border: cardBorder,
        borderRadius: 'var(--border-radius-lg)',
        background: 'var(--color-background-primary)',
        overflow: 'hidden',
      }}
    >
      {showStreak && (
        <div
          style={{
            background: 'var(--color-amber-bg)',
            color: 'var(--color-amber-text)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: bannerSize,
            fontWeight: 500,
            borderBottom: '2px solid var(--color-amber-text)',
          }}
        >
          <IconFlame size={15} stroke={2} />
          <span>{streak} in a row</span>
        </div>
      )}

      <div style={{ padding: '14px' }}>
        <div
          className="font-medium text-[var(--color-text-primary)]"
          style={{
            fontSize: nameSize,
            textAlign: 'center',
            letterSpacing: '-0.01em',
            lineHeight: 1.05,
          }}
        >
          {firstName}
        </div>

        <div
          className="text-[var(--color-text-tertiary)]"
          style={{
            fontSize: stationHeaderSize,
            textAlign: 'center',
            marginTop: '4px',
          }}
        >
          Station {roundNumber} · shot {personalStationShot + 1} of 5
        </div>

        <div
          className="flex items-center justify-around"
          style={{ marginTop: '14px' }}
        >
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
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
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
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: fillColor,
                  }}
                />
              );
            }

            if (isCursor) {
              return (
                <div
                  key={i}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
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
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  border: '1px solid var(--color-text-tertiary)',
                  opacity: 0.4,
                  boxSizing: 'border-box',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '14px',
            fontSize: totalSize,
            color: 'var(--color-text-tertiary)',
          }}
        >
          Running total ·{' '}
          <span style={{ color: 'var(--color-text-primary)' }}>
            {displayHits}/{displayTotal}
          </span>
        </div>
      </div>
    </div>
  );
}