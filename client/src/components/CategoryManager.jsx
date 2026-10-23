import { useState } from 'react'
import ModalPortal from './ModalPortal'
import ConfirmModal from './ConfirmModal'
import { useLanguage } from '../context/LanguageContext'

export default function CategoryManager({
  isOpen,
  onClose,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const { t } = useLanguage()
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#e8a0bf' })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, cat: null })

  function resetForm() {
    setForm({ name: '', color: '#e8a0bf' })
    setEditingId(null)
    setError('')
  }

  function startEdit(cat) {
    setEditingId(cat.id)
    setForm({ name: cat.name, color: cat.color || '#e8a0bf' })
    setError('')
  }

  function getColorOwner(color) {
    const normalized = color.toLowerCase()
    const match = categories.find(
      c => c.color?.toLowerCase() === normalized && c.id !== editingId
    )
    return match || null
  }

  const colorOwner = getColorOwner(form.color)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = form.name.trim()
    if (!trimmed) return

    if (colorOwner) {
      setError(t('money.colorTaken').replace('{name}', colorOwner.name))
      return
    }

    try {
      if (editingId) {
        await onUpdate(editingId, { name: trimmed, color: form.color })
      } else {
        await onAdd({ name: trimmed, color: form.color })
      }
      resetForm()
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('Color already used') || msg.includes('already exists') || msg.includes('409')) {
        try {
          const data = JSON.parse(msg)
          if (data.usedBy) {
            setError(t('money.colorTaken').replace('{name}', data.usedBy))
          } else {
            setError(t('money.categoryExists'))
          }
        } catch {
          setError(t('money.categoryExists'))
        }
      } else {
        setError(msg)
      }
    }
  }

  async function handleDelete() {
    if (!confirmDelete.cat) return
    try {
      await onDelete(confirmDelete.cat.id)
      setConfirmDelete({ isOpen: false, cat: null })
      if (editingId === confirmDelete.cat.id) resetForm()
    } catch (err) {
      const msg = err?.message || ''
      setConfirmDelete({ isOpen: false, cat: null })
      if (msg.includes('409') || msg.includes('Cannot delete')) {
        try {
          const data = JSON.parse(msg)
          setError(t('money.deleteCategoryBlocked').replace('{count}', data.transactionCount || '?'))
        } catch {
          setError(t('money.deleteCategoryBlocked').replace('{count}', '?'))
        }
      } else {
        setError(msg)
      }
    }
  }

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <h3>{t('money.categoryManager')}</h3>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <form className="modal-form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('money.categoryName')}
                  required
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(233,176,202,0.5)',
                  cursor: 'pointer',
                  background: 'rgba(255,247,252,0.7)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#62374d',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: form.color,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    flexShrink: 0,
                  }}
                />
                {t('money.categoryColor')}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ width: 0, height: 0, padding: 0, border: 'none', position: 'absolute', opacity: 0 }}
                />
              </label>
            </div>
            {colorOwner && !error && (
              <div style={{ color: '#e67e22', fontSize: 13, marginTop: 4 }}>
                {t('money.colorTaken').replace('{name}', colorOwner.name)}
              </div>
            )}
            {error && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 4 }}>{error}</div>}
            <div className="modal-actions">
              {editingId && (
                <button className="btn ghost" type="button" onClick={resetForm}>
                  {t('money.cancelEdit')}
                </button>
              )}
              <button className="btn primary" type="submit">
                {editingId ? t('money.saveEdit') : t('money.addCategory')}
              </button>
            </div>
          </form>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {categories.length === 0 ? (
              <div className="empty-state" style={{ padding: 20, textAlign: 'center' }}>
                {t('money.noCategories')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: editingId === cat.id ? 'rgba(232,160,191,0.12)' : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: cat.color || '#e8a0bf',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
                    <button
                      className="icon-btn"
                      onClick={() => startEdit(cat)}
                      title={t('money.editCategory')}
                      style={{ fontSize: 13 }}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => setConfirmDelete({ isOpen: true, cat })}
                      title={t('money.deleteCategory')}
                      style={{ fontSize: 13 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, cat: null })}
        title={t('money.deleteCategoryTitle')}
        message={`${t('money.deleteCategory')}: "${confirmDelete.cat?.name || ''}"?`}
      />
    </ModalPortal>
  )
}
