import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ConfirmModal from '../components/ConfirmModal'
import { getCurrentWeekPlan, getWeekPlan, getWeekPlanHistory, saveWeekPlan } from '../services/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const UI_DAYS = [...DAYS, 'Weekly Reflection']
const TIME_BLOCKS = ['anytime', 'morning', 'afternoon', 'evening', 'night']
const BLOCK_LABELS = { anytime: 'Anytime', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' }
const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]
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

function formatWeekRange(weekKey) {
  if (!weekKey || !isWeekKey(weekKey)) return weekKey || ''
  const [year, month, day] = weekKey.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

function formatWeekStamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7
}

export default function WeekPlannerPage() {
  const [weekPlan, setWeekPlan] = useState(createEmptyWeekPlan())
  const [selectedDay, setSelectedDay] = useState(0)
  const [taskInput, setTaskInput] = useState('')
  const [taskBlock, setTaskBlock] = useState('anytime')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [activeWeekKey, setActiveWeekKey] = useState('')
  const [currentWeekKey, setCurrentWeekKey] = useState('')
  const [weekHistory, setWeekHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [weekReflection, setWeekReflection] = useState(DEFAULT_REFLECTION)
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    dayIndex: null,
    taskId: null,
    taskText: ''
  })

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

  async function loadWeekPlanner(requestedWeek = '') {
    setIsLoading(true)
    try {
      const [current, history] = await Promise.all([
        getCurrentWeekPlan(),
        getWeekPlanHistory()
      ])
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
      const historyWeeks = Array.isArray(history?.weeks) ? history.weeks : []
      const hasCurrent = currentKey && historyWeeks.some(week => week.week_key === currentKey)
      const mergedHistory = hasCurrent
        ? historyWeeks
        : [{ week_key: currentKey, created_at: null, updated_at: null }, ...historyWeeks]
      setWeekHistory(mergedHistory)
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

  function viewAllHistory() {
    navigate('/week-planner/history')
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
      taskText: task?.text || 'this task'
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


  const currentDay = weekPlan[selectedDay] || weekPlan[0]
  const visibleHistory = weekHistory
  const activeWeekLabel = formatWeekRange(activeWeekKey || currentWeekKey)
  const showingCurrentWeek = activeWeekKey === currentWeekKey
  const maxInlineWeeks = 3
  const inlineHistory = visibleHistory.slice(0, maxInlineWeeks)

  return (
    <section className="page-section active">
      <div className="section-header week-planner-header">
        <div>
          <h2>Weekly Planner</h2>
          <p className="week-range">{activeWeekLabel}</p>
        </div>
        {showingCurrentWeek ? (
          <span className="week-pill">Current week</span>
        ) : (
          <button className="btn ghost" onClick={() => loadWeekByKey(currentWeekKey)}>
            Back to current
          </button>
        )}
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
                <span className="day-name">{day}</span>
                {index < DAYS.length && (
                  <span className="task-count">
                    {weekPlan[index].tasks.filter(t => !t.done).length} tasks
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="week-history">
            <div className="history-header">
              <h4>History</h4>
              <span className="history-count">{visibleHistory.length}</span>
            </div>

            <div className="history-list">
              {visibleHistory.length === 0 ? (
                <p className="history-empty">No past weeks yet.</p>
              ) : (
                inlineHistory.map(week => (
                  <button
                    key={week.week_key}
                    className={`history-item ${activeWeekKey === week.week_key ? 'active' : ''}`}
                    onClick={() => loadWeekByKey(week.week_key)}
                  >
                    <span className="history-range">{formatWeekRange(week.week_key)}</span>
                    {week.week_key === currentWeekKey && (
                      <span className="history-tag">Current</span>
                    )}
                    <span className="history-meta">
                      Updated {formatWeekStamp(week.updated_at || week.created_at)}
                    </span>
                  </button>
                ))
              )}
            </div>
            {visibleHistory.length > maxInlineWeeks && (
              <button className="btn ghost history-view-all" onClick={viewAllHistory}>
                View all history
              </button>
            )}
          </div>
        </div>

        <div className="day-details">
          <div className="day-header">
            <h3>{selectedDay < DAYS.length ? currentDay.day : 'Weekly Reflection'}</h3>
            <div className="day-header-actions">
              {selectedDay < DAYS.length ? (
                <>
                  <span className="completion-rate">
                    {currentDay.tasks.filter(t => t.done).length} of {currentDay.tasks.length} done
                  </span>
                  <button
                    className="btn ghost"
                    onClick={carryOverUnfinished}
                    title="Move all unfinished tasks to tomorrow"
                    aria-label="Move all unfinished tasks to tomorrow"
                  >
                    Carry over
                  </button>
                </>
              ) : (
                <span className="completion-rate">End-of-week summary</span>
              )}
            </div>
          </div>

          {selectedDay < DAYS.length && (
            <div className="day-section">
              <h4>Daily Focus Goal</h4>
              <textarea
                className="input focus-input"
                value={currentDay.focus}
                onChange={(e) => updateFocus(selectedDay, e.target.value)}
                placeholder="Main win for today..."
                rows="2"
              />
            </div>
          )}

          {selectedDay < DAYS.length ? (
            <div className="day-section">
              <h4>Daily Tasks</h4>
              <div className="task-input-group">
                <input
                  className="input"
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add a task..."
                />
                <select
                  className="input task-select"
                  value={taskBlock}
                  onChange={(e) => setTaskBlock(e.target.value)}
                >
                  {TIME_BLOCKS.map((block) => (
                    <option key={block} value={block}>{BLOCK_LABELS[block]}</option>
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
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                  </select>
                </div>
                <button className="btn primary" onClick={addTask}>Add</button>
              </div>

              {currentDay.tasks.length === 0 ? (
                <p className="history-empty">No tasks yet for this day.</p>
              ) : (
                TIME_BLOCKS.map((block) => {
                  const blockTasks = currentDay.tasks.filter(task => normalizeTaskBlock(task.block) === block)
                  if (blockTasks.length === 0) return null
                  return (
                    <div key={block} className="task-block">
                      <div className="task-block-header">
                        <h5>{BLOCK_LABELS[block]}</h5>
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
                            <span className="task-text">{task.text}</span>
                            <span className={`priority-label ${task.priority || 'medium'}`}>
                              {(task.priority || 'medium')}
                            </span>
                            <div className="task-actions-inline">
                              <select
                                className="input task-priority"
                                value={task.priority || 'medium'}
                                onChange={(e) => updateTaskPriority(selectedDay, task.id, e.target.value)}
                              >
                                {PRIORITIES.map((priority) => (
                                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                                ))}
                              </select>
                              <select
                                className="input task-move"
                                value={selectedDay}
                                onChange={(e) => moveTask(selectedDay, task.id, Number(e.target.value))}
                              >
                                {DAYS.map((day, index) => (
                                  <option key={day} value={index}>{day}</option>
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
              <h4>Weekly Reflection</h4>
              <div className="reflection-grid">
                <div>
                  <label className="reflection-label">Wins</label>
                  <textarea
                    className="input"
                    value={weekReflection.wins}
                    onChange={(e) => updateReflection('wins', e.target.value)}
                    placeholder="What went well this week?"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="reflection-label">Lessons</label>
                  <textarea
                    className="input"
                    value={weekReflection.lessons}
                    onChange={(e) => updateReflection('lessons', e.target.value)}
                    placeholder="What did you learn?"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="reflection-label">Next Week</label>
                  <textarea
                    className="input"
                    value={weekReflection.nextWeek}
                    onChange={(e) => updateReflection('nextWeek', e.target.value)}
                    placeholder="What do you want to focus on next week?"
                    rows="4"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedDay < DAYS.length && (
            <div className="day-section">
              <h4>Notes</h4>
              <textarea
                className="input"
                value={currentDay.notes}
                onChange={(e) => updateNotes(selectedDay, e.target.value)}
                placeholder="Add notes for this day..."
                rows="5"
              />
            </div>
          )}

        </div>
      </div>
      {isLoading && <p className="week-loading">Loading your planner...</p>}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteTask}
        onCancel={() => setConfirmDelete({ isOpen: false, dayIndex: null, taskId: null, taskText: '' })}
        title="Delete task"
        message={`Are you sure you want to delete "${confirmDelete.taskText}"? This action cannot be undone.`}
      />
    </section>
  )
}
