// src/App.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  IconChevronLeft,
  IconCheck,
  IconX,
  IconDots,
  IconPencil,
  IconLogout2,
  IconTrash,
} from '@tabler/icons-react';
import SetupScreen from './components/SetupScreen';
import SquadStrip from './components/SquadStrip';
import ActiveShooterCard from './components/ActiveShooterCard';
import FlashOverlay from './components/FlashOverlay';
import BottomSheet from './components/BottomSheet';
import EditNameModal from './components/EditNameModal';
import LeaveTheLineModal from './components/LeaveTheLineModal';
import DeleteRoundModal from './components/DeleteRoundModal';
import EndOfRound from './components/EndOfRound';
import { getRoster } from './lib/roster';
import {
  activeSlot,
  slotForShot,
  isRoundComplete,
  shooterScore,
} from './lib/scoring';
import {
  appendShot,
  editShot,
  renameShooter,
  markShooterLeft,
  deleteRound,
} from './lib/roundStore';

function LiveScoringScreen({ round: initialRound, onBack, onDelete, onComplete }) {
  const [round, setRound] = useState(initialRound);
  const [cursorIdx, setCursorIdx] = useState(null);
  const [flashType, setFlashType] = useState(null);
  const [flashFading, setFlashFading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rosterVersion, setRosterVersion] = useState(0);
  const flashTimers = useRef([]);

  const roster = useMemo(() => getRoster(), [rosterVersion]);
  const rosterById = useMemo(() => {
    const map = {};
    for (const entry of roster) map[entry.id] = entry;
    return map;
  }, [roster]);

  const liveSlot = activeSlot(round);
  const complete = isRoundComplete(round);
  const inReviewMode = cursorIdx !== null;

  const displaySlot = inReviewMode ? slotForShot(round, cursorIdx) : liveSlot;
  const displayShooter = displaySlot ? round.shooters[displaySlot.shooterIdx] : null;
  const displayRosterEntry = displayShooter ? rosterById[displayShooter.rosterId] : null;

  const liveShooter = liveSlot ? round.shooters[liveSlot.shooterIdx] : null;
  const liveRosterEntry = liveShooter ? rosterById[liveShooter.rosterId] : null;
  const liveScore = liveSlot ? shooterScore(round, liveSlot.shooterIdx) : null;

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
      const updated = editShot(round.id, cursorIdx, hit);
      setRound(updated);
      setCursorIdx(null);
      playFlash(hit);
    } else {
      const updated = appendShot(round.id, hit);
      setRound(updated);
      playFlash(hit);
      if (isRoundComplete(updated)) {
        // Wait for flash to finish, then transition to end-of-round.
        const t = setTimeout(() => onComplete(updated), 1130);
        flashTimers.current.push(t);
      }
    }
  }

  function handlePrev() {
    if (flashType !== null) return;
    if (cursorIdx === null) {
      if (round.shots.length === 0) return;
      setCursorIdx(round.shots.length - 1);
    } else if (cursorIdx > 0) {
      setCursorIdx(cursorIdx - 1);
    }
  }

  function handleNext() {
    if (flashType !== null) return;
    if (cursorIdx === null) return;
    if (cursorIdx >= round.shots.length - 1) {
      setCursorIdx(null);
    } else {
      setCursorIdx(cursorIdx + 1);
    }
  }

  function handleEditName() {
    setSheetOpen(false);
    setEditNameOpen(true);
  }

  function handleEditNameSave(newName) {
    if (!liveShooter) return;
    renameShooter(round.id, liveSlot.shooterIdx, newName);
    setEditNameOpen(false);
    setRosterVersion((v) => v + 1);
  }

  function handleLeaveTheLine() {
    setSheetOpen(false);
    setLeaveOpen(true);
  }

  function handleLeaveConfirm() {
    if (!liveSlot) return;
    const updated = markShooterLeft(round.id, liveSlot.shooterIdx);
    setRound(updated);
    setLeaveOpen(false);
    setCursorIdx(null);
    if (isRoundComplete(updated)) {
      // Edge case: leaving the line completes the round (last remaining
      // shooter leaves). No flash to wait on, transition immediately.
      onComplete(updated);
    }
  }

  function handleDeleteRound() {
    setSheetOpen(false);
    setDeleteOpen(true);
  }

  function handleDeleteConfirm() {
    deleteRound(round.id);
    setDeleteOpen(false);
    onDelete();
  }

  const menuItems = [
    {
      label: 'Edit shooter name',
      icon: IconPencil,
      onClick: handleEditName,
    },
    {
      label: 'Shooter left the line',
      icon: IconLogout2,
      onClick: handleLeaveTheLine,
    },
    {
      label: 'Delete round',
      icon: IconTrash,
      onClick: handleDeleteRound,
      danger: true,
    },
  ];

  const buttonsDisabled = flashType !== null || complete;
  const prevDisabled =
    flashType !== null ||
    cursorIdx === 0 ||
    (cursorIdx === null && round.shots.length === 0);
  const nextDisabled = flashType !== null || cursorIdx === null;

  return (
    <div
      className="min-h-screen flex flex-col relative bg-[var(--color-background-primary)]"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
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
        <button
          onClick={() => setSheetOpen(true)}
          className="p-2 -mr-2"
          aria-label="More options"
        >
          <IconDots size={22} stroke={1.75} />
        </button>
      </div>

      <div className="px-[14px] pt-3">
        <SquadStrip
          round={round}
          activeShooterIdx={displaySlot?.shooterIdx ?? null}
          rosterById={rosterById}
        />
      </div>

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
            {round.shots.length} shots scored.
          </div>
        </div>
      )}

      {displaySlot && (
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
                  inReviewMode && recordedAtCursor === false
                    ? 'inset 0 0 0 3px var(--color-text-danger)'
                    : 'none',