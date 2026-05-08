// src/components/SquadStrip.jsx
//
// Visual-only. Reads the round, renders 5 mini cards in physical-post order
// (left to right, post 1 → post 5). Re-orders as the squad rotates. The active
// mini gets a coral outline; left-the-line shooters are dimmed to 0.4 opacity.
//
// Props:
//   round              — the round object
//   activeShooterIdx   — shooter index whose mini gets the coral outline
//                        (null = no highlight, e.g. round complete)
//   rosterById         — { [rosterId]: rosterEntry } lookup for first names

import { squadByPhysicalPost, shooterScore } from '../lib/scoring.js';

export default function SquadStrip({ round, activeShooterIdx, rosterById }) {
  const layout = squadByPhysicalPost(round);

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {layout.map((shooterIdx, idx) => {
        const physicalPost = idx + 1;
        if (shooterIdx === null) {
          return <EmptyMini key={physicalPost} post={physicalPost} />;
        }
        const shooter = round.shooters[shooterIdx];
        return (
          <Mini
            key={physicalPost}
            post={physicalPost}
            shooter={shooter}
            rosterEntry={rosterById?.[shooter.rosterId]}
            score={shooterScore(round, shooterIdx)}
            isActive={shooterIdx === activeShooterIdx}
          />
        );
      })}
    </div>
  );
}

function Mini({ post, shooter, rosterEntry, score, isActive }) {
  const hasLeft = shooter.leftAfterShot != null;
  const name = rosterEntry?.firstName ?? '?';

  return (
    <div
      className="flex flex-col items-center text-center px-1 py-2"
      style={{
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-md)',
        outline: isActive ? '2px solid var(--color-clay-orange)' : 'none',
        opacity: hasLeft ? 0.4 : 1,
      }}
    >
      <div
        className="text-[11px] leading-tight"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        post {post}
      </div>
      <div
        className="text-[13px] font-medium leading-tight mt-1 truncate w-full"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {name}
      </div>
      <div
        className="text-[12px] leading-tight mt-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {score.hits}/{score.total}
        {hasLeft && ' · left'}
      </div>
    </div>
  );
}

function EmptyMini({ post }) {
  return (
    <div
      className="flex flex-col items-center text-center px-1 py-2"
      style={{
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-md)',
        opacity: 0.3,
      }}
    >
      <div
        className="text-[11px] leading-tight"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        post {post}
      </div>
      <div className="text-[13px] leading-tight mt-1">&nbsp;</div>
      <div className="text-[12px] leading-tight mt-1">&nbsp;</div>
    </div>
  );
}