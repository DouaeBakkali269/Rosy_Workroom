import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import { getNotes, createNote, updateNote, deleteNote } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

export default function NotesPage() {
  const { t } = useLanguage()
  const [notes, setNotes] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
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
      const tagsArray = tags.split(',').map((tag) => tag.trim()).filter((tag) => tag)

      if (editingNote) {
        const updated = await updateNote(editingNote.id, {
          title,
          content,
          tags: tagsArray
        })
        setNotes(notes.map((note) => (note.id === editingNote.id ? updated : note)))
      } else {
        const newNote = await createNote({
          title,
          content,
          tags: tagsArray
        })
        setNotes([newNote, ...notes])
      }
      setFormData({ title: '', content: '', tags: '' })
      setEditingNote(null)
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingNote(null)
    setFormData({ title: '', content: '', tags: '' })
    setIsModalOpen(true)
  }

  function openEditModal(note) {
    setEditingNote(note)
    setFormData({
      title: note.title || '',
      content: note.content || '',
      tags: Array.isArray(note.tags) ? note.tags.join(', ') : ''
    })
    setIsModalOpen(true)
  }

  function handleDelete(id) {
    const note = notes.find((n) => n.id === id)
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
      setNotes(notes.filter((n) => n.id !== confirmDelete.noteId))
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
        <button className="btn primary" onClick={openAddModal}>
          {t('notes.newNote')}
        </button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => { setIsModalOpen(false); setEditingNote(null) }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingNote ? t('notes.editNoteTitle') : t('notes.addNoteTitle')}</h3>
                <button className="modal-close" onClick={() => { setIsModalOpen(false); setEditingNote(null) }}>x</button>
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
                  <button className="btn ghost" type="button" onClick={() => { setIsModalOpen(false); setEditingNote(null) }}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{editingNote ? t('common.save') : t('notes.addNoteButton')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="notes-card-stage">
        {loading && notes.length === 0 ? (
          <div className="notes-empty-board">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="notes-empty-board">{t('notes.empty')}</div>
        ) : (
          <div className="notes-pin-grid">
            {notes.map((note) => (
              <article key={note.id} className="notes-pin-card">
                <div className="notes-pin-thumbtack" aria-hidden="true" />
                <button
                  className="icon-btn notes-pin-edit"
                  onClick={() => openEditModal(note)}
                  aria-label={t('common.edit')}
                  title={t('common.edit')}
                >
                  ✎
                </button>
                <button
                  className="notes-pin-close"
                  onClick={() => handleDelete(note.id)}
                  aria-label={t('common.delete')}
                >
                  x
                </button>
                <div className="notes-pin-title">{note.title}</div>
                <p className="notes-pin-content">{note.content}</p>
                {note.tags && note.tags.length > 0 && (
                  <div className="notes-pin-tags">
                    {note.tags.map((tag, idx) => (
                      <span key={idx}>{tag}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
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
