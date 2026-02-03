import { useState } from 'react'
import { updateKanbanCard, deleteKanbanCard } from '../services/api'

export default function TaskDetails({ card, onClose, onUpdate }) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [status, setStatus] = useState(card.status)
  const [label, setLabel] = useState(card.label || '')
  const [dueDate, setDueDate] = useState(card.dueDate || '')
  const [checklist, setChecklist] = useState([])
  const [checklistInput, setChecklistInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      await updateKanbanCard(card.id, {
        title,
        description,
        status,
        label,
        dueDate
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
      setChecklist([...checklist, { id: Date.now(), text: checklistInput, completed: false }])
      setChecklistInput('')
    }
  }

  function toggleChecklistItem(id) {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  function removeChecklistItem(id) {
    setChecklist(checklist.filter(item => item.id !== id))
  }

  const completedCount = checklist.filter(item => item.completed).length
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal task-details" onClick={(e) => e.stopPropagation()}>
        <div className="task-details-header">
          <button className="task-delete-btn" onClick={handleDelete} title="Delete task">🗑️ Delete</button>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="task-details-body">
          <div className="task-status-section">
            <select
              className="status-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                handleSave()
              }}
            >
              <option value="todo">📋 To Do</option>
              <option value="inprogress">⚙️ In Progress</option>
              <option value="done">✅ Done</option>
            </select>
          </div>

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
            <button className="task-action-btn" title="Add tags">🏷️ Tags</button>
            <button className="task-action-btn" title="Set dates">📅 Dates</button>
            <button className="task-action-btn" title="Add checklist items">☑️ Checklist</button>
            <button className="task-action-btn" title="Assign members">👥 Members</button>
          </div>

          {description || checklistInput.length > 0 ? (
            <div className="task-section">
              <h4 className="task-section-title">📝 Description</h4>
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
            <h4 className="task-section-title">✓ Checklist</h4>
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
            {dueDate && <span className="task-due">📅 {dueDate}</span>}
            {isSaving && <span className="task-saving">💾 Saving...</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
