import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTasks, createTask, updateTask, deleteTask, getNotes, getTransactions, getMonthlyBudgets } from '../services/api'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [monthlyBudgets, setMonthlyBudgets] = useState([])
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    loadTasks()
    loadNotes()
    loadTransactions()
    loadMonthlyBudgets()
  }, [])

  async function loadTasks() {
    const data = await getTasks()
    setTasks(data)
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
    await createTask({ title: newTask })
    setNewTask('')
    loadTasks()
  }

  async function handleToggleTask(id, done) {
    await updateTask(id, { done })
    loadTasks()
  }

  async function handleDeleteTask(id) {
    await deleteTask(id)
    loadTasks()
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

  return (
    <section className="page-section active">
      <div className="hero-text-section">
        <h1 className="hero-main-text">Welcome back sweetheart to your cozy workroom ✿</h1>
        <p className="hero-sub-text">Today is about gentle focus. Pick one project, move one card, and log one win.</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title">Today plan</div>
          <ul className="checklist" id="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-state">No tasks yet. Add your first one 💗</div>
            ) : (
              tasks.map(task => (
                <li key={task.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                    />
                    {task.title}
                  </label>
                  <button className="icon-btn" onClick={() => handleDeleteTask(task.id)}>✕</button>
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
