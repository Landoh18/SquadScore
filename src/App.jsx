// src/App.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { IconChevronLeft, IconCheck, IconX, IconDots } from '@tabler/icons-react';
import SetupScreen from './components/SetupScreen';
import SquadStrip from './components/SquadStrip';
import ActiveShooterCard from './components/ActiveShooterCard';
import FlashOverlay from './components/FlashOverlay';
import ReviewFooter from './components/ReviewFooter';
import { getRoster } from './lib/roster';
import { activeSlot, slotForShot, isRoundComplete } from './lib/scoring';
import { appendShot, editShot } from './lib/roundStore';

function LiveScoringScreen({ round: initialRound, onBack }) {
  const [round, setRound] = useState(initialRound);
  const [cursorIdx, setCursorIdx] = useState(null); // null = live; otherwise chronological shot idx being reviewed
  const [flashType, setFlashType] = useState(null);
  const [flashFading, setFlashFading] = useState(false);
  const flashTimers = useRef([]);

  const roster = useMemo(() => getRoster(), []);
  const rosterById = useMemo(() => {
    const map = {};
    for (const entry of roster) map[entry.id] = entry;
    return map;
  }, [roster]);

  const liveSlot = activeSlot(round);
  const complete = isRoundComplete(round);
  const inReviewMode = cursorIdx !== null;

  // Which slot to display: cursor's slot in review, live slot otherwise
  const displaySlot = inReviewMode ? slotForShot(round, cursorIdx) : liveSlot;
  const displayShooter = displaySlot ? round.shooters[displaySlot.shooterIdx] : null;
  const displayRosterEntry = displayShooter ? rosterById[displayShooter.rosterId] : null;

  // The recorded value at cursor (for inset ring on Hit/Miss buttons)
  const recordedAtCursor =
    inReviewMode && cursorIdx < round.shots.length
      ? round.shots[cursorIdx].hit
      : null;

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  function playFlash(hit) {
    setFlashType(hit ? 'hit' : 'miss');
    setFlashFading(false);
    const t1 = setTimeout(() => setFlashFading(true), 1000);
    const t2 = setTimeout(() => {
      setFlashType(null);
      setFlashFading(false);
    }, 1130);
    flashTimers.current.push(t1, t2);
  }

  function handleShoot(hit) {
    if (flashType !== null || complete) return;

    if (inReviewMode) {
      // Commit the edit at cursor and snap back to live
      const updated = editShot(round.id, cursorIdx, hit);
      setRound(updated);
      setCursorIdx(null);
      playFlash(hit);
    } else {
      // Append a new shot
      const updated = appendShot(round.id, hit);
      setRound(updated);
      playFlash(hit);
    }
  }

  function handlePrev() {
    if (flashType !== null) return;
    if (cursorIdx === null) {
      // Step back from live to last shot
      if (round.shots.length === 0) return;
      setCursorIdx(round.shots.length - 1);
    } else if (cursorIdx > 0) {
      setCursorIdx(cursorIdx - 1);
    }
  }

  function handleNext() {
    if (flashType !== null) return;
    if (cursorIdx === null) return; // already live
    if (cursorIdx >= round.shots.length - 1) {
      // Past the last shot = back to live
      setCursorIdx(null);
    } else {
      setCursorIdx(cursorIdx + 1);
    }
  }

  const buttonsDisabled = flashType !== null || complete;
  const prevDisabled = flashType !== null || (cursorIdx === 0) || (cursorIdx === null && round.shots.length === 0);
  const nextDisabled = flashType !== null || cursorIdx === null;

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--color-background-primary)]">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-3"
        style={{ borderBottom: '0.5px solid var(--color-text-tertiary)' }}
      >
        <button onClick={onBack} className="p-2 -ml-2" aria-label="Save and exit">
          <IconChevronLeft size={22} stroke={1.75} />
        </button>
        <div
          className="text-[13px] font-medium"
          style={{
            color: inReviewMode
              ? 'var(--color-clay-orange)'
              : 'var(--color-text-secondary)',
          }}
        >
          {complete
            ? 'Round complete'
            : inReviewMode
            ? 'Reviewing previous shot'
            : 'Round in progress'}
        </div>
        <div className="p-2 -mr-2 opacity-0 pointer-events-none">
          <IconDots size={22} stroke={1.75} />
        </div>
      </div>

      {/* Squad strip — always live */}
      <div className="px-[18px] pt-3">
        <SquadStrip
          round={round}
          activeShooterIdx={displaySlot?.shooterIdx ?? null}
          rosterById={rosterById}
        />
      </div>

      {/* Active card or round-complete message */}
      {displaySlot ? (
        <ActiveShooterCard
          round={round}
          slot={displaySlot}
          rosterEntry={displayRosterEntry}
          inReviewMode={inReviewMode}
          cursorShotIdx={cursorIdx}
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

      <div className="flex-1" />

      {/* Hit / Miss row — visible whenever there's a slot to act on */}
      {displaySlot && (
        <div
          className="px-[18px] grid grid-cols-2 gap-3"
          style={{ paddingTop: '12px' }}
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
              boxShadow:
                inReviewMode && recordedAtCursor === false
                  ? 'inset 0 0 0 3px var(--color-text-danger)'
                  : 'none',
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
              boxShadow:
                inReviewMode && recordedAtCursor === true
                  ? 'inset 0 0 0 3px var(--color-varsity-green)'
                  : 'none',
            }}
          >
            <IconCheck size={34} stroke={2.5} />
            <span className="text-[22px] font-medium leading-none">Hit</span>
          </button>
        </div>
      )}

      {/* Prev / Next footer */}
      <div style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <ReviewFooter
          onPrev={handlePrev}
          onNext={handleNext}
          prevDisabled={prevDisabled}
          nextDisabled={nextDisabled}
        />
      </div>

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