import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ConfirmModal from '../components/ConfirmModal'
import { getCurrentWeekPlan, getWeekPlan, saveWeekPlan } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const UI_DAYS = [...DAYS, 'reflection']
const TIME_BLOCKS = ['anytime', 'morning', 'afternoon', 'evening', 'night']
const PRIORITIES = ['high', 'medium', 'low']
const DEFAULT_REFLECTION = { wins: '', lessons: '', nextWeek: '' }

const createEmptyWeekPlan = () => DAYS.map(day => ({ day, tasks: [], notes: '', focus: '' }))

const isWeekKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

function normalizeWeekPlan(plan) {
  if (!Array.isArray(plan) || plan.length === 0) return createEmptyWeekPlan()
  const byDay = new Map(plan.map(entry => [entry.day, entry]))
  return createEmptyWeekPlan().map(entry => {
    const existing = byDay.get(entry.day)
    if (!existing) return entry
    return {
      day: entry.day,
      tasks: Array.isArray(existing.tasks) ? existing.tasks : [],
      notes: typeof existing.notes === 'string' ? existing.notes : '',
      focus: typeof existing.focus === 'string' ? existing.focus : ''
    }
  })
}

function parseWeekPayload(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const days = normalizeWeekPlan(payload.days || payload.plan || [])
    const reflection = { ...DEFAULT_REFLECTION, ...(payload.reflection || {}) }
    return { days, reflection }
  }

  return { days: normalizeWeekPlan(payload), reflection: DEFAULT_REFLECTION }
}

function normalizeTaskBlock(block) {
  return TIME_BLOCKS.includes(block) ? block : 'anytime'
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatRichTextValue(text) {
  if (!text) return ''
  const escaped = escapeHtml(text)
  return escaped.replace(/\n/g, '<br />')
}

function normalizeRichTextValue(value) {
  if (!value) return ''
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value
  return formatRichTextValue(value)
}

function formatWeekRange(weekKey, locale) {
  if (!weekKey || !isWeekKey(weekKey)) return weekKey || ''
  const [year, month, day] = weekKey.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startLabel = start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

function shiftWeekKey(weekKey, deltaWeeks) {
  if (!isWeekKey(weekKey)) return weekKey
  const [year, month, day] = weekKey.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  start.setDate(start.getDate() + deltaWeeks * 7)
  const dayIndex = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayIndex)
  const y = start.getFullYear()
  const m = String(start.getMonth() + 1).padStart(2, '0')
  const d = String(start.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7
}

export default function WeekPlannerPage() {
  const { t, langKey } = useLanguage()
  const [weekPlan, setWeekPlan] = useState(createEmptyWeekPlan())
  const [selectedDay, setSelectedDay] = useState(0)
  const [taskInput, setTaskInput] = useState('')
  const [taskBlock, setTaskBlock] = useState('anytime')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [activeWeekKey, setActiveWeekKey] = useState('')
  const [currentWeekKey, setCurrentWeekKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [weekReflection, setWeekReflection] = useState(DEFAULT_REFLECTION)
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    dayIndex: null,
    taskId: null,
    taskText: ''
  })
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTaskText, setEditingTaskText] = useState('')
  const skipTaskSaveRef = useRef(false)
  const [showFocusFormatToolbar, setShowFocusFormatToolbar] = useState(false)
  const focusEditorRef = useRef(null)

  useLockBodyScroll(confirmDelete.isOpen)

  useEffect(() => {
    const requestedWeek = searchParams.get('week') || ''
    loadWeekPlanner(requestedWeek)
  }, [searchParams])

  useEffect(() => {
    if (!activeWeekKey) return
    const interval = setInterval(() => {
      refreshActiveWeek(activeWeekKey)
    }, 15000)

    return () => clearInterval(interval)
  }, [activeWeekKey])

  useEffect(() => {
    setShowFocusFormatToolbar(false)
    const editor = focusEditorRef.current
    if (!editor) return
    const normalizedFocus = normalizeRichTextValue((weekPlan[selectedDay] && weekPlan[selectedDay].focus) || '')
    if (editor.innerHTML !== normalizedFocus) {
      editor.innerHTML = normalizedFocus
    }
  }, [selectedDay, activeWeekKey])

  async function loadWeekPlanner(requestedWeek = '') {
    setIsLoading(true)
    try {
      const current = await getCurrentWeekPlan()
      const currentKey = current && current.weekKey ? current.weekKey : ''
      setCurrentWeekKey(currentKey)
      const targetKey = requestedWeek || currentKey
      setActiveWeekKey(targetKey)
      if (targetKey && targetKey !== currentKey) {
        const data = await getWeekPlan(targetKey)
        const parsed = parseWeekPayload(data.plan)
        setWeekPlan(parsed.days)
        setWeekReflection(parsed.reflection)
        setSelectedDay(0)
      } else {
        const parsed = parseWeekPayload(current.plan)
        setWeekPlan(parsed.days)
        setWeekReflection(parsed.reflection)
        setSelectedDay(getTodayIndex())
      }
    } catch (error) {
      console.error('Failed to load week planner:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadWeekByKey(weekKey) {
    if (!weekKey) return
    setActiveWeekKey(weekKey)
    setSelectedDay(weekKey === currentWeekKey ? getTodayIndex() : 0)
    try {
      const data = await getWeekPlan(weekKey)
      const parsed = parseWeekPayload(data.plan)
      setWeekPlan(parsed.days)
      setWeekReflection(parsed.reflection)
      if (weekKey === currentWeekKey) {
        setSearchParams({})
      } else {
        setSearchParams({ week: weekKey })
      }
    } catch (error) {
      console.error('Failed to load selected week:', error)
    }
  }

  async function refreshActiveWeek(weekKey) {
    try {
      const data = await getWeekPlan(weekKey)
      const parsed = parseWeekPayload(data.plan)
      setWeekPlan(parsed.days)
      setWeekReflection(parsed.reflection)
    } catch (error) {
      console.error('Failed to refresh week plan:', error)
    }
  }

  function goToWeek(deltaWeeks) {
    const baseKey = activeWeekKey || currentWeekKey
    if (!baseKey) return
    loadWeekByKey(shiftWeekKey(baseKey, deltaWeeks))
  }

  async function saveChanges(updatedPlan) {
    if (!activeWeekKey) return
    try {
      await saveWeekPlan(activeWeekKey, { days: updatedPlan, reflection: weekReflection })
    } catch (error) {
      console.error('Failed to save week plan:', error)
    }
  }

  function addTask() {
    if (!taskInput.trim()) return
    if (selectedDay >= DAYS.length) return
    const updated = [...weekPlan]
    updated[selectedDay].tasks.push({
      id: Date.now(),
      text: taskInput,
      done: false,
      block: taskBlock,
      priority: taskPriority
    })
    setWeekPlan(updated)
    setTaskInput('')
    saveChanges(updated)
  }

  function toggleTask(dayIndex, taskId) {
    if (dayIndex >= DAYS.length) return
    const updated = [...weekPlan]
    const task = updated[dayIndex].tasks.find(t => t.id === taskId)
    if (task) {
      task.done = !task.done
      setWeekPlan(updated)
      saveChanges(updated)
    }
  }

  function deleteTask(dayIndex, taskId) {
    if (dayIndex >= DAYS.length) return
    const updated = [...weekPlan]
    updated[dayIndex].tasks = updated[dayIndex].tasks.filter(t => t.id !== taskId)
    setWeekPlan(updated)
    saveChanges(updated)
  }

  function handleDeleteTask(dayIndex, taskId) {
    const task = weekPlan[dayIndex]?.tasks.find(t => t.id === taskId)
    setConfirmDelete({
      isOpen: true,
      dayIndex,
      taskId,
      taskText: task?.text || t('week.thisTask')
    })
  }

  function confirmDeleteTask() {
    if (confirmDelete.dayIndex === null || confirmDelete.taskId === null) return
    deleteTask(confirmDelete.dayIndex, confirmDelete.taskId)
    setConfirmDelete({ isOpen: false, dayIndex: null, taskId: null, taskText: '' })
  }


  function moveTask(dayIndex, taskId, targetDayIndex) {
    if (dayIndex >= DAYS.length || targetDayIndex >= DAYS.length) return
    if (dayIndex === targetDayIndex) return
    const updated = [...weekPlan]
    const taskIndex = updated[dayIndex].tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return
    const [task] = updated[dayIndex].tasks.splice(taskIndex, 1)
    updated[targetDayIndex].tasks.push(task)
    setWeekPlan(updated)
    saveChanges(updated)
  }

  function startEditTask(task) {
    setEditingTaskId(task.id)
    setEditingTaskText(task.text || '')
  }

  function saveEditTask(dayIndex) {
    if (editingTaskId == null || dayIndex >= DAYS.length) return
    const trimmed = editingTaskText.trim()
    if (!trimmed) {
      setEditingTaskId(null)
      setEditingTaskText('')
      return
    }
    const updated = weekPlan.map((day, index) => {
      if (index !== dayIndex) return day
      return {
        ...day,
        tasks: day.tasks.map((task) => (
          task.id === editingTaskId ? { ...task, text: trimmed } : task
        ))
      }
    })
    setWeekPlan(updated)
    setEditingTaskId(null)
    setEditingTaskText('')
    saveChanges(updated)
  }

  function updateTaskPriority(dayIndex, taskId, priority) {
    if (dayIndex >= DAYS.length) return
    const updated = [...weekPlan]
    const task = updated[dayIndex].tasks.find(t => t.id === taskId)
    if (!task) return
    task.priority = priority
    setWeekPlan(updated)
    saveChanges(updated)
  }

  function updateFocus(dayIndex, focus) {
    if (dayIndex >= DAYS.length) return
    const updated = [...weekPlan]
    updated[dayIndex].focus = focus
    setWeekPlan(updated)
    saveChanges(updated)
  }

  function applyFocusCommand(command) {
    const editor = focusEditorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, null)
    updateFocus(selectedDay, editor.innerHTML)
  }

  function handleFocusSelection() {
    const editor = focusEditorRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return
    if (!selection.isCollapsed) {
      setShowFocusFormatToolbar(true)
    }
  }

  function carryOverUnfinished() {
    if (selectedDay >= DAYS.length) return
    const nextDayIndex = (selectedDay + 1) % 7
    const updated = [...weekPlan]
    const unfinished = updated[selectedDay].tasks.filter(task => !task.done)
    if (unfinished.length === 0) return
    updated[selectedDay].tasks = updated[selectedDay].tasks.filter(task => task.done)
    updated[nextDayIndex].tasks.push(...unfinished)
    setWeekPlan(updated)
    saveChanges(updated)
  }

  function updateReflection(field, value) {
    const next = { ...weekReflection, [field]: value }
    setWeekReflection(next)
    if (!activeWeekKey) return
    saveWeekPlan(activeWeekKey, { days: weekPlan, reflection: next })
  }

  function updateNotes(dayIndex, notes) {
    if (dayIndex >= DAYS.length) return
    const updated = [...weekPlan]
    updated[dayIndex].notes = notes
    setWeekPlan(updated)
    saveChanges(updated)
  }


  const localeByLang = { en: 'en-US', fr: 'fr-FR', de: 'de-DE' }
  const locale = localeByLang[langKey] || 'en-US'
  const dayLabelMap = {
    Monday: t('week.days.monday'),
    Tuesday: t('week.days.tuesday'),
    Wednesday: t('week.days.wednesday'),
    Thursday: t('week.days.thursday'),
    Friday: t('week.days.friday'),
    Saturday: t('week.days.saturday'),
    Sunday: t('week.days.sunday'),
    reflection: t('week.reflection')
  }
  const dayLabel = (day) => dayLabelMap[day] || day
  const blockLabelMap = {
    anytime: t('week.block.anytime'),
    morning: t('week.block.morning'),
    afternoon: t('week.block.afternoon'),
    evening: t('week.block.evening'),
    night: t('week.block.night')
  }
  const priorityLabelMap = {
    high: t('week.priority.high'),
    medium: t('week.priority.medium'),
    low: t('week.priority.low')
  }
  const deleteMessage = t('week.deleteTaskMessage').replace('{task}', confirmDelete.taskText)
  const currentDay = weekPlan[selectedDay] || weekPlan[0]
  const activeWeekLabel = formatWeekRange(activeWeekKey || currentWeekKey, locale)
  const showingCurrentWeek = activeWeekKey === currentWeekKey

  return (
    <section className="page-section active">
      <div className="section-header week-planner-header">
        <h2>{t('week.title')}</h2>
        {showingCurrentWeek ? (
          <span className="week-pill">{t('week.currentWeek')}</span>
        ) : (
          <button className="btn ghost" onClick={() => loadWeekByKey(currentWeekKey)}>
            {t('week.backToCurrent')}
          </button>
        )}
      </div>

      <div className="month-picker">
        <button
          className="month-picker-arrow"
          onClick={() => goToWeek(-1)}
          disabled={!activeWeekKey && !currentWeekKey}
          title={t('week.prevWeek')}
          aria-label={t('week.prevWeek')}
        >
          ‹
        </button>
        <span className="month-picker-label week-picker-label">{activeWeekLabel}</span>
        <button
          className="month-picker-arrow"
          onClick={() => goToWeek(1)}
          disabled={!activeWeekKey && !currentWeekKey}
          title={t('week.nextWeek')}
          aria-label={t('week.nextWeek')}
        >
          ›
        </button>
      </div>

      <div className="week-planner-container">
        <div className="week-sidebar">
          <div className="week-days">
            {UI_DAYS.map((day, index) => (
              <button
                key={day}
                className={`day-btn ${index === DAYS.length ? 'reflection-day' : ''} ${selectedDay === index ? 'active' : ''}`}
                onClick={() => setSelectedDay(index)}
              >
                <span className="day-name">{dayLabel(day)}</span>
                {index < DAYS.length && (
                  <span className="task-count">
                    {weekPlan[index].tasks.filter(t => !t.done).length} {t('week.tasksCount')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="day-details">
          <div className="day-header">
            <h3>{selectedDay < DAYS.length ? dayLabel(currentDay.day) : t('week.reflection')}</h3>
            <div className="day-header-actions">
              {selectedDay < DAYS.length ? (
                <>
                  <span className="completion-rate">
                    {currentDay.tasks.filter(t => t.done).length} {t('week.doneOf')} {currentDay.tasks.length} {t('week.doneLabel')}
                  </span>
                  <button
                    className="btn ghost"
                    onClick={carryOverUnfinished}
                    title={t('week.carryOverTitle')}
                    aria-label={t('week.carryOverTitle')}
                  >
                    {t('week.carryOver')}
                  </button>
                </>
              ) : (
                <span className="completion-rate">{t('week.endOfWeekSummary')}</span>
              )}
            </div>
          </div>

          {selectedDay < DAYS.length && (
            <div className="day-section">
              <h4>{t('week.dailyFocusGoal')}</h4>
              <div className="task-description-wrap">
                {showFocusFormatToolbar && (
                  <div className="task-format-toolbar">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFocusCommand('bold')}
                      title={t('task.bold')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFocusCommand('underline')}
                      title={t('task.underline')}
                    >
                      U
                    </button>
                  </div>
                )}
                <div
                  key={`${activeWeekKey}-${selectedDay}`}
                  className="task-description editor focus-input"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-gramm="false"
                  ref={focusEditorRef}
                  onInput={(e) => updateFocus(selectedDay, e.currentTarget.innerHTML)}
                  onFocus={() => {
                    setShowFocusFormatToolbar(true)
                    requestAnimationFrame(() => setShowFocusFormatToolbar(true))
                  }}
                  onBlur={() => setShowFocusFormatToolbar(false)}
                  onMouseUp={handleFocusSelection}
                  onKeyUp={handleFocusSelection}
                  onMouseDown={() => setShowFocusFormatToolbar(true)}
                  data-placeholder={t('week.focusPlaceholder')}
                />
              </div>
            </div>
          )}

          {selectedDay < DAYS.length ? (
            <div className="day-section">
              <h4>{t('week.dailyTasks')}</h4>
              <div className="task-input-group">
                <input
                  className="input"
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder={t('week.taskPlaceholder')}
                />
                <select
                  className="input task-select"
                  value={taskBlock}
                  onChange={(e) => setTaskBlock(e.target.value)}
                >
                  {TIME_BLOCKS.map((block) => (
                    <option key={block} value={block}>{blockLabelMap[block]}</option>
                  ))}
                </select>
                <div className="priority-select">
                  <span className={`priority-dot ${taskPriority}`}></span>
                  <select
                    className="input task-select"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priorityLabelMap[priority]}</option>
                    ))}
                  </select>
                </div>
                <button className="btn primary" onClick={addTask}>{t('week.addTaskButton')}</button>
              </div>

              {currentDay.tasks.length === 0 ? (
                <p className="history-empty">{t('week.noTasksDay')}</p>
              ) : (
                TIME_BLOCKS.map((block) => {
                  const blockTasks = currentDay.tasks.filter(task => normalizeTaskBlock(task.block) === block)
                  if (blockTasks.length === 0) return null
                  return (
                    <div key={block} className="task-block">
                      <div className="task-block-header">
                        <h5>{blockLabelMap[block]}</h5>
                        <span>{blockTasks.length}</span>
                      </div>
                      <ul className="task-list">
                        {blockTasks.map(task => (
                          <li key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={() => toggleTask(selectedDay, task.id)}
                              className="task-checkbox"
                            />
                            <span className={`priority-dot ${task.priority || 'medium'}`}></span>
                            {editingTaskId === task.id ? (
                              <input
                                className="checklist-input task-text-input"
                                type="text"
                                value={editingTaskText}
                                onChange={(e) => setEditingTaskText(e.target.value)}
                                onBlur={() => {
                                  if (skipTaskSaveRef.current) {
                                    skipTaskSaveRef.current = false
                                    return
                                  }
                                  saveEditTask(selectedDay)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.currentTarget.blur()
                                  }
                                  if (e.key === 'Escape') {
                                    skipTaskSaveRef.current = true
                                    setEditingTaskId(null)
                                    setEditingTaskText('')
                                    e.currentTarget.blur()
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="task-text"
                                onClick={() => startEditTask(task)}
                                title={t('task.clickToEdit')}
                              >
                                {task.text}
                              </span>
                            )}
                            <span className={`priority-label ${task.priority || 'medium'}`}>
                              {priorityLabelMap[task.priority || 'medium']}
                            </span>
                            <div className="task-actions-inline">
                              <select
                                className="input task-priority"
                                value={task.priority || 'medium'}
                                onChange={(e) => updateTaskPriority(selectedDay, task.id, e.target.value)}
                              >
                                {PRIORITIES.map((priority) => (
                                  <option key={priority} value={priority}>{priorityLabelMap[priority]}</option>
                                ))}
                              </select>
                              <select
                                className="input task-move"
                                value={selectedDay}
                                onChange={(e) => moveTask(selectedDay, task.id, Number(e.target.value))}
                              >
                                {DAYS.map((day, index) => (
                                  <option key={day} value={index}>{dayLabel(day)}</option>
                                ))}
                              </select>
                              <button
                                className="icon-btn"
                                onClick={() => handleDeleteTask(selectedDay, task.id)}
                              >
                                ×
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="day-section">
              <h4>{t('week.reflectionTitle')}</h4>
              <div className="reflection-grid">
                <div>
                  <label className="reflection-label">{t('week.reflectionWins')}</label>
                  <textarea
                    className="input"
                    value={weekReflection.wins}
                    onChange={(e) => updateReflection('wins', e.target.value)}
                    placeholder={t('week.reflectionWinsPlaceholder')}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="reflection-label">{t('week.reflectionLessons')}</label>
                  <textarea
                    className="input"
                    value={weekReflection.lessons}
                    onChange={(e) => updateReflection('lessons', e.target.value)}
                    placeholder={t('week.reflectionLessonsPlaceholder')}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="reflection-label">{t('week.reflectionNextWeek')}</label>
                  <textarea
                    className="input"
                    value={weekReflection.nextWeek}
                    onChange={(e) => updateReflection('nextWeek', e.target.value)}
                    placeholder={t('week.reflectionNextWeekPlaceholder')}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    rows="4"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedDay < DAYS.length && (
            <div className="day-section">
              <h4>{t('week.notesTitle')}</h4>
              <textarea
                className="input"
                value={currentDay.notes}
                onChange={(e) => updateNotes(selectedDay, e.target.value)}
                placeholder={t('week.notesPlaceholder')}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                rows="5"
              />
            </div>
          )}

        </div>
      </div>
      {isLoading && <p className="week-loading">{t('week.loading')}</p>}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteTask}
        onCancel={() => setConfirmDelete({ isOpen: false, dayIndex: null, taskId: null, taskText: '' })}
        title={t('week.deleteTaskTitle')}
        message={deleteMessage}
      />
    </section>
  )
}
