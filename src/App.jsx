// src/App.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { IconChevronLeft, IconCheck, IconX, IconDots } from '@tabler/icons-react';
import SetupScreen from './components/SetupScreen';
import SquadStrip from './components/SquadStrip';
import ActiveShooterCard from './components/ActiveShooterCard';
import FlashOverlay from './components/FlashOverlay';
import { getRoster } from './lib/roster';
import { activeSlot, isRoundComplete } from './lib/scoring';
import { appendShot } from './lib/roundStore';

function LiveScoringScreen({ round: initialRound, onBack }) {
  const [round, setRound] = useState(initialRound);
  const [flashType, setFlashType] = useState(null); // 'hit' | 'miss' | null
  const [flashFading, setFlashFading] = useState(false);
  const flashTimers = useRef([]);

  const roster = useMemo(() => getRoster(), []);
  const rosterById = useMemo(() => {
    const map = {};
    for (const entry of roster) map[entry.id] = entry;
    return map;
  }, [roster]);

  const slot = activeSlot(round);
  const complete = isRoundComplete(round);

  const activeShooter = slot ? round.shooters[slot.shooterIdx] : null;
  const activeRosterEntry = activeShooter ? rosterById[activeShooter.rosterId] : null;

  // Cleanup pending flash timers on unmount
  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleShoot(hit) {
    if (flashType !== null || complete) return;

    // Persist the shot first; flash plays over the new state
    const updated = appendShot(round.id, hit);
    setRound(updated);

    setFlashType(hit ? 'hit' : 'miss');
    setFlashFading(false);

    const t1 = setTimeout(() => setFlashFading(true), 1000);
    const t2 = setTimeout(() => {
      setFlashType(null);
      setFlashFading(false);
    }, 1130);

    flashTimers.current.push(t1, t2);
  }

  const buttonsDisabled = flashType !== null || complete;

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--color-background-primary)]">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-3"
        style={{ borderBottom: '0.5px solid var(--color-text-tertiary)' }}
      >
        <button
          onClick={onBack}
          className="p-2 -ml-2"
          aria-label="Save and exit"
        >
          <IconChevronLeft size={22} stroke={1.75} />
        </button>
        <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">
          {complete ? 'Round complete' : 'Round in progress'}
        </div>
        {/* Placeholder for stage 3 item 6 (3-dot menu); spacer for symmetry */}
        <div className="p-2 -mr-2 opacity-0 pointer-events-none">
          <IconDots size={22} stroke={1.75} />
        </div>
      </div>

      {/* Squad strip */}
      <div className="px-[18px] pt-3">
        <SquadStrip
          round={round}
          activeShooterIdx={slot?.shooterIdx ?? null}
          rosterById={rosterById}
        />
      </div>

      {/* Active card or round-complete message */}
      {slot ? (
        <ActiveShooterCard
          round={round}
          slot={slot}
          rosterEntry={activeRosterEntry}
        />
      ) : (
        <div className="px-[18px] pt-10 pb-4 text-center">
          <div className="text-[24px] font-medium text-[var(--color-text-primary)]">
            Round complete
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-2">
            {round.shots.length} shots scored. End-of-round screens coming next.
          </div>
        </div>
      )}

      {/* Flex spacer pushes buttons to bottom */}
      <div className="flex-1" />

      {/* Hit / Miss action row */}
      {!complete && (
        <div
          className="px-[18px] grid grid-cols-2 gap-3"
          style={{
            paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
            paddingTop: '12px',
          }}
        >
          <button
            onClick={() => handleShoot(false)}
            disabled={buttonsDisabled}
            className="flex flex-col items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{
              height: '130px',
              background: '#FBEAEA',
              color: 'var(--color-text-danger)',
              borderRadius: 'var(--border-radius-lg)',
            }}
          >
            <IconX size={34} stroke={2.5} />
            <span className="text-[22px] font-medium leading-none">Miss</span>
          </button>
          <button
            onClick={() => handleShoot(true)}
            disabled={buttonsDisabled}
            className="flex flex-col items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{
              height: '130px',
              background: 'var(--color-varsity-green-bg)',
              color: 'var(--color-varsity-green)',
              borderRadius: 'var(--border-radius-lg)',
            }}
          >
            <IconCheck size={34} stroke={2.5} />
            <span className="text-[22px] font-medium leading-none">Hit</span>
          </button>
        </div>
      )}

      {/* Flash overlay (full viewport) */}
      <FlashOverlay type={flashType} fading={flashFading} />
    </div>
  );
}

export default function App() {
  const [round, setRound] = useState(null);

  if (round) {
    return (
      <LiveScoringScreen
        key={round.id}
        round={round}
        onBack={() => setRound(null)}
      />
    );
  }
  return <SetupScreen onStart={setRound} />;
}