import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ConfirmModal from '../components/ConfirmModal'
import { getCurrentWeekPlan, saveWeekPlan, getNotes, getTransactions, getMonthlyBudgets } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_REFLECTION = { wins: '', lessons: '', nextWeek: '' }

const createEmptyWeekPlan = () => DAYS.map(day => ({ day, tasks: [], notes: '', focus: '' }))

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

function getDefaultBlock() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'evening'
  return 'night'
}

function formatBlockLabel(block) {
  if (block === 'anytime') return 'Anytime'
  if (block === 'morning') return 'Morning'
  if (block === 'evening') return 'Evening'
  if (block === 'night') return 'Night'
  return 'Anytime'
}

function formatCurrency(value, currency = 'MAD') {
  const numericValue = Number(value)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safeValue)} ${currency}`
}

function isAllZero(data) {
  if (!Array.isArray(data) || data.length === 0) return true
  return data.every(month => {
    const spent = Number(month.spending) || 0
    const saved = Number(month.saved) || 0
    return spent === 0 && saved === 0
  })
}

function getLastN(data, n) {
  if (!Array.isArray(data)) return []
  if (!Number.isFinite(n) || n <= 0) return [...data]
  return data.slice(Math.max(0, data.length - n))
}

function buildSmoothPath(points) {
  if (!Array.isArray(points) || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    let cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    let cp2y = p2.y - (p3.y - p1.y) / 6
    const minY = Math.min(p1.y, p2.y)
    const maxY = Math.max(p1.y, p2.y)

    if (p1.y === p2.y) {
      cp1y = p1.y
      cp2y = p2.y
    } else {
      cp1y = Math.max(minY, Math.min(maxY, cp1y))
      cp2y = Math.max(minY, Math.min(maxY, cp2y))
    }

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t, langKey } = useLanguage()
  const [weekPlan, setWeekPlan] = useState(createEmptyWeekPlan())
  const [weekKey, setWeekKey] = useState('')
  const [weekReflection, setWeekReflection] = useState(DEFAULT_REFLECTION)
  const [notes, setNotes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [monthlyBudgets, setMonthlyBudgets] = useState([])
  const [newTask, setNewTask] = useState('')
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverTaskId, setDragOverTaskId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, taskId: null, taskText: '' })
  const [focusMode, setFocusMode] = useState(true)
  const [activeMonthIndex, setActiveMonthIndex] = useState(null)

  useLockBodyScroll(confirmDelete.isOpen)

  useEffect(() => {
    loadCurrentWeek()
    loadNotes()
    loadTransactions()
    loadMonthlyBudgets()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadCurrentWeek(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [weekKey])

  async function loadCurrentWeek(isSilent = false) {
    try {
      const data = await getCurrentWeekPlan()
      setWeekKey(data.weekKey || '')
      const parsed = parseWeekPayload(data.plan)
      setWeekPlan(parsed.days)
      setWeekReflection(parsed.reflection)
    } catch (error) {
      console.error('Failed to load current week plan:', error)
    }
  }

  async function loadNotes() {
    const data = await getNotes()
    setNotes(data)
  }

  async function loadTransactions() {
    const data = await getTransactions()
    setTransactions(data)
  }

  async function loadMonthlyBudgets() {
    const data = await getMonthlyBudgets()
    setMonthlyBudgets(data)
  }

  async function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    updated[todayIndex].tasks.push({
      id: Date.now(),
      text: newTask.trim(),
      done: false,
      block: getDefaultBlock(),
      priority: 'medium'
    })
    setWeekPlan(updated)
    setNewTask('')
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
  }

  async function handleToggleTask(taskId, done) {
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    const task = updated[todayIndex].tasks.find(t => t.id === taskId)
    if (!task) return
    task.done = done
    setWeekPlan(updated)
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
  }

  function handleDeleteTask(taskId) {
    const todayIndex = getTodayIndex()
    const task = weekPlan[todayIndex]?.tasks.find(t => t.id === taskId)
    setConfirmDelete({
      isOpen: true,
      taskId,
      taskText: task?.text || t('dashboard.thisTask')
    })
  }

  async function confirmDeleteTask() {
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    updated[todayIndex].tasks = updated[todayIndex].tasks.filter(t => t.id !== confirmDelete.taskId)
    setWeekPlan(updated)
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
    setConfirmDelete({ isOpen: false, taskId: null, taskText: '' })
  }

  async function handleTaskReorder(targetTaskId) {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    const tasks = [...updated[todayIndex].tasks]
    const fromIndex = tasks.findIndex(task => task.id === draggedTaskId)
    const toIndex = tasks.findIndex(task => task.id === targetTaskId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = tasks.splice(fromIndex, 1)
    tasks.splice(toIndex, 0, moved)
    updated[todayIndex] = { ...updated[todayIndex], tasks }
    setWeekPlan(updated)
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
  }

  async function handleTaskDropToEnd() {
    if (!draggedTaskId) return
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    const tasks = [...updated[todayIndex].tasks]
    const fromIndex = tasks.findIndex(task => task.id === draggedTaskId)
    if (fromIndex === -1) return
    const [moved] = tasks.splice(fromIndex, 1)
    tasks.push(moved)
    updated[todayIndex] = { ...updated[todayIndex], tasks }
    setWeekPlan(updated)
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
  }

  function getTodayIndex() {
    const dayIndex = (new Date().getDay() + 6) % 7
    return dayIndex
  }


  async function moveTask(taskId, targetDayIndex) {
    const todayIndex = getTodayIndex()
    if (targetDayIndex === todayIndex) return
    const updated = [...weekPlan]
    const taskIndex = updated[todayIndex].tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return
    const [task] = updated[todayIndex].tasks.splice(taskIndex, 1)
    updated[targetDayIndex].tasks.push(task)
    setWeekPlan(updated)
    await saveWeekPlan(weekKey, { days: updated, reflection: weekReflection })
  }

  const recentNotes = notes.slice(0, 2)
  const localeByLang = { en: 'en-US', fr: 'fr-FR', de: 'de-DE' }
  const locale = localeByLang[langKey] || 'en-US'
  const dayLabelMap = {
    Monday: t('week.days.monday'),
    Tuesday: t('week.days.tuesday'),
    Wednesday: t('week.days.wednesday'),
    Thursday: t('week.days.thursday'),
    Friday: t('week.days.friday'),
    Saturday: t('week.days.saturday'),
    Sunday: t('week.days.sunday')
  }
  const dayLabel = (day) => dayLabelMap[day] || day

  const getMonthlySpending = (monthsCount = 12) => {
    const now = new Date()
    const months = []
    const budgetMap = monthlyBudgets.reduce((acc, budget) => {
      acc[`${budget.year}-${budget.month}`] = budget.budget
      return acc
    }, {})
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        name: date.toLocaleString(locale, { month: 'short' }),
        spending: 0,
        budget: budgetMap[`${date.getFullYear()}-${date.getMonth() + 1}`] ?? null
      })
    }
    
    // Calculate spending per month
    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      const txYear = txDate.getFullYear()
      const txMonth = txDate.getMonth() + 1
      
      const monthData = months.find(m => m.year === txYear && m.month === txMonth)
      if (monthData) {
        monthData.spending += Number(tx.amount) || 0
      }
    })

    months.forEach(month => {
      month.saved = month.budget !== null ? Math.max(month.budget - month.spending, 0) : null
    })
    
    return months
  }

  const allMonthlyData = getMonthlySpending(12)
  const monthlyData = focusMode ? getLastN(allMonthlyData, 6) : allMonthlyData
  const hasNoMoneyData = isAllZero(allMonthlyData)
  const dataMax = Math.max(...monthlyData.map(m => Math.max(m.spending, m.saved ?? 0)), 0)
  const chartMaxValue = dataMax > 0 ? dataMax * 1.15 : 1
  const chartWidth = 100
  const chartHeight = 44
  const toY = (value) => chartHeight - (value / chartMaxValue) * chartHeight
  const toX = (index) => (monthlyData.length <= 1 ? 0 : (index / (monthlyData.length - 1)) * chartWidth)
  const spentPlotPoints = monthlyData.map((month, index) => ({ x: toX(index), y: toY(month.spending) }))
  const savedPlotPoints = monthlyData.map((month, index) => ({ x: toX(index), y: toY(month.saved ?? 0) }))
  const spentPath = buildSmoothPath(spentPlotPoints)
  const savedPath = buildSmoothPath(savedPlotPoints)
  const savedAreaPath = savedPlotPoints.length > 0
    ? `${savedPath} L ${savedPlotPoints[savedPlotPoints.length - 1].x} ${chartHeight} L ${savedPlotPoints[0].x} ${chartHeight} Z`
    : ''

  const todayIndex = getTodayIndex()
  const todayTasks = weekPlan[todayIndex]?.tasks || []
  const todayLabel = dayLabel(DAYS[todayIndex])
  const deleteMessage = t('dashboard.deleteTaskMessage').replace('{task}', confirmDelete.taskText)

  return (
    <section className="page-section active">
      <div className="hero-text-section">
        <h1 className="hero-main-text">{t('dashboard.welcomeTitle')}</h1>
        <p className="hero-sub-text">{t('dashboard.welcomeSubtitle')}</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title">{t('dashboard.todayPlan')} · {todayLabel}</div>
          <ul
            className="checklist"
            id="tasks-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              await handleTaskDropToEnd()
              setDraggedTaskId(null)
              setDragOverTaskId(null)
            }}
          >
            {todayTasks.length === 0 ? (
              <div className="empty-state">{t('dashboard.noTasks')}</div>
            ) : (
              todayTasks.map(task => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverTaskId !== task.id) setDragOverTaskId(task.id)
                  }}
                  onDragLeave={() => setDragOverTaskId(null)}
                  onDrop={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    await handleTaskReorder(task.id)
                    setDraggedTaskId(null)
                    setDragOverTaskId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedTaskId(null)
                    setDragOverTaskId(null)
                  }}
                  className={dragOverTaskId === task.id ? 'drag-over' : ''}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                    />
                    <span className={`priority-dot ${task.priority || 'medium'}`}></span>
                    <span>{task.text}</span>
                  </label>
                  <div className="task-actions-inline">
                    <button className="icon-btn" onClick={() => handleDeleteTask(task.id)}>✕</button>
                  </div>
                </li>
              ))
            )}
          </ul>
          <form className="task-add-form" onSubmit={handleAddTask}>
            <input
              className="input"
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder={t('dashboard.addTaskPlaceholder')}
            />
            <button className="btn ghost" type="submit">{t('dashboard.addTaskButton')}</button>
          </form>
        </div>
        <div className="card">
          <div className="card-title">{t('dashboard.moneySnapshot')}</div>
          <div className="money-line-chart-wrap">
            <div className="money-line-legend">
              <div className="money-legend-items">
                <span className="money-legend-item">
                  <span className="money-legend-dot money-legend-dot-spent"></span>
                  {t('dashboard.spent')}
                </span>
                <span className="money-legend-item">
                  <span className="money-legend-dot money-legend-dot-saved"></span>
                  {t('dashboard.saved')}
                </span>
              </div>
              <button
                className="btn ghost money-focus-toggle"
                type="button"
                onClick={() => setFocusMode(current => !current)}
              >
                {focusMode ? 'Show all' : 'Focus: last 6'}
              </button>
            </div>
            <div className="money-line-chart-container">
              <svg className="money-line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" aria-label={t('dashboard.moneyTrendAria')}>
                <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} className="money-line-axis" />
                {!hasNoMoneyData && (
                  <>
                    <path
                      className="money-area saved-area"
                      d={savedAreaPath}
                      fill="#73b58e"
                      fillOpacity="0.2"
                      stroke="none"
                    />
                    <path className="money-line saved-line" d={savedPath}></path>
                    <path className="money-line spent-line" d={spentPath}></path>
                    {monthlyData.map((month, idx) => (
                      <g
                        key={idx}
                        onMouseEnter={() => setActiveMonthIndex(idx)}
                        onMouseLeave={() => setActiveMonthIndex(null)}
                      >
                        <title>{`${month.name}\n${t('dashboard.spent')}: ${formatCurrency(month.spending, 'MAD')}\n${t('dashboard.saved')}: ${formatCurrency(month.saved ?? 0, 'MAD')}`}</title>
                        <circle
                          className="money-point spent-point"
                          cx={toX(idx)}
                          cy={toY(month.spending)}
                          r={activeMonthIndex === idx ? 3.5 : 1.6}
                        />
                        <circle
                          className="money-point saved-point"
                          cx={toX(idx)}
                          cy={toY(month.saved ?? 0)}
                          r={activeMonthIndex === idx ? 3.5 : 1.6}
                        />
                      </g>
                    ))}
                  </>
                )}
              </svg>
            </div>
            <div className="money-month-grid">
              {monthlyData.map((month, idx) => (
                <div key={idx} className="money-month-item">
                  <div className="month-label">{month.name}</div>
                  <div className="month-amount">{t('dashboard.monthSpent')}: {formatCurrency(month.spending, 'MAD')}</div>
                  <div className="month-amount month-saved">{t('dashboard.monthSaved')}: {formatCurrency(month.saved ?? 0, 'MAD')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('dashboard.reminders')}</div>
          {recentNotes.length === 0 ? (
            <div className="empty-state">{t('dashboard.noReminders')}</div>
          ) : (
            recentNotes.map(note => (
              <div key={note.id} className="note">
                <div className="note-title">{note.title}</div>
                <div className="note-body">{note.content.substring(0, 50)}...</div>
              </div>
            ))
          )}
          <div className="notes-footer">
            <button className="notes-link" onClick={() => navigate('/notes')}>{t('dashboard.manageReminders')}</button>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteTask}
        onCancel={() => setConfirmDelete({ isOpen: false, taskId: null, taskText: '' })}
        title={t('dashboard.deleteTaskTitle')}
        message={deleteMessage}
      />
    </section>
  )
}
