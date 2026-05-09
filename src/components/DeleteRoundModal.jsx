// DeleteRoundModal.jsx
// Permanently deletes the current round. Concrete numbers in the body
// (N shooters, M shots) make the consequence land — at round start "0 shots
// scored" reads as low-stakes; mid-round, the real shot count makes it real.

import Modal from './Modal';

export default function DeleteRoundModal({
  open,
  onClose,
  shooterCount,
  shotCount,
  onConfirm,
}) {
  const shooterWord = shooterCount === 1 ? 'shooter' : 'shooters';
  const shotWord = shotCount === 1 ? 'shot' : 'shots';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete this round?"
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'cancel' },
        { label: 'Delete', onClick: onConfirm, variant: 'destructive' },
      ]}
    >
      All {shooterCount} {shooterWord} and {shotCount} {shotWord} scored so far
      will be permanently deleted. This can't be undone.
    </Modal>
  );
}