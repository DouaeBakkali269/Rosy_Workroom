import { useState } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from './ModalPortal'
import { updateKanbanCard, deleteKanbanCard } from '../services/api'

export default function TaskDetails({ card, onClose, onUpdate }) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [label, setLabel] = useState(card.label || '')
  const [dueDate, setDueDate] = useState(card.dueDate || '')
  const [checklist, setChecklist] = useState(card.checklist || [])
  const [checklistInput, setChecklistInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useLockBodyScroll(true)

  async function handleSave() {
    setIsSaving(true)
    try {
      await updateKanbanCard(card.id, {
        title,
        description,
        label,
        dueDate,
        checklist
      })
      onUpdate()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteKanbanCard(card.id)
      onUpdate()
      onClose()
    }
  }

  function handleAddChecklistItem() {
    if (checklistInput.trim()) {
      const updatedChecklist = [...checklist, { id: Date.now(), text: checklistInput, completed: false }]
      setChecklist(updatedChecklist)
      setChecklistInput('')
      // Auto-save after adding item
      updateKanbanCard(card.id, { checklist: updatedChecklist })
    }
  }

  function toggleChecklistItem(id) {
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updatedChecklist)
    // Auto-save after toggling
    updateKanbanCard(card.id, { checklist: updatedChecklist })
  }

  function removeChecklistItem(id) {
    const updatedChecklist = checklist.filter(item => item.id !== id)
    setChecklist(updatedChecklist)
    // Auto-save after removing
    updateKanbanCard(card.id, { checklist: updatedChecklist })
  }

  const completedCount = checklist.filter(item => item.completed).length
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal task-details" onClick={(e) => e.stopPropagation()}>

        <div className="task-details-body">
          <input
            className="task-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            placeholder="Task title..."
          />

          <div className="task-actions">
            <button className="task-action-btn" title="Add subtask">+ Add</button>
            <button className="task-action-btn" title="Add tags">Tags</button>
            <button className="task-action-btn" title="Set dates">Dates</button>
            <button className="task-action-btn" title="Add checklist items">Checklist</button>
            <button className="task-action-btn" title="Assign members">Members</button>
          </div>

          {description || checklistInput.length > 0 ? (
            <div className="task-section">
              <h4 className="task-section-title">Description</h4>
              <textarea
                className="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Add a detailed description..."
              />
            </div>
          ) : null}

          <div className="task-section">
            <h4 className="task-section-title">Checklist</h4>
            <div className="task-checklist-progress">{checklistProgress}%</div>
            
            {checklist.length > 0 && (
              <div className="checklist-items">
                {checklist.map(item => (
                  <div key={item.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="checklist-checkbox"
                    />
                    <span className={`checklist-text ${item.completed ? 'completed' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      className="checklist-delete"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="checklist-input-wrapper">
              <input
                type="text"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Add a new item..."
                className="checklist-input"
              />
              <button
                onClick={handleAddChecklistItem}
                className="task-add-item"
              >
                + Add item
              </button>
            </div>
          </div>

          <div className="task-meta">
            {label && <span className="task-label">{label}</span>}
            {dueDate && <span className="task-due">{dueDate}</span>}
            {isSaving && <span className="task-saving">Saving...</span>}
          </div>

          <div className="task-footer">
            <button className="task-delete-icon" onClick={handleDelete} title="Delete task">🗑</button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
