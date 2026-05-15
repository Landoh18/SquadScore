// src/components/HistoryScreen.jsx
//
// The full rounds-history view. Reached from the "See all rounds →" link on
// the home screen.
//
// Layout: top bar (chevron-left back arrow + centered "All rounds" title) +
// chronological list of rounds grouped under date section headers.
//
// Ordering rule matches HomeScreen: unfinished rounds at the very top
// (newest first), then completed rounds (newest first) grouped under date
// section headers. Empty state hides everything below the top bar.

import { useMemo } from 'react';
import { IconChevronLeft, IconChevronRight, IconStar } from '@tabler/icons-react';
import { getRounds } from '../lib/roundStore';
import {
  isRoundComplete,
  shootersByStartingPost,
  shooterScore,
} from '../lib/scoring';

function dateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatSectionHeader(iso) {
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

export default function HistoryScreen({ rosterById, onBack, onOpenRound }) {
  const { unfinished, completedByDate } = useMemo(() => {
    const all = getRounds(); // already newest-first
    const unfinished = [];
    const completed = [];
    for (const r of all) {
      if (isRoundComplete(r)) completed.push(r);
      else unfinished.push(r);
    }

    // Group completed by date key in insertion order (already newest-first).
    const byDate = [];
    const seen = new Map();
    for (const r of completed) {
      const key = dateKey(r.date);
      if (!seen.has(key)) {
        const group = { key, headerIso: r.date, rounds: [] };
        seen.set(key, group);
        byDate.push(group);
      }
      seen.get(key).rounds.push(r);
    }

    return { unfinished, completedByDate: byDate };
  }, []);

  const hasAny = unfinished.length > 0 || completedByDate.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-background-primary)',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 pb-3"
        style={{ borderBottom: '0.5px solid var(--color-text-tertiary)' }}
      >
        <button onClick={onBack} className="p-2 -ml-2" aria-label="Back">
          <IconChevronLeft size={22} stroke={1.75} />
        </button>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          All rounds
        </div>
        {/* Right-side spacer to balance the back arrow */}
        <div style={{ width: 38 }} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 18px' }}>
        {!hasAny && null}

        {unfinished.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                padding: '18px 4px 8px',
              }}
            >
              In progress
            </div>
            <div className="flex flex-col gap-2">
              {unfinished.map((round) => (
                <RoundRow
                  key={round.id}
                  round={round}
                  rosterById={rosterById}
                  onClick={() => onOpenRound(round)}
                />
              ))}
            </div>
          </div>
        )}

        {completedByDate.map((group, gi) => (
          <div key={group.key}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                padding:
                  gi === 0 && unfinished.length === 0
                    ? '18px 4px 8px'
                    : '22px 4px 8px',
              }}
            >
              {formatSectionHeader(group.headerIso)}
            </div>
            <div className="flex flex-col gap-2">
              {group.rounds.map((round) => (
                <RoundRow
                  key={round.id}
                  round={round}
                  rosterById={rosterById}
                  onClick={() => onOpenRound(round)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundRow({ round, rosterById, onClick }) {
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
          {formatTime(round.date)} · scored by {scorerName}
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