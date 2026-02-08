import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentWeekPlan, saveWeekPlan, getNotes, getTransactions, getMonthlyBudgets } from '../services/api'

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

export default function DashboardPage() {
  const navigate = useNavigate()
  const [weekPlan, setWeekPlan] = useState(createEmptyWeekPlan())
  const [weekKey, setWeekKey] = useState('')
  const [weekReflection, setWeekReflection] = useState(DEFAULT_REFLECTION)
  const [notes, setNotes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [monthlyBudgets, setMonthlyBudgets] = useState([])
  const [newTask, setNewTask] = useState('')

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

  async function handleDeleteTask(taskId) {
    const todayIndex = getTodayIndex()
    const updated = [...weekPlan]
    updated[todayIndex].tasks = updated[todayIndex].tasks.filter(t => t.id !== taskId)
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

  // Calculate monthly spending for the last 6 months
  const getMonthlySpending = () => {
    const now = new Date()
    const months = []
    const budgetMap = monthlyBudgets.reduce((acc, budget) => {
      acc[`${budget.year}-${budget.month}`] = budget.budget
      return acc
    }, {})
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        name: date.toLocaleString('default', { month: 'short' }),
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
        monthData.spending += tx.amount
      }
    })

    months.forEach(month => {
      month.saved = month.budget !== null ? Math.max(month.budget - month.spending, 0) : null
    })
    
    return months
  }

  const monthlyData = getMonthlySpending()
  const maxSpending = Math.max(...monthlyData.map(m => m.spending), 1)

  const todayIndex = getTodayIndex()
  const todayTasks = weekPlan[todayIndex]?.tasks || []
  const todayLabel = DAYS[todayIndex]

  return (
    <section className="page-section active">
      <div className="hero-text-section">
        <h1 className="hero-main-text">Welcome back sweetheart to your cozy workroom ✿</h1>
        <p className="hero-sub-text">Today is about gentle focus. Pick one project, move one card, and log one win.</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title">Today plan · {todayLabel}</div>
          <ul className="checklist" id="tasks-list">
            {todayTasks.length === 0 ? (
              <div className="empty-state">No tasks yet. Add your first one 💗</div>
            ) : (
              todayTasks.map(task => (
                <li key={task.id}>
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
              placeholder="Add a task"
            />
            <button className="btn ghost" type="submit">Add</button>
          </form>
        </div>
        <div className="card">
          <div className="card-title">Money snapshot</div>
          <div className="money-chart-container">
            {monthlyData.map((month, idx) => (
              <div key={idx} className="month-bar-wrapper">
                <div 
                  className="month-bar" 
                  style={{ height: `${(month.spending / maxSpending) * 100}%` }}
                  title={`${month.name}: ${month.spending.toFixed(2)} MAD`}
                ></div>
                <div className="month-label">{month.name}</div>
                <div className="month-amount">{month.spending > 0 ? month.spending.toFixed(0) : '0'} MAD</div>
                {month.saved !== null && (
                  <div className="month-amount month-saved">
                    Saved: {month.saved.toFixed(0)} MAD
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Recent notes</div>
          {recentNotes.length === 0 ? (
            <div className="empty-state">No notes yet. Start jotting down thoughts 💗</div>
          ) : (
            recentNotes.map(note => (
              <div key={note.id} className="note">
                <div className="note-title">{note.title}</div>
                <div className="note-body">{note.content.substring(0, 50)}...</div>
              </div>
            ))
          )}
          <div className="notes-footer">
            <button className="notes-link" onClick={() => navigate('/notes')}>Add more notes</button>
          </div>
        </div>
      </div>
    </section>
  )
}
