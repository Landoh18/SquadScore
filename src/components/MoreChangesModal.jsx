// src/components/MoreChangesModal.jsx
//
// The "More changes for [Name]?" prompt that appears after a station-shot edit
// commits. Two paths: Edit more (returns to the shooter's per-shooter edit
// landing) or Done (returns to the carousel overview).
//
// Per handoff #1's edit-shooter-score flow.

import Modal from './Modal';

export default function MoreChangesModal({ open, onClose, name, onEditMore, onDone }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`More changes for ${name || 'this shooter'}?`}
      actions={[
        {
          label: 'Edit more',
          onClick: onEditMore,
          variant: 'cancel',
        },
        {
          label: 'Done',
          onClick: onDone,
          variant: 'primary',
        },
      ]}
    />
  );
}