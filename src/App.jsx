// App shell. Renders SetupScreen until a round is started, then a stub of the
// live scoring screen that wires up SquadStrip + temp Hit/Miss buttons. The
// real active shooter card and flash overlay land in the next paste; this is
// just enough to verify the strip rotates correctly on a real phone.

import { useState, useMemo } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import SetupScreen from './components/SetupScreen.jsx';
import SquadStrip from './components/SquadStrip.jsx';
import { getRoster } from './lib/roster.js';
import { activeSlot, isRoundComplete } from './lib/scoring.js';
import { appendShot } from './lib/roundStore.js';

export default function App() {
  const [round, setRound] = useState(null);

  return (
    <div className="min-h-dvh bg-[var(--color-background-secondary)] flex flex-col">
      <div className="mx-auto w-full max-w-[560px] bg-[var(--color-background-primary)] flex-1 flex flex-col">
        {round ? (
          <LiveScoringStub
            round={round}
            onShoot={(hit) => setRound(appendShot(round.id, hit))}
            onBack={() => setRound(null)}
          />
        ) : (
          <SetupScreen onStart={setRound} />
        )}
      </div>
    </div>
  );
}

function LiveScoringStub({ round, onShoot, onBack }) {
  const rosterById = useMemo(() => {
    const map = {};
    for (const entry of getRoster()) map[entry.id] = entry;
    return map;
  }, []);

  const slot = activeSlot(round);
  const complete = isRoundComplete(round);
  const activeShooter = slot
    ? rosterById[round.shooters[slot.shooterIdx].rosterId]
    : null;

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="h-12 px-3 flex items-center justify-between border-b-[0.5px] border-[var(--color-text-tertiary)] flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center text-[var(--color-text-secondary)] -ml-1 px-1"
          aria-label="Save and exit"
        >
          <IconChevronLeft size={22} />
        </button>
        <span className="text-[13px] text-[var(--color-text-secondary)]">
          {complete ? 'Round complete' : 'Round in progress'}
        </span>
        <span className="w-6" />
      </header>

      <div className="flex-1 px-[18px] py-4 space-y-5">
        <SquadStrip
          round={round}
          activeShooterIdx={slot?.shooterIdx ?? null}
          rosterById={rosterById}
        />

        {slot ? (
          <div className="bg-[var(--color-background-secondary)] rounded-md p-3">
            <div className="text-[12px] text-[var(--color-text-tertiary)]">
              Station {slot.physicalPost} · shot {slot.personalStationShot + 1} of 5
            </div>
            <div className="text-[28px] font-medium text-[var(--color-text-primary)] mt-1 leading-tight">
              {activeShooter?.firstName ?? '?'}
            </div>
            <div className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
              shot {round.shots.length + 1} of round
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-background-secondary)] rounded-md p-4 text-center text-[14px] text-[var(--color-text-secondary)]">
            Round complete — {round.shots.length} shots scored
          </div>
        )}

        <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wider">
          Stage 3 scratch · proper active card + flash overlay coming next
        </p>
      </div>

      {!complete && (
        <div className="px-[18px] pb-5 pt-3 flex-shrink-0 grid grid-cols-2 gap-3">
          <button
            onClick={() => onShoot(false)}
            className="h-16 rounded-md text-white text-[16px] font-medium"
            style={{ backgroundColor: 'var(--color-text-danger)' }}
          >
            Miss
          </button>
          <button
            onClick={() => onShoot(true)}
            className="h-16 rounded-md text-white text-[16px] font-medium"
            style={{ backgroundColor: 'var(--color-text-success)' }}
          >
            Hit
          </button>
        </div>
      )}
    </div>
  );
}