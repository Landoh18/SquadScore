import { IconStar, IconPencil } from '@tabler/icons-react';
import { shooterScore } from '../lib/scoring';

// Local helpers. Will get extracted to scoring.js when paste 3 (per-shooter
// screens) needs to reuse them — keeping them local for now to keep this paste
// small.

function shootersByStartingPost(round) {
  return round.shooters
    .map((shooter, idx) => ({ shooter, idx }))
    .sort((a, b) => a.shooter.startingPost - b.shooter.startingPost);
}

function leaveContext(round, shooterIdx) {
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

function formatDate(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export default function OverviewScreen({ round, rosterById }) {
  const sorted = shootersByStartingPost(round);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-12">
      {/* Header */}
      <div className="mb-4">
        <div
          className="text-[22px] font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Results overview
        </div>
        <div
          className="text-[12px] mt-1"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {formatDate(round.date)}
        </div>
      </div>

      {/* Shooter rows */}
      <div className="flex flex-col gap-2">
        {sorted.map(({ shooter, idx }) => {
          const { hits, total } = shooterScore(round, idx);
          const leave = leaveContext(round, idx);
          const isLeft = leave !== null;
          const isPerfect = !isLeft && hits === 25;
          const isVarsity = !isLeft && hits >= 19 && total === 25;
          const firstName = rosterById[shooter.rosterId]?.firstName ?? '?';

          const scoreText = isLeft ? `${hits}/${total}` : `${hits}/25`;

          const rowStyle = isVarsity
            ? {
                background: 'var(--color-varsity-green-bg, #EAF3DE)',
                border: '2px solid var(--color-varsity-green, #639922)',
              }
            : {
                background: 'var(--color-background-secondary)',
                border: '0.5px solid var(--color-text-tertiary)',
              };

          const badgeStyle = isVarsity
            ? {
                border: '1px solid var(--color-varsity-green, #639922)',
                color: 'var(--color-varsity-green, #639922)',
              }
            : {
                border: '0.5px solid var(--color-text-secondary)',
                color: 'var(--color-text-primary)',
              };

          const scoreColor = isVarsity
            ? 'var(--color-varsity-green, #639922)'
            : 'var(--color-text-primary)';

          let leaveSubline = null;
          if (leave?.kind === 'clean') {
            leaveSubline = `left after station ${leave.stationsCompleted} of 5`;
          } else if (leave?.kind === 'mid-station') {
            leaveSubline = `left during station ${leave.station} after ${leave.shotsTaken} shot${
              leave.shotsTaken === 1 ? '' : 's'
            }`;
          }

          return (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-md"
              style={{ ...rowStyle, padding: '10px 12px' }}
            >
              {/* Post badge */}
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 26,
                  height: 26,
                  fontSize: 12,
                  fontWeight: 500,
                  ...badgeStyle,
                }}
              >
                {shooter.startingPost}
              </div>

              {/* Name + optional leave subline */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[15px] font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {firstName}
                </div>
                {leaveSubline && (
                  <div
                    className="text-[12px] mt-0.5"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {leaveSubline}
                  </div>
                )}
              </div>

              {/* Score (with optional star for perfect rounds) */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isPerfect && (
                  <IconStar size={16} fill="#854F0B" color="#854F0B" />
                )}
                <div
                  className="text-[15px] font-medium tabular-nums"
                  style={{ color: scoreColor }}
                >
                  {scoreText}
                </div>
              </div>

              {/* Edit pencil — non-interactive, wired in paste 6 */}
              <div className="flex-shrink-0 opacity-60">
                <IconPencil size={18} color="var(--color-text-tertiary)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}