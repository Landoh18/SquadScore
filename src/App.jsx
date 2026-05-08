// App shell. Renders SetupScreen until a round is started, then a temporary
// placeholder showing the captured round data (live scoring is stage 3).

import { useState } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import { getRosterEntry } from './lib/roster.js';

export default function App() {
  const [activeRound, setActiveRound] = useState(null);

  return (
    <div className="min-h-dvh bg-[var(--color-background-secondary)] flex flex-col">
      <div className="mx-auto w-full max-w-[560px] bg-[var(--color-background-primary)] flex-1 flex flex-col">
        {activeRound ? (
          <StartedPlaceholder
            round={activeRound}
            onBack={() => setActiveRound(null)}
          />
        ) : (
          <SetupScreen onStart={setActiveRound} />
        )}
      </div>
    </div>
  );
}

// Temporary placeholder screen. Shown after "Start tracking" so we can
// verify the round data flows correctly. Replaced by live scoring in stage 3.
function StartedPlaceholder({ round, onBack }) {
  const scorer = getRosterEntry(round.scorerId);

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="h-12 flex items-center justify-center border-b-[0.5px] border-[var(--color-text-tertiary)] flex-shrink-0">
        <h1 className="text-[15px] font-medium text-[var(--color-text-primary)]">
          Round started
        </h1>
      </header>

      <div className="flex-1 px-[18px] py-5 space-y-4">
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Live scoring isn't built yet — this placeholder shows what setup
          captured. Confirm everything looks right.
        </p>

        <div className="bg-[var(--color-background-secondary)] rounded-md p-3 space-y-1 text-[13px] text-[var(--color-text-primary)]">
          <div>
            <span className="text-[var(--color-text-tertiary)]">Round ID: </span>
            <span className="font-mono">{round.id}</span>
          </div>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Started: </span>
            {new Date(round.date).toLocaleString()}
          </div>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Scorer: </span>
            {scorer ? `${scorer.firstName} ${scorer.lastName}` : 'unknown'}
            {scorer && (
              <span className="text-[var(--color-text-tertiary)]"> ({scorer.id})</span>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
            Shooters ({round.shooters.length})
          </h2>
          <div className="space-y-1.5">
            {round.shooters.map((s) => {
              const entry = getRosterEntry(s.rosterId);
              return (
                <div
                  key={s.rosterId}
                  className="flex items-center gap-3 bg-[var(--color-background-secondary)] rounded-md px-3 py-2"
                >
                  <div className="w-[30px] h-[30px] rounded-full bg-white border-[0.5px] border-[var(--color-text-tertiary)] flex items-center justify-center text-[13px] font-medium text-[var(--color-text-primary)]">
                    {s.startingPost}
                  </div>
                  <span className="flex-1 text-[15px] text-[var(--color-text-primary)]">
                    {entry ? `${entry.firstName} ${entry.lastName}` : 'unknown'}
                  </span>
                  <span className="text-[12px] text-[var(--color-text-tertiary)] font-mono">
                    {s.rosterId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-[18px] pb-5 pt-3 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-full h-12 rounded-md bg-[var(--color-clay-orange)] text-[15px] font-medium text-white"
        >
          Back to setup
        </button>
      </div>
    </div>
  );
}
