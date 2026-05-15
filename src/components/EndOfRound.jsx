import { useState, useEffect, useRef } from 'react';
import { IconChevronLeft, IconChevronRight, IconDots, IconTrash } from '@tabler/icons-react';
import OverviewScreen from './OverviewScreen';
import PerShooterScreen from './PerShooterScreen';
import PdfPreviewScreen from './PdfPreviewScreen';
import StationEditor from './StationEditor';
import BottomSheet from './BottomSheet';
import DeleteRoundModal from './DeleteRoundModal';
import MoreChangesModal from './MoreChangesModal';
import { getRound } from '../lib/roundStore';

// Edit-flow phases:
//   null              — normal carousel view
//   'shooter'         — landed on a shooter's per-shooter page in edit mode
//                       (after tapping a pencil on Overview, or returning from
//                       "Edit more" in the More Changes modal)
//   'station'         — inside the StationEditor for a specific station
//   'moreChanges'     — the "More changes for [Name]?" modal is open (the
//                       station editor has committed and stepped back to the
//                       shooter view)
export default function EndOfRound({
  round: initialRound,
  rosterById,
  onBack,
  onDelete,
  onRunItBack,
}) {
  const SCREEN_COUNT = 2 + initialRound.shooters.length;
  const [screenIdx, setScreenIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Holds the latest round state so edits made in StationEditor surface in
  // the carousel screens without needing to navigate up to App.jsx.
  const [round, setRound] = useState(initialRound);

  // Edit-flow state
  const [editPhase, setEditPhase] = useState(null);
  const [editShooterIdx, setEditShooterIdx] = useState(null);
  const [editStationN, setEditStationN] = useState(null);
  const [moreChangesOpen, setMoreChangesOpen] = useState(false);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const sortedShooters = round.shooters
    .map((shooter, idx) => ({ shooter, idx }))
    .sort((a, b) => a.shooter.startingPost - b.shooter.startingPost);

  // Keyboard arrow support for desktop (carousel only; disabled in edit flow)
  useEffect(() => {
    const handleKey = (e) => {
      if (editPhase !== null) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const goPrev = () => setScreenIdx((i) => Math.max(0, i - 1));
  const goNext = () => setScreenIdx((i) => Math.min(SCREEN_COUNT - 1, i + 1));

  const onTouchStart = (e) => {
    if (editPhase !== null) return;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e) => {
    if (editPhase !== null) return;
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (editPhase !== null) return;
    if (touchStartX.current == null || touchEndX.current == null) return;
    const dx = touchEndX.current - touchStartX.current;
    const threshold = 50;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleDeleteTap = () => {
    setSheetOpen(false);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    onDelete();
  };

  const menuItems = [
    {
      label: 'Delete round',
      icon: IconTrash,
      onClick: handleDeleteTap,
      danger: true,
    },
  ];

  // ---- Edit flow handlers --------------------------------------------------

  function handleEditShooter(shooterIdx) {
    setEditShooterIdx(shooterIdx);
    setEditPhase('shooter');
  }

  function handleStationTap(stationN) {
    setEditStationN(stationN);
    setEditPhase('station');
  }

  function handleStationBack() {
    // Exit the station editor without committing — go back to the shooter
    // edit landing.
    setEditStationN(null);
    setEditPhase('shooter');
  }

  function handleStationCommit() {
    // The station editor finished an edit + flash. Pull the latest round
    // state from storage so the carousel reflects the change, then open the
    // "More changes?" modal.
    const fresh = getRound(round.id);
    if (fresh) setRound(fresh);
    setMoreChangesOpen(true);
  }

  function handleMoreChangesEditMore() {
    // Return to the shooter's per-shooter edit landing.
    setMoreChangesOpen(false);
    setEditStationN(null);
    setEditPhase('shooter');
  }

  function handleMoreChangesDone() {
    // Exit the edit flow entirely; return to the Overview screen.
    setMoreChangesOpen(false);
    setEditStationN(null);
    setEditShooterIdx(null);
    setEditPhase(null);
    setScreenIdx(0);
  }

  // ---- Render --------------------------------------------------------------

  // Station editor is a full-screen takeover.
  if (editPhase === 'station' && editShooterIdx !== null && editStationN !== null) {
    const shooter = round.shooters[editShooterIdx];
    return (
      <>
        <StationEditor
          round={round}
          shooterIdx={editShooterIdx}
          stationN={editStationN}
          rosterEntry={rosterById[shooter.rosterId]}
          onBack={handleStationBack}
          onCommit={handleStationCommit}
        />
        <MoreChangesModal
          open={moreChangesOpen}
          onClose={() => setMoreChangesOpen(false)}
          name={rosterById[shooter.rosterId]?.firstName}
          onEditMore={handleMoreChangesEditMore}
          onDone={handleMoreChangesDone}
        />
      </>
    );
  }

  const renderScreen = () => {
    // Edit-mode shooter landing: same per-shooter screen, but in editMode.
    if (editPhase === 'shooter' && editShooterIdx !== null) {
      return (
        <PerShooterScreen
          round={round}
          rosterById={rosterById}
          shooterIdx={editShooterIdx}
          editMode={true}
          onStationTap={handleStationTap}
        />
      );
    }

    if (screenIdx === 0) {
      return (
        <OverviewScreen
          round={round}
          rosterById={rosterById}
          onEditShooter={handleEditShooter}
        />
      );
    }
    if (screenIdx === SCREEN_COUNT - 1) {
      return (
        <PdfPreviewScreen
          round={round}
          rosterById={rosterById}
          onRunItBack={onRunItBack}
        />
      );
    }
    const idx = sortedShooters[screenIdx - 1].idx;
    return (
      <PerShooterScreen
        round={round}
        rosterById={rosterById}
        shooterIdx={idx}
      />
    );
  };

  const inEditFlow = editPhase !== null;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ borderBottom: '0.5px solid var(--color-text-tertiary)' }}
      >
        <button
          onClick={inEditFlow ? handleMoreChangesDone : onBack}
          className="p-1 -ml-1"
          aria-label={inEditFlow ? 'Cancel edits' : 'Back'}
        >
          <IconChevronLeft size={24} color="var(--color-text-primary)" />
        </button>
        <div
          className="text-[13px] font-medium"
          style={{
            color: inEditFlow
              ? 'var(--color-clay-orange)'
              : 'var(--color-text-secondary)',
          }}
        >
          {inEditFlow ? 'Editing scores' : 'Round complete'}
        </div>
        <button
          onClick={() => !inEditFlow && setSheetOpen(true)}
          className="p-1 -mr-1"
          aria-label="Menu"
          style={{
            visibility: inEditFlow ? 'hidden' : 'visible',
          }}
        >
          <IconDots size={22} color="var(--color-text-primary)" />
        </button>
      </div>

      {/* Screen body */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Desktop arrows — only in carousel mode */}
        {!inEditFlow && screenIdx > 0 && (
          <button
            onClick={goPrev}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full"
            style={{
              background: 'var(--color-background-secondary)',
              border: '0.5px solid var(--color-text-tertiary)',
            }}
            aria-label="Previous screen"
          >
            <IconChevronLeft size={22} color="var(--color-text-primary)" />
          </button>
        )}

        {!inEditFlow && screenIdx < SCREEN_COUNT - 1 && (
          <button
            onClick={goNext}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full"
            style={{
              background: 'var(--color-background-secondary)',
              border: '0.5px solid var(--color-text-tertiary)',
            }}
            aria-label="Next screen"
          >
            <IconChevronRight size={22} color="var(--color-text-primary)" />
          </button>
        )}

        {/* Screen content */}
        {renderScreen()}

        {/* Pagination dots — hidden during edit flow */}
        {!inEditFlow && (
          <div className="flex items-center justify-center gap-2 pb-3">
            {Array.from({ length: SCREEN_COUNT }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === screenIdx ? 8 : 6,
                  height: i === screenIdx ? 8 : 6,
                  background:
                    i === screenIdx
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-tertiary)',
                  opacity: i === screenIdx ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        items={menuItems}
      />

      <DeleteRoundModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        shooterCount={round.shooters.length}
        shotCount={round.shots.length}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}