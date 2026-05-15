// src/components/StationEditor.jsx
//
// Station-scoped shot editor. Reached from PerShooterScreen's edit-mode landing
// when a station row is tapped. Like live scoring's active card, but:
//   - No squad strip (single shooter)
//   - Status text reads "Editing station N" in coral
//   - Prev/next only cycles within this station's 5 shots
//   - Hit/Miss commits the change to that specific shot, plays the flash,
//     then fires onCommit so the parent can open the "More changes?" modal
//
// Per handoff #1's "Station shot editor" section.

import { useState, useRef, useEffect } from 'react';
import {
  IconChevronLeft,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import {
  shooterShots,
  physicalPostOf,
  slotForShot,
} from '../lib/scoring';
import { editShot } from '../lib/roundStore';
import FlashOverlay from './FlashOverlay';

export default function StationEditor({
  round,
  shooterIdx,
  stationN,             // 1..5, the shooter's chronological station (not physical)
  rosterEntry,
  onBack,               // exit editor without committing
  onCommit,             // called after a successful Hit/Miss commit, after flash
}) {
  // The 5 chronological shot indices for this shooter's nth station.
  // We need the round-level shotIdx for each so editShot can target it.
  const shooterShotIndices = [];
  for (let i = 0; i < round.shots.length; i++) {
    if (round.shots[i].shooterIdx === shooterIdx) {
      shooterShotIndices.push(i);
    }
  }
  const stationStart = (stationN - 1) * 5;
  const stationShotRoundIndices = shooterShotIndices.slice(
    stationStart,
    stationStart + 5
  );
  // Personal shot indices (0..total-1 for this shooter) at this station.
  const stationPersonalIndices = [];
  for (let i = 0; i < stationShotRoundIndices.length; i++) {
    stationPersonalIndices.push(stationStart + i);
  }

  const totalAtStation = stationShotRoundIndices.length;

  const [cursor, setCursor] = useState(0); // 0..(totalAtStation-1)
  const [currentRound, setCurrentRound] = useState(round);
  const [flashType, setFlashType] = useState(null);
  const [flashFading, setFlashFading] = useState(false);
  const flashTimers = useRef([]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  if (totalAtStation === 0) {
    // Shouldn't happen — edit-mode tap rows are gated on "shots actually taken
    // at this station". Guard anyway.
    return (
      <div className="p-6 text-center text-[var(--color-text-secondary)]">
        No shots recorded at this station.
      </div>
    );
  }

  const currentShooterShots = shooterShots(currentRound, shooterIdx);
  const stationShotsTaken = currentShooterShots.slice(stationStart, stationStart + totalAtStation);
  const cursorShot = stationShotsTaken[cursor];
  const cursorRoundShotIdx = stationShotRoundIndices[cursor];

  const slot = slotForShot(currentRound, cursorRoundShotIdx);
  const physicalPost = slot
    ? slot.physicalPost
    : physicalPostOf(round.shooters[shooterIdx].startingPost, stationN);

  const stationHits = stationShotsTaken.filter((s) => s.hit).length;
  const firstName = rosterEntry?.firstName ?? '?';

  function playFlash(hit) {
    setFlashType(hit ? 'hit' : 'miss');
    setFlashFading(false);
    const t1 = setTimeout(() => setFlashFading(true), 1000);
    const t2 = setTimeout(() => {
      setFlashType(null);
      setFlashFading(false);
      onCommit();
    }, 1130);
    flashTimers.current.push(t1, t2);
  }

  function handleShoot(hit) {
    if (flashType !== null) return;
    const updated = editShot(currentRound.id, cursorRoundShotIdx, hit);
    setCurrentRound(updated);
    playFlash(hit);
  }

  function handlePrev() {
    if (flashType !== null) return;
    if (cursor > 0) setCursor(cursor - 1);
  }

  function handleNext() {
    if (flashType !== null) return;
    if (cursor < totalAtStation - 1) setCursor(cursor + 1);
  }

  const recordedHit = cursorShot?.hit;
  const prevDisabled = flashType !== null || cursor === 0;
  const nextDisabled = flashType !== null || cursor >= totalAtStation - 1;
  const buttonsDisabled = flashType !== null;

  const nameSize = 'clamp(38px, 13vw, 60px)';
  const stationHeaderSize = 'clamp(11px, 3.4vw, 14px)';
  const totalSize = 'clamp(12px, 3.6vw, 15px)';
  const dotSize = 'clamp(20px, 7vw, 32px)';

  return (
    <div
      className="flex flex-col relative bg-[var(--color-background-primary)]"
      style={{
        height: '100vh',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: '0.5px solid var(--color-text-tertiary)',
          flexShrink: 0,
        }}
      >
        <button onClick={onBack} className="p-2 -ml-2" aria-label="Back">
          <IconChevronLeft size={22} stroke={1.75} />
        </button>
        <div
          className="text-[13px] font-medium"
          style={{ color: 'var(--color-clay-orange)' }}
        >
          Editing station {physicalPost}
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* Active card */}
      <div
        className="mx-[14px] mt-3 mb-3"
        style={{
          border: '0.5px solid var(--color-text-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          background: 'var(--color-background-primary)',
          overflow: 'hidden',
        }}
      >
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
            Station {physicalPost} · shot {cursor + 1} of {totalAtStation}
          </div>

          <div
            className="flex items-center justify-around"
            style={{ marginTop: '14px' }}
          >
            {Array.from({ length: totalAtStation }).map((_, i) => {
              const shot = stationShotsTaken[i];
              const hit = shot.hit;
              const fillColor = hit
                ? 'var(--color-text-success)'
                : 'var(--color-text-danger)';
              const isCursor = i === cursor;
              return (
                <div
                  key={i}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: fillColor,
                    outline: isCursor ? '2px solid var(--color-clay-orange)' : 'none',
                    outlineOffset: isCursor ? '2px' : '0',
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
            Station score ·{' '}
            <span style={{ color: 'var(--color-text-primary)' }}>
              {stationHits}/{totalAtStation}
            </span>
          </div>
        </div>
      </div>

      {/* Action zone — Hit/Miss buttons + prev/next */}
      <div
        className="flex-1 flex flex-col px-[14px]"
        style={{
          gap: '10px',
          paddingBottom: '4px',
          maxHeight: '320px',
          minHeight: '184px',
        }}
      >
        <div className="grid grid-cols-2 gap-3" style={{ flex: 3 }}>
          <button
            onClick={() => handleShoot(false)}
            disabled={buttonsDisabled}
            className="flex flex-col items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{
              background: '#FBEAEA',
              color: 'var(--color-text-danger)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow:
                recordedHit === false
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
              background: 'var(--color-varsity-green-bg)',
              color: 'var(--color-varsity-green)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow:
                recordedHit === true
                  ? 'inset 0 0 0 3px var(--color-varsity-green)'
                  : 'none',
            }}
          >
            <IconCheck size={34} stroke={2.5} />
            <span className="text-[22px] font-medium leading-none">Hit</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3" style={{ flex: 1 }}>
          <button
            onClick={handlePrev}
            disabled={prevDisabled}
            className="flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
            style={{
              background: 'white',
              color: 'var(--color-text-primary)',
              border: '0.5px solid var(--color-text-tertiary)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <IconChevronLeft size={18} stroke={2} />
            <span className="text-[13px] font-medium">Previous shot</span>
          </button>
          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
            style={{
              background: 'white',
              color: 'var(--color-text-primary)',
              border: '0.5px solid var(--color-text-tertiary)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <span className="text-[13px] font-medium">Next shot</span>
            <IconChevronLeft
              size={18}
              stroke={2}
              style={{ transform: 'scaleX(-1)' }}
            />
          </button>
        </div>
      </div>

      <FlashOverlay type={flashType} fading={flashFading} />
    </div>
  );
}