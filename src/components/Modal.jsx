// Modal.jsx
// Generic modal wrapper. Centered card with backdrop, scale-in animation.
// Used for the three live-scoring confirmations in v1; reusable.
//
// Props:
//   open       — boolean, controls visibility
//   onClose    — called when backdrop tapped (or Escape, eventually)
//   title      — string, centered, 17px weight 500
//   children   — body content (skip when title alone is enough)
//   actions    — array of { label, onClick, variant }
//                variant: 'cancel' | 'destructive' | 'primary'

import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, actions }) {
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
          zIndex: 200,
          animation: 'modalFade 200ms ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {/* Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--color-background-primary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '22px 18px 16px',
            maxWidth: 280,
            width: '100%',
            animation: 'modalScale 200ms ease-out',
          }}
        >
          {title && (
            <div
              style={{
                fontSize: 17,
                fontWeight: 500,
                textAlign: 'center',
                color: 'var(--color-text-primary)',
                marginBottom: children ? 10 : 16,
              }}
            >
              {title}
            </div>
          )}

          {children && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {children}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {actions.map((action, idx) => {
              const styles = variantStyles(action.variant);
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: action.disabled ? 'default' : 'pointer',
                    opacity: action.disabled ? 0.5 : 1,
                    ...styles,
                  }}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalScale {
          from { transform: scale(0.94); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function variantStyles(variant) {
  switch (variant) {
    case 'destructive':
      return {
        background: 'var(--color-text-danger)',
        color: 'white',
        border: 'none',
      };
    case 'primary':
      return {
        background: 'var(--color-clay-orange)',
        color: 'white',
        border: 'none',
      };
    case 'cancel':
    default:
      return {
        background: 'white',
        color: 'var(--color-text-primary)',
        border: '0.5px solid var(--color-text-tertiary)',
      };
  }
}