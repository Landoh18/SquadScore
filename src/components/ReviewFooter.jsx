// src/components/ReviewFooter.jsx
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';

export default function ReviewFooter({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}) {
  return (
    <div
      className="px-[18px] grid grid-cols-2 gap-3"
      style={{
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      <button
        onClick={onPrev}
        disabled={prevDisabled}
        className="flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
        style={{
          height: '44px',
          background: 'white',
          color: 'var(--color-text-primary)',
          border: '0.5px solid var(--color-text-tertiary)',
          borderRadius: 'var(--border-radius-md)',
        }}
      >
        <IconArrowLeft size={18} stroke={2} />
        <span className="text-[13px] font-medium">Previous shot</span>
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
        style={{
          height: '44px',
          background: 'white',
          color: 'var(--color-text-primary)',
          border: '0.5px solid var(--color-text-tertiary)',
          borderRadius: 'var(--border-radius-md)',
        }}
      >
        <span className="text-[13px] font-medium">Next shot</span>
        <IconArrowRight size={18} stroke={2} />
      </button>
    </div>
  );
}