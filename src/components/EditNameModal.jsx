// EditNameModal.jsx
// Renames the live active shooter. Mutates the roster entry's firstName,
// which propagates to every past and future round (per the identity model
// in handoff #2). No flash — this isn't a scoring action.

import { useState, useEffect } from 'react';
import Modal from './Modal';

export default function EditNameModal({ open, onClose, currentName, onSave }) {
  const [value, setValue] = useState(currentName || '');

  // Reset the input each time the modal opens with a fresh name
  useEffect(() => {
    if (open) setValue(currentName || '');
  }, [open, currentName]);

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  const canSave = value.trim().length > 0 && value.trim() !== currentName;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${currentName}'s name`}
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'cancel' },
        { label: 'Save', onClick: handleSave, variant: 'primary', disabled: !canSave },
      ]}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 15,
          border: '0.5px solid var(--color-text-tertiary)',
          borderRadius: 8,
          fontFamily: 'inherit',
          color: 'var(--color-text-primary)',
          background: 'white',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </Modal>
  );
}