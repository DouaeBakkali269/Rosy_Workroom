import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'

export default function VisionPage() {
  const [goals, setGoals] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '✨'
  })

  useLockBodyScroll(isModalOpen)

  useEffect(() => {
    // Load goals from localStorage
    const saved = localStorage.getItem('visionGoals')
    if (saved) {
      setGoals(JSON.parse(saved))
    } else {
      // Default goals
      setGoals([
        { id: 1, title: 'Career bloom', description: 'Launch my signature design studio & sign 5 dreamy clients.', icon: '✨' },
        { id: 2, title: 'Home sanctuary', description: 'Create a cozy studio corner with soft lighting and plants.', icon: '🌺' },
        { id: 3, title: 'Travel & joy', description: 'Plan two getaways that feel slow, romantic, and inspiring.', icon: '💙' },
        { id: 4, title: 'Wellbeing ritual', description: 'Daily journaling + weekly movement, with monthly spa time.', icon: '💛' }
      ])
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return
    
    const newGoal = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
      icon: formData.icon
    }
    
    const updated = [...goals, newGoal]
    setGoals(updated)
    localStorage.setItem('visionGoals', JSON.stringify(updated))
    setFormData({ title: '', description: '', icon: '✨' })
    setIsModalOpen(false)
  }

  function handleDelete(id) {
    const updated = goals.filter(g => g.id !== id)
    setGoals(updated)
    localStorage.setItem('visionGoals', JSON.stringify(updated))
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Vision Board 2026</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add goal</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Vision Goal</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                className="input"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Goal title"
                required
              />
              <textarea
                className="input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your vision..."
                rows="4"
                required
              ></textarea>
              <input
                className="input"
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Emoji icon"
                maxLength="2"
              />
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn primary" type="submit">Add Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="vision-grid">
        {goals.map(goal => (
          <div key={goal.id} className="vision-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div className="vision-title">{goal.title}</div>
              <button className="icon-btn" onClick={() => handleDelete(goal.id)}>✕</button>
            </div>
            <p>{goal.description}</p>
            <div className="vision-sticker">{goal.icon}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
