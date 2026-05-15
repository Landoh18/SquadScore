// src/components/HomeScreen.jsx
//
// The app's entry surface. Brand row, big "New round" CTA, recent rounds list,
// and a "See all rounds →" link to the full history view.
//
// Ordering rule: unfinished rounds first (newest among unfinished), then
// completed rounds (newest among completed). Position itself signals state.
//
// Empty state: when there's no round history, the recent-rounds section and
// the "See all rounds →" link hide entirely. Just the brand row + hero CTA.
// Per handoff #1's settled design.

import { useMemo } from 'react';
import { IconPlus, IconChevronRight, IconStar } from '@tabler/icons-react';
import { getRounds } from '../lib/roundStore';
import {
  isRoundComplete,
  shootersByStartingPost,
  shooterScore,
} from '../lib/scoring';

const MAX_RECENT = 5;

// Per handoff #1's date format rule:
//   "Today"               for today's date
//   "Tue, May 5, 2026"    for everything else
function formatRoundDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortForDisplay(rounds) {
  const sorted = [...rounds];
  sorted.sort((a, b) => {
    const aComplete = isRoundComplete(a);
    const bComplete = isRoundComplete(b);
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    return b.date.localeCompare(a.date);
  });
  return sorted;
}

export default function HomeScreen({ rosterById, onNewRound, onOpenRound, onSeeAllRounds }) {
  const recent = useMemo(() => {
    const all = sortForDisplay(getRounds());
    return all.slice(0, MAX_RECENT);
  }, []);

  const hasHistory = recent.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-background-primary)',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      {/* Brand row */}
      <div className="text-center mt-2 mb-5">
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
          }}
        >
          SquadScore
        </div>
      </div>

      {/* Hero CTA */}
      <button
        onClick={onNewRound}
        className="w-full flex items-center justify-center gap-2"
        style={{
          height: 68,
          background: 'var(--color-clay-orange)',
          color: 'white',
          borderRadius: 'var(--border-radius-lg)',
          fontSize: 17,
          fontWeight: 500,
          border: 'none',
        }}
      >
        <IconPlus size={22} stroke={2.25} />
        <span>New round</span>
      </button>

      {/* Recent rounds (hidden in empty state) */}
      {hasHistory && (
        <>
          <div
            className="mt-7 mb-2"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }}
          >
            Recent rounds
          </div>

          <div className="flex flex-col gap-2">
            {recent.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                rosterById={rosterById}
                onClick={() => onOpenRound(round)}
              />
            ))}
          </div>

          <button
            onClick={onSeeAllRounds}
            className="mt-4 mx-auto"
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
            }}
          >
            See all rounds →
          </button>
        </>
      )}
    </div>
  );
}

function RoundCard({ round, rosterById, onClick }) {
  const complete = isRoundComplete(round);
  const scorer = rosterById[round.scorerId];
  const scorerName = scorer ? scorer.firstName : 'Unknown';

  const sortedShooters = shootersByStartingPost(round);
  const shooterNames = sortedShooters.map(({ shooter, idx }) => {
    const entry = rosterById[shooter.rosterId];
    const firstName = entry ? entry.firstName : '?';
    const { hits, total } = shooterScore(round, idx);
    const isPerfect = complete && hits === 25 && total === 25;
    return { firstName, isPerfect };
  });

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center text-left"
      style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-md)',
        border: 'none',
        padding: '12px 14px',
        gap: 8,
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginBottom: 4,
          }}
        >
          {formatRoundDate(round.date)} · {formatTime(round.date)} · scored by {scorerName}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: 13,
            color: 'var(--color-text-primary)',
          }}
        >
          {shooterNames.map((s, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {s.isPerfect && (
                <IconStar
                  size={13}
                  fill="#854F0B"
                  color="#854F0B"
                  style={{ display: 'inline', verticalAlign: '-2px', marginRight: 2 }}
                />
              )}
              {s.firstName}
            </span>
          ))}
        </div>
      </div>
      <IconChevronRight
        size={18}
        color="var(--color-text-tertiary)"
        style={{ flexShrink: 0 }}
      />
    </button>
  );
}