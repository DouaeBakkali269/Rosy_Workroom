import { useState, useEffect, useRef } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from './ModalPortal'
import { getKanbanCards, createKanbanCard, updateKanbanCard, deleteKanbanCard, getKanbanColumns, createKanbanColumn, updateKanbanColumn, deleteKanbanColumn, updateProject, searchUsers } from '../services/api'
import TaskDetails from './TaskDetails'
import ConfirmModal from './ConfirmModal'
import { useLanguage } from '../context/LanguageContext'

const DEFAULT_COLUMNS = [
  { key: 'todo', name: 'To Do', position: 1 },
  { key: 'inprogress', name: 'In Progress', position: 2 },
  { key: 'done', name: 'Done', position: 3 }
]

function titleFromStatusKey(key) {
  if (key === 'inprogress') return 'In Progress'
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function mergeWithDefaultColumns(inputColumns) {
  const byKey = new Map()
  for (const col of Array.isArray(inputColumns) ? inputColumns : []) {
    if (!col?.key) continue
    byKey.set(col.key, col)
  }
  for (const fallback of DEFAULT_COLUMNS) {
    if (!byKey.has(fallback.key)) {
      byKey.set(fallback.key, fallback)
    }
  }
  return [...byKey.values()].sort((a, b) => (a.position || 0) - (b.position || 0))
}

function stripHtml(value) {
  if (!value) return ''
  const div = document.createElement('div')
  div.innerHTML = value
  return div.textContent || div.innerText || ''
}

function priorityRank(value) {
  if (value === 'high') return 0
  if (value === 'medium') return 1
  if (value === 'low') return 2
  return 3
}

function getChecklistStats(card) {
  if (Array.isArray(card.checklistGroups) && card.checklistGroups.length) {
    const allItems = card.checklistGroups.flatMap(group => (Array.isArray(group.items) ? group.items : []))
    const total = allItems.length
    const completed = allItems.filter(item => item?.completed).length
    return { total, completed }
  }

  if (Array.isArray(card.checklist) && card.checklist.length) {
    const total = card.checklist.length
    const completed = card.checklist.filter(item => item?.completed).length
    return { total, completed }
  }

  return { total: 0, completed: 0 }
}

function initialsFromName(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?'
}

function i18nLabel(t, key, fallback) {
  const value = t ? t(key) : ''
  return value && value !== key ? value : fallback
}

export default function ProjectKanban({ project, onBack }) {
    const [addCardColumn, setAddCardColumn] = useState(null)
  const { t } = useLanguage()
  const [cards, setCards] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggedCard, setDraggedCard] = useState(null)
  const [dragOverCardId, setDragOverCardId] = useState(null)
  const [dragOverInsertAfter, setDragOverInsertAfter] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const draggedCardRef = useRef(null)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [draggedColumnKey, setDraggedColumnKey] = useState(null)
  const [newColumnName, setNewColumnName] = useState('')
  const [editingColumnKey, setEditingColumnKey] = useState(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [confirmDeleteColumn, setConfirmDeleteColumn] = useState({ isOpen: false, key: null, id: null, name: '' })
  const [members, setMembers] = useState(Array.isArray(project.members) ? project.members : [])
  const [memberInput, setMemberInput] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [memberError, setMemberError] = useState('')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    status: 'todo',
    priority: '',
    dueDate: '',
    description: ''
  })

  useLockBodyScroll(isModalOpen || Boolean(selectedCard) || confirmDeleteColumn.isOpen)

  useEffect(() => {
    loadCards()
    loadColumns()
    setMembers(Array.isArray(project.members) ? project.members : [])
  }, [project.id])

  async function updateColumnWithFallback(key, data) {
    try {
      return await updateKanbanColumn(key, data, project.id)
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('not found')) {
        return updateKanbanColumn(key, data, 0)
      }
      throw err
    }
  }

  async function loadCards() {
    const data = await getKanbanCards(project.id)
    setCards(data)
  }

  async function handleAddMember(e) {
    e?.preventDefault()
    const username = memberInput.trim()
    if (!username) return
    if (members.some(m => m.toLowerCase() === username.toLowerCase())) {
      setMemberError(t('Member already Exists') || 'Member already added')
      return
    }
    try {
      const users = await searchUsers(username)
      const exact = (Array.isArray(users) ? users : []).find(
        (u) => String(u.username).toLowerCase() === username.toLowerCase()
      )
      if (!exact) {
        setMemberError(t('projects.userNotFound')?.replace('{user}', username) || 'User not found')
        setMemberSuggestions(Array.isArray(users) ? users : [])
        return
      }
      const nextMembers = [...members, exact.username]
      await updateProject(project.id, { members: nextMembers })
      setMembers(nextMembers)
      setMemberInput('')
      setMemberSuggestions([])
      setMemberError('')
      setShowMemberModal(false)
    } catch (err) {
      console.error('Failed to add member', err)
      setMemberError(t('projects.memberSearchError') || 'Unable to add member')
    }
  }

  async function handleMemberInput(value) {
    setMemberInput(value)
    const query = value.trim()
    if (!query) {
      setMemberSuggestions([])
      setMemberError('')
      return
    }
    try {
      const results = await searchUsers(query)
      setMemberSuggestions(Array.isArray(results) ? results : [])
      setMemberError('')
    } catch (err) {
      console.error('Failed to fetch suggestions', err)
      setMemberSuggestions([])
      setMemberError(t('projects.memberSearchError') || 'Error searching users')
    }
  }

  async function loadColumns() {
    try {
      const data = await getKanbanColumns(project.id)
      const hydrated = Array.isArray(data) && data.length ? data : DEFAULT_COLUMNS
      const merged = mergeWithDefaultColumns(hydrated).sort((a, b) => (a.position || 0) - (b.position || 0))
      setColumns(merged)
      if (!merged.some(col => col.key === formData.status)) {
        setFormData((prev) => ({ ...prev, status: merged[0].key }))
      }
    } catch (err) {
      console.error('Failed to load columns:', err)
      setColumns(DEFAULT_COLUMNS)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return
    await createKanbanCard({
      ...formData,
      project_id: project.id,
      priority: formData.priority || null,
      description: formData.description || null
    })
    setFormData({ title: '', status: columns[0]?.key || 'todo', priority: '', dueDate: '', description: '' })
    setIsModalOpen(false)
    loadCards()
  }

  async function handleAddColumn() {
    const name = newColumnName.trim()
    if (!name) return
    try {
      const created = await createKanbanColumn({
        name,
        projectId: project.id,
        position: (columns[columns.length - 1]?.position || columns.length) + 1
      })
      setColumns((prev) => [...prev, created])
      setNewColumnName('')
    } catch (err) {
      console.error('Failed to add column:', err)
    }
  }

  async function handleColumnRename(key, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      const updated = await updateColumnWithFallback(key, { name: trimmed })
      if (updated) {
        setColumns((prev) => prev.map(col => (col.key === key ? { ...col, ...updated } : col)))
      }
    } catch (err) {
      console.error('Failed to rename column:', err)
    }
  }

  function handleDeleteColumn(key) {
    const column = columns.find(col => col.key === key)
    setConfirmDeleteColumn({
      isOpen: true,
      key,
      id: column?.id ?? null,
      name: column?.name || t('kanban.thisColumn')
    })
  }

  async function handleConfirmDeleteColumn() {
    try {
      const target = confirmDeleteColumn.id ?? confirmDeleteColumn.key
      await deleteKanbanColumn(target, project.id)
      await loadColumns()
      await loadCards()
    } catch (err) {
      // fallback: try personal scope if project-scoped delete fails (404)
      if (String(err?.message || '').toLowerCase().includes('not found')) {
        try {
          const target = confirmDeleteColumn.id ?? confirmDeleteColumn.key
          await deleteKanbanColumn(target, 0)
          await loadColumns()
          await loadCards()
          setConfirmDeleteColumn({ isOpen: false, key: null, id: null, name: '' })
          return
        } catch (inner) {
          console.error('Failed fallback delete column:', inner)
        }
      }
      console.error('Failed to delete column:', err)
    } finally {
      setConfirmDeleteColumn({ isOpen: false, key: null, id: null, name: '' })
    }
  }

  async function handleStatusChange(id, newStatus) {
    await updateKanbanCard(id, { status: newStatus })
    loadCards()
  }

  function handleDragStart(e, card) {
    setDraggedCard(card)
    draggedCardRef.current = card
    e.dataTransfer.effectAllowed = 'move'
  }

  function buildStatusLists(sourceCards) {
    return {
      todo: sourceCards.filter(c => c.status === 'todo'),
      inprogress: sourceCards.filter(c => c.status === 'inprogress'),
      done: sourceCards.filter(c => c.status === 'done')
    }
  }

  async function persistCardPositions(lists, originalById) {
    const updates = []
    Object.entries(lists).forEach(([status, list]) => {
      list.forEach((card, index) => {
        const newPos = index + 1
        const original = originalById.get(card.id)
        const statusChanged = !original || original.status !== status
        const positionChanged = !original || original.position !== newPos
        if (statusChanged || positionChanged) {
          updates.push({ id: card.id, status, position: newPos })
        }
      })
    })

    if (updates.length === 0) return
    await Promise.all(updates.map(update => updateKanbanCard(update.id, update)))
  }

  async function applyCardMove(targetStatus, targetCardId = null, insertAfter = false) {
    const activeCard = draggedCardRef.current || draggedCard
    if (!activeCard) return
    const originalById = new Map(cards.map(card => [card.id, card]))
    const lists = buildStatusLists(cards)

    const sourceStatus = activeCard.status
    const sourceList = [...lists[sourceStatus]]
    const sourceIndex = sourceList.findIndex(c => c.id === activeCard.id)
    if (sourceIndex === -1) return

    const [moved] = sourceList.splice(sourceIndex, 1)
    const movedCard = { ...moved, status: targetStatus }
    lists[sourceStatus] = sourceList

    const targetList = sourceStatus === targetStatus ? sourceList : [...lists[targetStatus]]
    if (targetCardId) {
      const targetIndex = targetList.findIndex(c => c.id === targetCardId)
      if (targetIndex === -1) {
        targetList.push(movedCard)
      } else {
        const insertIndex = insertAfter ? targetIndex + 1 : targetIndex
        targetList.splice(insertIndex, 0, movedCard)
      }
    } else {
      targetList.push(movedCard)
    }
    lists[targetStatus] = targetList

    const nextCards = [...lists.todo, ...lists.inprogress, ...lists.done]
    setCards(nextCards)
    await persistCardPositions(lists, originalById)
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
    await applyCardMove(newStatus)
    setDraggedCard(null)
    draggedCardRef.current = null
    setDragOverCardId(null)
  }

  function handleColumnDragStart(key) {
    setDraggedColumnKey(key)
  }

  async function handleColumnDrop(targetKey) {
    if (!draggedColumnKey || draggedColumnKey === targetKey) return
    const order = [...columns]
    const from = order.findIndex(c => c.key === draggedColumnKey)
    const to = order.findIndex(c => c.key === targetKey)
    if (from === -1 || to === -1) return
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    const reindexed = order.map((col, idx) => ({ ...col, position: idx + 1 }))
    setColumns(reindexed)
    // persist new positions with fallback (project then global)
    try {
      await Promise.all(
        reindexed.map((col) => updateColumnWithFallback(col.key, { position: col.position }))
      )
    } catch (err) {
      console.error('Failed to persist column order:', err)
    }
    setDraggedColumnKey(null)
  }

  async function handleDelete(id) {
    await deleteKanbanCard(id)
    loadCards()
  }

  const cardStatuses = [...new Set(cards.map((card) => card.status).filter(Boolean))]
  const missingStatusColumns = cardStatuses
    .filter((statusKey) => !columns.some((column) => column.key === statusKey))
    .map((statusKey, index) => ({
      key: statusKey,
      name: titleFromStatusKey(statusKey),
      position: (columns[columns.length - 1]?.position || columns.length) + index + 1
    }))
  const visibleColumns = [...columns, ...missingStatusColumns]

  const columnsWithCards = visibleColumns.map(column => ({
    column,
    cards: cards.filter(card => card.status === column.key)
  }))
  const priorityLabelMap = {
    high: t('task.priorityHigh'),
    medium: t('task.priorityMedium'),
    low: t('task.priorityLow')
  }
  const deleteColumnMessage = t('kanban.deleteColumnMessage').replace('{column}', confirmDeleteColumn.name)

  return (
    <section className="page-section active">
      <div className="project-kanban-header">
        <h2 className="project-kanban-title">{project.name} - {t('kanban.title')}</h2>
        <div className="project-kanban-actions">
          <div className="kanban-members-wrap">
            <div className="kanban-member-avatars">
              {(members || []).map((member) => (
                <div key={member} className="member-avatar" title={member}>
                  {initialsFromName(member)}
                </div>
              ))}
            </div>
            <button className="btn primary boxy" type="button" onClick={() => setShowMemberModal(true)}>
              {i18nLabel(t, 'kanban.addMember', 'Add member')}
            </button>
          </div>
        </div>
      </div>

      {showMemberModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{i18nLabel(t, 'kanban.addMember', 'Add member')}</h3>
                <button className="modal-close" onClick={() => setShowMemberModal(false)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleAddMember}>
                <label className="field">
                  <span className="field-label">{t('projects.members')}</span>
                <input
                  className="input"
                  type="text"
                  value={memberInput}
                    placeholder={i18nLabel(t, 'kanban.addMemberPlaceholder', 'Type a username')}
                    onChange={(e) => handleMemberInput(e.target.value)}
                  />
                </label>
                {memberSuggestions.length > 0 && (
                  <div className="member-suggestions">
                    {memberSuggestions.map((user) => (
                      <button
                        key={user.username}
                        type="button"
                        className="member-suggestion"
                        onClick={() => {
                          setMemberInput(user.username)
                          setMemberSuggestions([])
                        }}
                      >
                        {user.username}
                      </button>
                    ))}
                  </div>
                )}
                {memberError && <p className="form-error">{memberError}</p>}
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setShowMemberModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn primary" type="submit">
                    {i18nLabel(t, 'kanban.addMember', 'Add member')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{t('kanban.addTaskTitle')}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleSubmit}>
                <label className="field">
                  <span className="field-label">{t('kanban.cardTitle')}</span>
                  <input className="input" type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('kanban.cardTitle')} required />
                </label>
                <label className="field">
                  <span className="field-label">{t('kanban.status')}</span>
                  <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    {columns.map(col => <option key={col.key} value={col.key}>{col.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('task.priority')}</span>
                  <select className="input" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="">{t('common.none')}</option>
                    <option value="low">{t('task.priorityLow')}</option>
                    <option value="medium">{t('task.priorityMedium')}</option>
                    <option value="high">{t('task.priorityHigh')}</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('kanban.dueDate')}</span>
                  <input className="input" type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">{t('kanban.descriptionOptional')}</span>
                  <textarea className="input" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('kanban.descriptionPlaceholder')} />
                </label>
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('kanban.addTask')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedCard && (
        <TaskDetails card={selectedCard} collaborators={Array.isArray(project.members) ? project.members : []} onClose={() => setSelectedCard(null)} onUpdate={() => loadCards()} onRefresh={async () => { await loadCards(); const updatedCards = await getKanbanCards(project.id); const refreshedCard = updatedCards.find(c => c.id === selectedCard.id); if (refreshedCard) setSelectedCard(refreshedCard); }} />
      )}

      <div className="kanban">
        {columnsWithCards.map(({ column, cards: columnCards }) => (
          <div key={column.key} className="kanban-col" draggable onDragStart={() => handleColumnDragStart(column.key)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleColumnDrop(column.key)}>
            <div className="kanban-title">
              <div className="kanban-title-row">
                {editingColumnKey === column.key ? (
                  <input className="input kanban-title-input" type="text" value={editingColumnName} onChange={(e) => setEditingColumnName(e.target.value)} onBlur={() => { handleColumnRename(column.key, editingColumnName); setEditingColumnKey(null); setEditingColumnName(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleColumnRename(column.key, editingColumnName); setEditingColumnKey(null); setEditingColumnName(''); } if (e.key === 'Escape') { setEditingColumnKey(null); setEditingColumnName(''); } }} autoFocus />
                ) : (
                  <button className="kanban-title-btn" type="button" onClick={() => { setEditingColumnKey(column.key); setEditingColumnName(column.name); }}>{column.name}</button>
                )}
                <button className="kanban-col-delete" type="button" onClick={() => handleDeleteColumn(column.key)} disabled={columns.length <= 1} title={t('kanban.deleteColumnAria')}>✕</button>
              </div>
              <span className="kanban-count">({columnCards.length})</span>
            </div>
            <div className="kanban-drop-zone" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.key)}>
              {columnCards.map(card => {
                const descriptionText = stripHtml(card.description);
                const checklistStats = getChecklistStats(card);
                const hasChecklist = checklistStats.total > 0;
                const checklistComplete = hasChecklist && checklistStats.completed === checklistStats.total;
                return (
                  <div key={card.id} className={`kanban-card ${dragOverCardId === card.id ? 'drag-over' : ''}`} draggable onDragStart={(e) => handleDragStart(e, card)} onDragOver={(e) => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const isAfter = e.clientY > rect.top + rect.height / 2; if (dragOverCardId !== card.id) setDragOverCardId(card.id); if (dragOverInsertAfter !== isAfter) setDragOverInsertAfter(isAfter); }} onDragLeave={() => { setDragOverCardId(null); setDragOverInsertAfter(false); }} onDrop={async (e) => { e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const insertAfter = e.clientY > rect.top + rect.height / 2; await applyCardMove(card.status, card.id, insertAfter); setDraggedCard(null); draggedCardRef.current = null; setDragOverCardId(null); setDragOverInsertAfter(false); }} onDragEnd={() => { setDraggedCard(null); draggedCardRef.current = null; setDragOverCardId(null); setDragOverInsertAfter(false); }} onClick={() => handleCardClick(card)}>
                    <div className="card-title-row">
                      <div className="card-title">{card.title || t('kanban.taskFallback')}</div>
                    </div>
                    {descriptionText && (
                      <div className="card-desc">
                        <span className="card-desc-text">{descriptionText}</span>
                      </div>
                    )}
                    <div className="card-meta">
                      {card.dueDate && (
                        <span className="card-due-meta">{`${t('kanban.duePrefix')} ${card.dueDate}`}</span>
                      )}
                      {hasChecklist && (
                        <span
                          className={`card-checklist-progress ${checklistComplete ? 'complete' : ''}`}
                          title={`${checklistStats.completed}/${checklistStats.total} checklist items done`}
                        >
                          <span aria-hidden="true">☑</span> {checklistStats.completed}/{checklistStats.total}
                        </span>
                      )}
                    </div>
                    <div className="kanban-mobile-actions" onClick={(e) => e.stopPropagation()}>
                      {columns.map(col => <button key={col.key} className="kanban-move-btn" disabled={card.status === col.key} onClick={() => handleStatusChange(card.id, col.key)}>{col.name}</button>)}
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="kanban-add-card-btn" type="button" onClick={() => { setAddCardColumn(column.key); setFormData({ ...formData, status: column.key }); setIsModalOpen(true); }}>＋ {t('kanban.addTask') || 'Add task'}</button>
          </div>
        ))}

        <div className="kanban-col kanban-add-col">
          {showAddColumn ? (
            <div className="kanban-add-form">
              <input className="input kanban-add-input" type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder={t('kanban.columnNamePlaceholder')} autoFocus onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); await handleAddColumn(); setShowAddColumn(false); } }} />
              <div className="kanban-add-actions">
                <button className="btn primary" type="button" onClick={async () => { await handleAddColumn(); setShowAddColumn(false); }}>{t('kanban.addColumnButton')}</button>
                <button className="btn ghost" type="button" onClick={() => { setShowAddColumn(false); setNewColumnName(''); }}>{t('common.cancel') || '×'}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="kanban-add-trigger" onClick={() => setShowAddColumn(true)}><span className="chevron">＋</span>{t('kanban.addColumn')}</button>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmDeleteColumn.isOpen} onConfirm={handleConfirmDeleteColumn} onCancel={() => setConfirmDeleteColumn({ isOpen: false, key: null, name: '' })} title={t('kanban.deleteColumnTitle')} message={deleteColumnMessage} />
    </section>
  )
}

