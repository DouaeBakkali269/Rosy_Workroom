import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from './ModalPortal'
import { getKanbanCards, createKanbanCard, updateKanbanCard, deleteKanbanCard } from '../services/api'
import TaskDetails from './TaskDetails'

export default function ProjectKanban({ project, onBack }) {
  const [cards, setCards] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggedCard, setDraggedCard] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    label: '',
    status: 'todo',
    dueDate: '',
    description: ''
  })

  useLockBodyScroll(isModalOpen || Boolean(selectedCard))

  useEffect(() => {
    loadCards()
  }, [project.id])

  async function loadCards() {
    const data = await getKanbanCards(project.id)
    setCards(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return
    await createKanbanCard({
      ...formData,
      project_id: project.id,
      description: formData.description || null
    })
    setFormData({ title: '', label: '', status: 'todo', dueDate: '', description: '' })
    setIsModalOpen(false)
    loadCards()
  }

  async function handleStatusChange(id, newStatus) {
    await updateKanbanCard(id, { status: newStatus })
    loadCards()
  }

  function handleDragStart(e, card) {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleCardClick(card) {
    setSelectedCard(card)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault()
    if (draggedCard && draggedCard.status !== newStatus) {
      await handleStatusChange(draggedCard.id, newStatus)
    }
    setDraggedCard(null)
  }

  async function handleDelete(id) {
    await deleteKanbanCard(id)
    loadCards()
  }

  const todoCards = cards.filter(c => c.status === 'todo')
  const inProgressCards = cards.filter(c => c.status === 'inprogress')
  const doneCards = cards.filter(c => c.status === 'done')

  return (
    <section className="page-section active">
      <div className="section-header">
        <button className="btn ghost" onClick={onBack}>← Back to Projects</button>
        <h2>{project.name} - Kanban Board</h2>
      </div>
      
      <div className="project-actions">
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add Task</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Add Task</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleSubmit}>
                <label className="field">
                  <span className="field-label">Card title</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Card title"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Label</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Label"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Status</span>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Due date</span>
                  <input
                    className="input"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Description (optional)</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add a short description"
                  />
                </label>
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn primary" type="submit">Add Task</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedCard && (
        <TaskDetails
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={() => {
            loadCards()
            setSelectedCard(null)
          }}
          onRefresh={async () => {
            await loadCards()
            // Update selectedCard with fresh data
            const updatedCards = await getKanbanCards(project.id)
            const refreshedCard = updatedCards.find(c => c.id === selectedCard.id)
            if (refreshedCard) setSelectedCard(refreshedCard)
          }}
        />
      )}

      <div className="kanban">
        <div className="kanban-col">
          <div className="kanban-title">To Do ({todoCards.length})</div>
          <div className="kanban-drop-zone" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'todo')}>
            {todoCards.map(card => (
              <div key={card.id} className="kanban-card" draggable onDragStart={(e) => handleDragStart(e, card)} onClick={() => handleCardClick(card)}>
                <div className="card-label">{card.label || 'Task'}</div>
                <div className="card-title">{card.title}</div>
                {card.description && <div className="card-desc">{card.description}</div>}
                <div className="card-meta">
                  {card.dueDate && `Due ${card.dueDate}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="kanban-col">
          <div className="kanban-title">In Progress ({inProgressCards.length})</div>
          <div className="kanban-drop-zone" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'inprogress')}>
            {inProgressCards.map(card => (
              <div key={card.id} className="kanban-card" draggable onDragStart={(e) => handleDragStart(e, card)} onClick={() => handleCardClick(card)}>
                <div className="card-label">{card.label || 'Task'}</div>
                <div className="card-title">{card.title}</div>
                {card.description && <div className="card-desc">{card.description}</div>}
                <div className="card-meta">
                  {card.dueDate && `Due ${card.dueDate}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="kanban-col">
          <div className="kanban-title">Done ({doneCards.length})</div>
          <div className="kanban-drop-zone" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'done')}>
            {doneCards.map(card => (
              <div key={card.id} className="kanban-card" draggable onDragStart={(e) => handleDragStart(e, card)} onClick={() => handleCardClick(card)}>
                <div className="card-label">{card.label || 'Task'}</div>
                <div className="card-title">{card.title}</div>
                {card.description && <div className="card-desc">{card.description}</div>}
                <div className="card-meta">
                  {card.dueDate && `Done ${card.dueDate}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
