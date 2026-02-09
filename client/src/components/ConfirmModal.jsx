import ModalPortal from './ModalPortal'

export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }) {
  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onCancel}>✕</button>
          </div>
          <div className="confirm-modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
