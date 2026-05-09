// LeaveTheLineModal.jsx
// Confirms that the live active shooter is leaving the round early.
// On confirm, sets leftAfterShot on the round's shooter entry, which causes
// firingOrder() to skip them on all future slots automatically.

import Modal from './Modal';

export default function LeaveTheLineModal({
  open,
  onClose,
  shooterName,
  hits,
  total,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${shooterName || 'This shooter'} has left the line?`}
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'cancel' },
        { label: 'Confirm', onClick: onConfirm, variant: 'destructive' },
      ]}
    >
      {shooterName}'s {hits}/{total} so far will be kept. They'll be skipped
      for the rest of the round.
    </Modal>
  );
}