import ModalPortal from './ModalPortal'
import { useLanguage } from '../context/LanguageContext'

export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }) {
  const { t } = useLanguage()
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
            <button className="btn ghost" onClick={onCancel}>{t('common.cancel')}</button>
            <button className="btn primary" onClick={onConfirm}>{t('common.delete')}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
