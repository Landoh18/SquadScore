// src/components/FlashOverlay.jsx
import { IconCheck, IconX } from '@tabler/icons-react';

export default function FlashOverlay({ type, fading }) {
  if (!type) return null;
  const isHit = type === 'hit';
  const Icon = isHit ? IconCheck : IconX;
  const label = isHit ? 'Hit' : 'Miss';
  const bg = isHit ? 'var(--color-flash-hit)' : 'var(--color-flash-miss)';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: bg,
        color: 'white',
        opacity: fading ? 0 : 1,
        transition: 'opacity 130ms ease-out',
        pointerEvents: 'none',
      }}
    >
      <Icon size={110} stroke={2.5} />
      <div className="mt-3 text-[44px] font-medium leading-none">{label}</div>
    </div>
  );
}