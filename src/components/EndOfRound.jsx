import { useState, useEffect, useRef } from 'react';
import { IconChevronLeft, IconChevronRight, IconDots } from '@tabler/icons-react';
import OverviewScreen from './OverviewScreen';
import PerShooterScreen from './PerShooterScreen';
import PdfPreviewMock from './PdfPreviewMock';

export default function EndOfRound({ round, rosterById, onBack, onDelete }) {
  const SCREEN_COUNT = 2 + round.shooters.length;
  const [screenIdx, setScreenIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const sortedShooters = round.shooters
    .map((shooter, idx) => ({ shooter, idx }))
    .sort((a, b) => a.shooter.startingPost - b.shooter.startingPost);

  // Keyboard arrow support for desktop
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const goPrev = () => setScreenIdx((i) => Math.max(0, i - 1));
  const goNext = () => setScreenIdx((i) => Math.min(SCREEN_COUNT - 1, i + 1));

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const dx = touchEndX.current - touchStartX.current;
    const threshold = 50;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const renderScreen = () => {
    if (screenIdx === 0) {
      return <OverviewScreen round={round} rosterById={rosterById} />;
    }
    if (screenIdx === SCREEN_COUNT - 1) {
      return <PdfPreviewMock round={round} rosterById={rosterById} />;
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
          onClick={onBack}
          className="p-1 -ml-1"
          aria-label="Back"
        >
          <IconChevronLeft size={24} color="var(--color-text-primary)" />
        </button>
        <div
          className="text-[13px] font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Round complete
        </div>
        <button
          className="p-1 -mr-1"
          aria-label="Menu"
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
        {/* Desktop arrow: previous */}
        {screenIdx > 0 && (
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

        {/* Desktop arrow: next */}
        {screenIdx < SCREEN_COUNT - 1 && (
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

        {/* Pagination dots */}
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
      </div>
    </div>
  );
}