import { useEffect, useRef, useState } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from './ModalPortal'
import { updateKanbanCard, deleteKanbanCard } from '../services/api'
import ConfirmModal from './ConfirmModal'
import { useLanguage } from '../context/LanguageContext'

const PRIORITY_OPTIONS = ['low', 'medium', 'high']

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDescriptionMarkdown(text) {
  if (!text) return ''
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\n/g, '<br />')
}

function normalizeDescriptionHtml(value) {
  if (!value) return ''
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value
  return formatDescriptionMarkdown(value)
}

function normalizeChecklistGroups(card) {
  if (Array.isArray(card.checklistGroups) && card.checklistGroups.length) {
    return card.checklistGroups
  }
  if (Array.isArray(card.checklist) && card.checklist.length) {
    return [{ id: 'default', name: 'Checklist', items: card.checklist }]
  }
  return []
}

function normalizeTags(card) {
  if (Array.isArray(card.tags)) return card.tags
  if (card.label) return [card.label]
  return []
}

function buildLabelFromTags(tags) {
  return tags[0] || ''
}

function normalizeAssignees(card) {
  return Array.isArray(card.assignees) ? card.assignees : []
}

export default function TaskDetails({ card, collaborators = [], onClose, onUpdate, onRefresh }) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [descriptionHtml, setDescriptionHtml] = useState(normalizeDescriptionHtml(card.description || ''))
  const [dueDate, setDueDate] = useState(card.dueDate || '')
  const [tags, setTags] = useState(normalizeTags(card))
  const [priority, setPriority] = useState(card.priority || 'medium')
  const [assignees, setAssignees] = useState(normalizeAssignees(card))
  const [checklistGroups, setChecklistGroups] = useState(normalizeChecklistGroups(card))
  const [checklistInputs, setChecklistInputs] = useState({})
  const [newChecklistName, setNewChecklistName] = useState('')
  const [attachments, setAttachments] = useState(card.attachments || [])
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentLabel, setAttachmentLabel] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [draggedChecklistId, setDraggedChecklistId] = useState(null)
  const [dragOverChecklistId, setDragOverChecklistId] = useState(null)
  const [draggedChecklistGroupId, setDraggedChecklistGroupId] = useState(null)
  const [draggedAttachmentId, setDraggedAttachmentId] = useState(null)
  const [dragOverAttachmentId, setDragOverAttachmentId] = useState(null)
  const [showTags, setShowTags] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showMembersMenu, setShowMembersMenu] = useState(false)
  const [showFormatToolbar, setShowFormatToolbar] = useState(false)
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    groupId: null,
    itemId: null,
    attachmentId: null
  })
  const descriptionRef = useRef(null)
  const dateInputRef = useRef(null)
  const priorityLabelMap = {
    low: t('task.priorityLow'),
    medium: t('task.priorityMedium'),
    high: t('task.priorityHigh')
  }

  useLockBodyScroll(true)

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || '')
    setDescriptionHtml(normalizeDescriptionHtml(card.description || ''))
    setDueDate(card.dueDate || '')
    setTags(normalizeTags(card))
    setPriority(card.priority || 'medium')
    setAssignees(normalizeAssignees(card))
    setChecklistGroups(normalizeChecklistGroups(card))
    setAttachments(card.attachments || [])
    setChecklistInputs({})
    setNewChecklistName('')
    setAttachmentUrl('')
    setAttachmentLabel('')
    setEditingChecklistId(null)
    setEditingChecklistText('')
    setDraggedChecklistId(null)
    setDragOverChecklistId(null)
    setDraggedChecklistGroupId(null)
    setDraggedAttachmentId(null)
    setDragOverAttachmentId(null)
    setShowTags(false)
    setShowChecklist(false)
    setShowAttachments(false)
    setShowPriorityMenu(false)
    setShowMembersMenu(false)
    setShowFormatToolbar(false)
    setNewTag('')
    setConfirmState({
      isOpen: false,
      action: null,
      title: '',
      message: '',
      groupId: null,
      itemId: null,
      attachmentId: null
    })
    if (descriptionRef.current) {
      descriptionRef.current.innerHTML = normalizeDescriptionHtml(card.description || '')
    }
  }, [card.id])

  async function handleSave(overrides = {}) {
    setIsSaving(true)
    try {
      const nextTags = overrides.tags ?? tags
      const nextPriority = overrides.priority ?? priority
      const nextAssignees = overrides.assignees ?? assignees
      const nextChecklistGroups = overrides.checklistGroups ?? checklistGroups
      const nextAttachments = overrides.attachments ?? attachments
      const nextDueDate = overrides.dueDate ?? dueDate
      const nextDescription = overrides.description ?? description
      const nextTitle = overrides.title ?? title
      await updateKanbanCard(card.id, {
        title: nextTitle,
        description: nextDescription,
        label: buildLabelFromTags(nextTags),
        dueDate: nextDueDate,
        checklistGroups: nextChecklistGroups,
        tags: nextTags,
        priority: nextPriority,
        assignees: nextAssignees,
        attachments: nextAttachments
      })
      if (onRefresh) {
        onRefresh()
      } else if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTask() {
    await deleteKanbanCard(card.id)
    if (onUpdate) onUpdate()
    onClose()
  }

  async function deleteChecklistGroup(groupId) {
    const updatedGroups = checklistGroups.filter(group => group.id !== groupId)
    setChecklistGroups(updatedGroups)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function deleteChecklistItem(groupId, itemId) {
    const updatedGroups = checklistGroups.map(group => {
      if (group.id !== groupId) return group
      const nextItems = group.items.filter(item => item.id !== itemId)
      return { ...group, items: nextItems }
    })
    setChecklistGroups(updatedGroups)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function deleteAttachment(attachmentId) {
    const updatedAttachments = attachments.filter(item => item.id !== attachmentId)
    setAttachments(updatedAttachments)
    await handleSave({ attachments: updatedAttachments })
  }

  function handleDelete() {
    setConfirmState({
      isOpen: true,
      action: 'task',
      title: t('task.deleteTask'),
      message: t('task.deleteTaskMessage'),
      groupId: null,
      itemId: null,
      attachmentId: null
    })
  }

  async function handleAddChecklistGroup() {
    const name = newChecklistName.trim()
    if (!name) return
    const updatedGroups = [
      ...checklistGroups,
      { id: `${Date.now()}`, name, items: [] }
    ]
    setChecklistGroups(updatedGroups)
    setNewChecklistName('')
    setShowChecklist(false)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function handleAddChecklistItem(groupId) {
    const value = (checklistInputs[groupId] || '').trim()
    if (!value) return
    const updatedGroups = checklistGroups.map(group => {
      if (group.id !== groupId) return group
      const nextItems = [...group.items, { id: Date.now(), text: value, completed: false }]
      return { ...group, items: nextItems }
    })
    setChecklistGroups(updatedGroups)
    setChecklistInputs((prev) => ({ ...prev, [groupId]: '' }))
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function toggleChecklistItem(groupId, itemId) {
    const updatedGroups = checklistGroups.map(group => {
      if (group.id !== groupId) return group
      const nextItems = group.items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
      return { ...group, items: nextItems }
    })
    setChecklistGroups(updatedGroups)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function handleAttachmentReorder(targetId) {
    if (!draggedAttachmentId || draggedAttachmentId === targetId) return
    const items = [...attachments]
    const fromIndex = items.findIndex(item => item.id === draggedAttachmentId)
    const toIndex = items.findIndex(item => item.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    setAttachments(items)
    await handleSave({ attachments: items })
  }

  async function handleAttachmentDropToEnd() {
    if (!draggedAttachmentId) return
    const items = [...attachments]
    const fromIndex = items.findIndex(item => item.id === draggedAttachmentId)
    if (fromIndex === -1) return
    const [moved] = items.splice(fromIndex, 1)
    items.push(moved)
    setAttachments(items)
    await handleSave({ attachments: items })
  }

  function removeChecklistItem(groupId, item) {
    setConfirmState({
      isOpen: true,
      action: 'checklist-item',
      title: t('task.deleteChecklistItem'),
      message: t('task.deleteChecklistItemMessage').replace('{item}', item.text),
      groupId,
      itemId: item.id,
      attachmentId: null
    })
  }

  async function handleChecklistReorder(groupId, targetId) {
    if (!draggedChecklistId || draggedChecklistId === targetId) return
    if (!draggedChecklistGroupId || draggedChecklistGroupId !== groupId) return
    const updatedGroups = checklistGroups.map(group => {
      if (group.id !== groupId) return group
      const items = [...group.items]
      const fromIndex = items.findIndex(item => item.id === draggedChecklistId)
      const toIndex = items.findIndex(item => item.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return group
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { ...group, items }
    })
    setChecklistGroups(updatedGroups)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  async function handleChecklistDropToEnd(groupId) {
    if (!draggedChecklistId || draggedChecklistGroupId !== groupId) return
    const updatedGroups = checklistGroups.map(group => {
      if (group.id !== groupId) return group
      const items = [...group.items]
      const fromIndex = items.findIndex(item => item.id === draggedChecklistId)
      if (fromIndex === -1) return group
      const [moved] = items.splice(fromIndex, 1)
      items.push(moved)
      return { ...group, items }
    })
    setChecklistGroups(updatedGroups)
    await handleSave({ checklistGroups: updatedGroups })
    if (onRefresh) onRefresh()
  }

  function handleDeleteChecklistGroup(group) {
    setConfirmState({
      isOpen: true,
      action: 'checklist-group',
      title: t('task.deleteChecklistGroupTitle'),
      message: t('task.deleteChecklistGroupMessage').replace('{group}', group.name),
      groupId: group.id,
      itemId: null,
      attachmentId: null
    })
  }

  function startEditChecklistItem(item) {
    setEditingChecklistId(item.id)
    setEditingChecklistText(item.text)
  }

  async function saveEditChecklistItem() {
    if (!editingChecklistId) return
    const trimmed = editingChecklistText.trim()
    if (!trimmed) {
      setEditingChecklistId(null)
      setEditingChecklistText('')
      return
    }

    const updatedGroups = checklistGroups.map(group => {
      if (!group.items.some(item => item.id === editingChecklistId)) return group
      const nextItems = group.items.map(item =>
        item.id === editingChecklistId ? { ...item, text: trimmed } : item
      )
      return { ...group, items: nextItems }
    })

    setChecklistGroups(updatedGroups)
    setEditingChecklistId(null)
    setEditingChecklistText('')

    try {
      await updateKanbanCard(card.id, { checklistGroups: updatedGroups })
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to update checklist item:', err)
    }
  }

  function getGroupProgress(group) {
    if (!group.items.length) return 0
    const completed = group.items.filter(item => item.completed).length
    return Math.round((completed / group.items.length) * 100)
  }

  function applyCommand(command) {
    const editor = descriptionRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, null)
    const nextHtml = editor.innerHTML
    setDescriptionHtml(nextHtml)
    setDescription(nextHtml)
  }

  function handleDescriptionSelection() {
    const editor = descriptionRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      return
    }
    if (!selection.isCollapsed) {
      setShowFormatToolbar(true)
    }
  }

  async function handleAddTag() {
    const trimmed = newTag.trim()
    if (!trimmed) return
    const updatedTags = [...tags, trimmed]
    setTags(updatedTags)
    setNewTag('')
    await handleSave({ tags: updatedTags })
  }

  async function handleAddAttachment() {
    const url = attachmentUrl.trim()
    if (!url) return
    const updatedAttachments = [
      ...attachments,
      { id: `${Date.now()}`, url, label: attachmentLabel.trim() }
    ]
    setAttachments(updatedAttachments)
    setAttachmentUrl('')
    setAttachmentLabel('')
    await handleSave({ attachments: updatedAttachments })
  }

  async function toggleAssignee(member) {
    const exists = assignees.includes(member)
    const updated = exists
      ? assignees.filter((item) => item !== member)
      : [...assignees, member]
    setAssignees(updated)
    await handleSave({ assignees: updated })
  }

  function handleRemoveAttachment(attachment) {
    setConfirmState({
      isOpen: true,
      action: 'attachment',
      title: t('task.deleteAttachmentTitle'),
      message: t('task.deleteAttachmentMessage').replace('{attachment}', attachment.label || attachment.url),
      groupId: null,
      itemId: null,
      attachmentId: attachment.id
    })
  }

  async function handleConfirmDelete() {
    const pending = confirmState
    setConfirmState({
      isOpen: false,
      action: null,
      title: '',
      message: '',
      groupId: null,
      itemId: null,
      attachmentId: null
    })

    if (pending.action === 'task') {
      await deleteTask()
    }
    if (pending.action === 'checklist-group' && pending.groupId) {
      await deleteChecklistGroup(pending.groupId)
    }
    if (pending.action === 'checklist-item' && pending.groupId && pending.itemId) {
      await deleteChecklistItem(pending.groupId, pending.itemId)
    }
    if (pending.action === 'attachment' && pending.attachmentId) {
      await deleteAttachment(pending.attachmentId)
    }
  }

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
            onBlur={() => handleSave({ title })}
            placeholder={t('task.titlePlaceholder')}
          />



          <div className="task-actions">
            <div className="task-action-group">
              <button className="task-action-btn" type="button" onClick={() => setShowTags((value) => !value)}>
                {t('task.tags')}
              </button>
              {showTags && (
                <div className="task-action-menu">
                  <div className="task-action-input">
                    <input
                      className="input"
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                          setShowTags(false)
                        }
                      }}
                      placeholder={t('task.addTagPlaceholder')}
                    />
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={async () => {
                        await handleAddTag()
                        setShowTags(false)
                      }}
                    >
                      {t('common.add')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="task-action-btn"
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            >
              {t('task.dates')}
            </button>
            <button className="task-action-btn" type="button" onClick={() => setShowChecklist((value) => !value)}>
              {t('task.checklist')}
            </button>
            <div className="task-action-group">
              <button className="task-action-btn" type="button" onClick={() => setShowPriorityMenu((value) => !value)}>
                {t('task.priority')}
              </button>
              {showPriorityMenu && (
                <div className="task-action-menu">
                  {PRIORITY_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={async () => {
                        setPriority(option)
                        setShowPriorityMenu(false)
                        await handleSave({ priority: option })
                      }}
                    >
                      {priorityLabelMap[option] || option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="task-action-group">
              <button className="task-action-btn" type="button" onClick={() => setShowMembersMenu((value) => !value)}>
                {t('task.members')}
              </button>
              {showMembersMenu && (
                <div className="task-action-menu task-members-menu">
                  {collaborators.length === 0 ? (
                    <div className="task-members-empty">{t('task.noCollaborators')}</div>
                  ) : (
                    collaborators.map((member) => (
                      <label key={member} className="task-member-option">
                        <input
                          type="checkbox"
                          checked={assignees.includes(member)}
                          onChange={() => toggleAssignee(member)}
                        />
                        <span>{member}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="task-action-btn" type="button" onClick={() => setShowAttachments((value) => !value)}>
              {t('task.attachments')}
            </button>
          </div>


          <input
            ref={dateInputRef}
            className="input task-date-input"
            type="date"
            value={dueDate}
            onChange={async (e) => {
              const next = e.target.value
              setDueDate(next)
              await handleSave({ dueDate: next })
            }}
          />

          <div className="task-section">
            <h4 className="task-section-title">{t('task.description')}</h4>
            <div className="task-description-wrap">
              {showFormatToolbar && (
                <div className="task-format-toolbar">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyCommand('bold')}
                    title={t('task.bold')}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyCommand('underline')}
                    title={t('task.underline')}
                  >
                    U
                  </button>
                </div>
              )}
              <div
                className="task-description editor"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                data-gramm="false"
                ref={descriptionRef}
                onInput={(e) => {
                  const html = e.currentTarget.innerHTML
                  setDescriptionHtml(html)
                  setDescription(html)
                }}
                onFocus={() => {
                  setShowFormatToolbar(true)
                  requestAnimationFrame(() => setShowFormatToolbar(true))
                }}
                onBlur={async () => {
                  await handleSave({ description })
                  setShowFormatToolbar(false)
                }}
                onMouseUp={handleDescriptionSelection}
                onKeyUp={handleDescriptionSelection}
                onMouseDown={() => setShowFormatToolbar(true)}
                data-placeholder={t('task.descriptionPlaceholder')}
              />
            </div>
          </div>

          {(attachments.length > 0 || showAttachments) && (
            <div className="task-section">
              <div className="task-section-row attachment-section-row">
                <h4 className="task-section-title">{t('task.attachments')}</h4>
                {attachments.length > 0 && !showAttachments && (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setShowAttachments(true)}
                  >
                    {t('common.add')}
                  </button>
                )}
              </div>
              {attachments.length > 0 && (
                <div
                  className="attachment-list"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    await handleAttachmentDropToEnd()
                    setDraggedAttachmentId(null)
                    setDragOverAttachmentId(null)
                  }}
                >
                  {attachments.map(item => (
                    <div
                      key={item.id}
                      className={`attachment-item ${dragOverAttachmentId === item.id ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={() => setDraggedAttachmentId(item.id)}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragOverAttachmentId !== item.id) setDragOverAttachmentId(item.id)
                      }}
                      onDragLeave={() => setDragOverAttachmentId(null)}
                      onDrop={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        await handleAttachmentReorder(item.id)
                        setDraggedAttachmentId(null)
                        setDragOverAttachmentId(null)
                      }}
                      onDragEnd={() => {
                        setDraggedAttachmentId(null)
                        setDragOverAttachmentId(null)
                      }}
                    >
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.label || item.url}
                      </a>
                      <button type="button" onClick={() => handleRemoveAttachment(item)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {showAttachments && (
                <div className="task-inline-form">
                  <input
                    className="input"
                    type="text"
                    value={attachmentLabel}
                    onChange={(e) => setAttachmentLabel(e.target.value)}
                    placeholder={t('task.attachmentLabelPlaceholder')}
                  />
                  <input
                    className="input"
                    type="text"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <button className="btn ghost" type="button" onClick={handleAddAttachment}>{t('common.add')}</button>
                </div>
              )}
            </div>
          )}

          {(checklistGroups.length > 0 || showChecklist) && (
            <div className="task-section">
              <h4 className="task-section-title">{t('task.checklist')}</h4>

              {showChecklist && (
                <div className="checklist-group-create">
                  <input
                    className="input"
                    type="text"
                    value={newChecklistName}
                    onChange={(e) => setNewChecklistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddChecklistGroup()
                      }
                    }}
                    placeholder={t('task.newChecklistName')}
                  />
                  <button className="btn ghost" type="button" onClick={handleAddChecklistGroup}>
                    {t('task.addChecklist')}
                  </button>
                </div>
              )}

              {checklistGroups.map(group => (
                <div key={group.id} className="checklist-group">
                  <div className="checklist-group-header">
                    <h5>{group.name === 'Checklist' ? t('task.checklist') : group.name}</h5>
                    <div className="checklist-group-meta">
                      <span className="task-checklist-progress">{getGroupProgress(group)}%</span>
                      <button
                        className="checklist-group-delete"
                        type="button"
                        onClick={() => handleDeleteChecklistGroup(group)}
                        title={t('task.deleteChecklist')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div
                    className="checklist-items"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault()
                      await handleChecklistDropToEnd(group.id)
                      setDraggedChecklistId(null)
                      setDragOverChecklistId(null)
                      setDraggedChecklistGroupId(null)
                    }}
                  >
                    {group.items.map(item => (
                      <div
                        key={item.id}
                        className={`checklist-item ${dragOverChecklistId === item.id ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={() => {
                          setDraggedChecklistId(item.id)
                          setDraggedChecklistGroupId(group.id)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (dragOverChecklistId !== item.id) setDragOverChecklistId(item.id)
                        }}
                        onDragLeave={() => setDragOverChecklistId(null)}
                        onDrop={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          await handleChecklistReorder(group.id, item.id)
                          setDraggedChecklistId(null)
                          setDragOverChecklistId(null)
                          setDraggedChecklistGroupId(null)
                        }}
                        onDragEnd={() => {
                          setDraggedChecklistId(null)
                          setDragOverChecklistId(null)
                          setDraggedChecklistGroupId(null)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(group.id, item.id)}
                          className="checklist-checkbox"
                        />
                        {editingChecklistId === item.id ? (
                          <input
                            className="checklist-input"
                            type="text"
                            value={editingChecklistText}
                            onChange={(e) => setEditingChecklistText(e.target.value)}
                            onBlur={saveEditChecklistItem}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditChecklistItem()
                              if (e.key === 'Escape') {
                                setEditingChecklistId(null)
                                setEditingChecklistText('')
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`checklist-text ${item.completed ? 'completed' : ''}`}
                            onClick={() => startEditChecklistItem(item)}
                            title={t('task.clickToEdit')}
                          >
                            {item.text}
                          </span>
                        )}
                        <button
                          className="checklist-delete"
                          onClick={() => removeChecklistItem(group.id, item)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="checklist-input-wrapper">
                    <input
                      type="text"
                      value={checklistInputs[group.id] || ''}
                      onChange={(e) =>
                        setChecklistInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddChecklistItem(group.id)
                        }
                      }}
                      placeholder={t('task.addChecklistItemPlaceholder')}
                      className="checklist-input"
                    />
                    <button
                      onClick={() => handleAddChecklistItem(group.id)}
                      className="task-add-item"
                    >
                      {t('task.addItem')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}


          <div className="task-meta">
            {tags.length > 0 && <span className="task-label">{tags[0]}</span>}
            {priority && <span className={`task-priority ${priority}`}>{priorityLabelMap[priority] || priority}</span>}
            {assignees.length > 0 && (
              <span className="task-assignees-meta">
                {t('task.assigned')}: {assignees.join(', ')}
              </span>
            )}
            {dueDate && <span className="task-due">{dueDate}</span>}
            {isSaving && <span className="task-saving">{t('task.saving')}</span>}
          </div>

          <div className="task-footer">
            <button className="task-delete-icon" onClick={handleDelete} title={t('task.deleteTaskAria')}>🗑</button>
          </div>
        </div>
      </div>
    </div>
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onConfirm={handleConfirmDelete}
      onCancel={() => setConfirmState({
        isOpen: false,
        action: null,
        title: '',
        message: '',
        groupId: null,
        itemId: null,
        attachmentId: null
      })}
      title={confirmState.title}
      message={confirmState.message}
    />
    </ModalPortal>
  )
}
