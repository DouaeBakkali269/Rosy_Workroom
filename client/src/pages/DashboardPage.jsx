import { useState, useEffect } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from '../services/api'

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    const data = await getTasks()
    setTasks(data)
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

  return (
    <section className="page-section active">
      <div className="hero-centered">
        <div className="hero-panel">
          <div className="hero-badge">Your Cozy Workroom</div>
          <h2>Welcome back, sweetheart ✿</h2>
          <p>Today is about gentle focus. Pick one project, move one card, and log one win.</p>
          <div className="hero-actions">
            <button className="btn primary">Start a focus session</button>
            <button className="btn ghost">Plan my week</button>
          </div>
          <div className="kawaii-sparkles">✨ 🍓 💗 ✨</div>
        </div>
        <div className="hero-card">
          <div className="hero-card-title">This week</div>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-value">5</div>
              <div className="stat-label">Projects active</div>
            </div>
            <div className="stat">
              <div className="stat-value">18</div>
              <div className="stat-label">Tasks moved</div>
            </div>
            <div className="stat">
              <div className="stat-value">$240</div>
              <div className="stat-label">Spent</div>
            </div>
            <div className="stat">
              <div className="stat-value">12</div>
              <div className="stat-label">Notes added</div>
            </div>
          </div>
        </div>
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
          <form className="inline-form" onSubmit={handleAddTask}>
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
          <div className="money-pill">Budget: $1,200</div>
          <div className="money-pill">Spent: $640</div>
          <div className="money-pill">Remaining: $560</div>
          <div className="chart">
            <div className="chart-bar" style={{ height: '65%' }}></div>
            <div className="chart-bar" style={{ height: '40%' }}></div>
            <div className="chart-bar" style={{ height: '85%' }}></div>
            <div className="chart-bar" style={{ height: '55%' }}></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Notes bouquet</div>
          <div className="note">
            <div className="note-title">New project idea</div>
            <div className="note-body">Create a pastel landing page with soft animations.</div>
          </div>
          <div className="note">
            <div className="note-title">Client feedback</div>
            <div className="note-body">Keep typography playful, add rounded buttons.</div>
          </div>
          <button className="btn ghost full">Write a note</button>
        </div>
      </div>
    </section>
  )
}
