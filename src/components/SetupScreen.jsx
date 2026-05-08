// Setup screen — bookends every round.
//
// State tracked here:
//   scorerId         — selected scorer's roster ID, or null
//   shooters         — committed shooters: [{rosterId, startingPost}]
//   draftRosterId    — in-progress shooter's roster ID, or null
//   draftPost        — in-progress shooter's starting post, or null
//
// "Add another" and "Start tracking" both commit the in-progress shooter
// if the form is complete (rosterId and post both set). Start tracking
// then creates the round via the round store (which persists it) and hands
// the returned round to the parent via onStart.

import { useState, useMemo } from 'react';
import { IconX } from '@tabler/icons-react';
import RosterPicker from './RosterPicker.jsx';
import PostPicker from './PostPicker.jsx';
import { getRosterEntry } from '../lib/roster.js';
import { startRound } from '../lib/roundStore.js';

const MAX_SHOOTERS = 5;

export default function SetupScreen({ onStart }) {
  const [scorerId, setScorerId] = useState(null);
  const [shooters, setShooters] = useState([]);
  const [draftRosterId, setDraftRosterId] = useState(null);
  const [draftPost, setDraftPost] = useState(null);

  const takenPosts = useMemo(() => shooters.map((s) => s.startingPost), [shooters]);
  const excludeIds = useMemo(() => shooters.map((s) => s.rosterId), [shooters]);

  const draftComplete = draftRosterId !== null && draftPost !== null;
  const totalAfterCommit = shooters.length + (draftComplete ? 1 : 0);
  const canStart = scorerId !== null && totalAfterCommit > 0;
  const canAddAnother = draftComplete && shooters.length < MAX_SHOOTERS;

  function commitDraft() {
    if (!draftComplete) return shooters;
    const next = [...shooters, { rosterId: draftRosterId, startingPost: draftPost }];
    setShooters(next);
    setDraftRosterId(null);
    setDraftPost(null);
    return next;
  }

  function handleAddAnother() {
    if (!canAddAnother) return;
    commitDraft();
  }

  function handleStartTracking() {
    if (!canStart) return;
    const finalShooters = commitDraft();
    const round = startRound({
      scorerId,
      shooters: finalShooters,
    });
    onStart?.(round);
  }

  function handleRemoveShooter(idx) {
    setShooters(shooters.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col flex-1 min-h-full">
      {/* Top bar — back arrow comes in stage 6 when home screen lands */}
      <header className="h-12 flex items-center justify-center border-b-[0.5px] border-[var(--color-text-tertiary)] flex-shrink-0">
        <h1 className="text-[15px] font-medium text-[var(--color-text-primary)]">New round</h1>
      </header>

      {/* Body */}
      <div className="flex-1 px-[18px] py-5 space-y-5">
        {/* Scorer */}
        <section>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
            Scorer
          </label>
          <RosterPicker
            value={scorerId}
            onChange={setScorerId}
            placeholder="Search by name"
          />
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1.5">
            Shown on the printed scorecard
          </p>
        </section>

        {/* Shooters */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Shooters
            </label>
            <span className="text-[12px] text-[var(--color-text-tertiary)]">
              {shooters.length} of {MAX_SHOOTERS}
            </span>
          </div>

          {/* Already-added shooters */}
          {shooters.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {shooters.map((s, i) => {
                const entry = getRosterEntry(s.rosterId);
                return (
                  <div
                    key={s.rosterId}
                    className="flex items-center gap-3 bg-[var(--color-background-secondary)] rounded-md px-3 py-2"
                  >
                    <div className="w-[30px] h-[30px] rounded-full bg-white border-[0.5px] border-[var(--color-text-tertiary)] flex items-center justify-center text-[13px] font-medium text-[var(--color-text-primary)]">
                      {s.startingPost}
                    </div>
                    <span className="flex-1 text-[15px] text-[var(--color-text-primary)] truncate">
                      {entry ? `${entry.firstName} ${entry.lastName}` : 'unknown'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveShooter(i)}
                      aria-label={`Remove ${entry?.firstName ?? 'shooter'}`}
                      className="p-1 text-[var(--color-text-tertiary)]"
                    >
                      <IconX size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active form (hidden once at max) */}
          {shooters.length < MAX_SHOOTERS && (
            <div className="bg-white border-[0.5px] border-[var(--color-text-tertiary)] rounded-lg pt-3.5 px-3.5 pb-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Name
                </label>
                <RosterPicker
                  value={draftRosterId}
                  onChange={setDraftRosterId}
                  excludeIds={excludeIds}
                  placeholder="Search by name"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Starting post
                </label>
                <PostPicker
                  value={draftPost}
                  takenPosts={takenPosts}
                  onChange={setDraftPost}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* CTAs */}
      <div className="px-[18px] pb-5 pt-3 grid grid-cols-2 gap-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleAddAnother}
          disabled={!canAddAnother}
          className={`h-12 rounded-md border-[0.5px] border-[var(--color-text-tertiary)] bg-white text-[15px] font-medium text-[var(--color-text-primary)] transition-opacity ${
            !canAddAnother ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          Add another
        </button>
        <button
          type="button"
          onClick={handleStartTracking}
          disabled={!canStart}
          className={`h-12 rounded-md bg-[var(--color-clay-orange)] text-[15px] font-medium text-white transition-opacity ${
            !canStart ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          Start tracking
        </button>
      </div>
    </div>
  );
}