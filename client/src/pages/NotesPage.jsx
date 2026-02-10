import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import { getNotes, createNote, deleteNote } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

export default function NotesPage() {
  const { t } = useLanguage()
  const [notes, setNotes] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, noteId: null, noteTitle: '' })
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  })

  useLockBodyScroll(isModalOpen || confirmDelete.isOpen)

  useEffect(() => {
    loadNotes()
  }, [])

  async function loadNotes() {
    try {
      setLoading(true)
      const data = await getNotes()
      setNotes(data)
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { title, content, tags } = formData
    if (!title.trim() || !content.trim()) return
    
    try {
      setLoading(true)
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      const newNote = await createNote({
        title,
        content,
        tags: tagsArray
      })
      
      setNotes([newNote, ...notes])
      setFormData({ title: '', content: '', tags: '' })
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create note:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id) {
    const note = notes.find(n => n.id === id)
    setConfirmDelete({
      isOpen: true,
      noteId: id,
      noteTitle: note?.title || t('notes.thisNote')
    })
  }

  async function confirmDeleteNote() {
    try {
      setLoading(true)
      await deleteNote(confirmDelete.noteId)
      setNotes(notes.filter(n => n.id !== confirmDelete.noteId))
    } catch (error) {
      console.error('Failed to delete note:', error)
    } finally {
      setLoading(false)
      setConfirmDelete({ isOpen: false, noteId: null, noteTitle: '' })
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>{t('notes.title')}</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>{t('notes.newNote')}</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('notes.addNoteTitle')}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <input
                  className="input"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('notes.noteTitlePlaceholder')}
                  required
                />
                <textarea
                  className="input"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={t('notes.noteContentPlaceholder')}
                  rows="6"
                  required
                ></textarea>
                <input
                  className="input"
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder={t('notes.noteTagsPlaceholder')}
                />
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('notes.addNoteButton')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="notes-grid">
        {notes.length === 0 ? (
          <div className="empty-state">{t('notes.empty')} 📝</div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div className="note-title">{note.title}</div>
                <button className="icon-btn" onClick={() => handleDelete(note.id)}>✕</button>
              </div>
              <p>{note.content}</p>
              {note.tags && note.tags.length > 0 && (
                <div className="note-tags">
                  {note.tags.map((tag, idx) => (
                    <span key={idx}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteNote}
        onCancel={() => setConfirmDelete({ isOpen: false, noteId: null, noteTitle: '' })}
        title={t('notes.deleteTitle')}
        message={t('notes.deleteMessage').replace('{note}', confirmDelete.noteTitle)}
      />
    </section>
  )
}
