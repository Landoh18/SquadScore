// BottomSheet.jsx
// Generic bottom sheet wrapper. Slides up from the bottom of the screen
// with a backdrop. Used for the live-scoring 3-dot menu in v1; reusable.
//
// Props:
//   open      — boolean, controls visibility
//   onClose   — called when backdrop tapped or Cancel pressed
//   items     — array of { label, icon, onClick, danger? }
//               icon is a Tabler icon component (e.g. IconPencil)

import { useEffect } from 'react';

export default function BottomSheet({ open, onClose, items }) {
  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          animation: 'sheetFade 220ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--color-background-primary)',
          borderTopLeftRadius: 'var(--border-radius-lg)',
          borderTopRightRadius: 'var(--border-radius-lg)',
          zIndex: 101,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          animation: 'sheetSlide 220ms ease-out',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--color-text-tertiary)',
              opacity: 0.4,
            }}
          />
        </div>

        {/* Items */}
        <div>
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => { item.onClick(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: idx === 0 ? 'none' : '0.5px solid var(--color-background-tertiary)',
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: 'left',
                  color: item.danger ? 'var(--color-text-danger)' : 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {Icon && <Icon size={20} stroke={1.75} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cancel */}
        <div style={{ padding: '8px 12px 12px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'var(--color-background-secondary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetSlide {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes sheetFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}