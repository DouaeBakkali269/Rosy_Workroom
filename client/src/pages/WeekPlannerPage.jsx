import { useState, useEffect } from 'react'
import { getWeekPlan, saveWeekPlan } from '../services/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WeekPlannerPage() {
  const [weekPlan, setWeekPlan] = useState(DAYS.map(day => ({ day, tasks: [], notes: '' })))
  const [selectedDay, setSelectedDay] = useState(0)
  const [taskInput, setTaskInput] = useState('')

  useEffect(() => {
    loadWeekPlan()
  }, [])

  async function loadWeekPlan() {
    try {
      const data = await getWeekPlan()
      if (data && data.length > 0) {
        setWeekPlan(data)
      }
    } catch (error) {
      console.error('Failed to load week plan:', error)
    }
  }

  async function saveChanges() {
    try {
      await saveWeekPlan(weekPlan)
    } catch (error) {
      console.error('Failed to save week plan:', error)
    }
  }

  function addTask() {
    if (!taskInput.trim()) return
    const updated = [...weekPlan]
    updated[selectedDay].tasks.push({
      id: Date.now(),
      text: taskInput,
      done: false
    })
    setWeekPlan(updated)
    setTaskInput('')
    saveChanges()
  }

  function toggleTask(dayIndex, taskId) {
    const updated = [...weekPlan]
    const task = updated[dayIndex].tasks.find(t => t.id === taskId)
    if (task) {
      task.done = !task.done
      setWeekPlan(updated)
      saveChanges()
    }
  }

  function deleteTask(dayIndex, taskId) {
    const updated = [...weekPlan]
    updated[dayIndex].tasks = updated[dayIndex].tasks.filter(t => t.id !== taskId)
    setWeekPlan(updated)
    saveChanges()
  }

  function updateNotes(dayIndex, notes) {
    const updated = [...weekPlan]
    updated[dayIndex].notes = notes
    setWeekPlan(updated)
    saveChanges()
  }

  const currentDay = weekPlan[selectedDay]

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Weekly Planner</h2>
      </div>

      <div className="week-planner-container">
        <div className="week-days">
          {DAYS.map((day, index) => (
            <button
              key={day}
              className={`day-btn ${selectedDay === index ? 'active' : ''}`}
              onClick={() => setSelectedDay(index)}
            >
              <span className="day-name">{day}</span>
              <span className="task-count">{weekPlan[index].tasks.filter(t => !t.done).length} tasks</span>
            </button>
          ))}
        </div>

        <div className="day-details">
          <div className="day-header">
            <h3>{currentDay.day}</h3>
            <span className="completion-rate">
              {currentDay.tasks.filter(t => t.done).length} of {currentDay.tasks.length} done
            </span>
          </div>

          <div className="day-section">
            <h4>Daily Tasks</h4>
            <div className="task-input-group">
              <input
                className="input"
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a task..."
              />
              <button className="btn primary" onClick={addTask}>Add</button>
            </div>

            <ul className="task-list">
              {currentDay.tasks.map(task => (
                <li key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(selectedDay, task.id)}
                    className="task-checkbox"
                  />
                  <span className="task-text">{task.text}</span>
                  <button
                    className="icon-btn"
                    onClick={() => deleteTask(selectedDay, task.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

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
        </div>
      </div>
    </section>
  )
}
