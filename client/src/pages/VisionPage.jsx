import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getVisionGoals, createVisionGoal, deleteVisionGoal } from '../services/api'

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
    loadGoals()
  }, [])

  async function loadGoals() {
    try {
      const data = await getVisionGoals()
      setGoals(data)
    } catch (error) {
      console.error('Failed to load vision goals:', error)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return
    
    try {
      await createVisionGoal({
        title: formData.title,
        description: formData.description,
        icon: formData.icon
      })
      setFormData({ title: '', description: '', icon: '✨' })
      setIsModalOpen(false)
      loadGoals()
    } catch (error) {
      console.error('Failed to create vision goal:', error)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteVisionGoal(id)
      loadGoals()
    } catch (error) {
      console.error('Failed to delete vision goal:', error)
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Vision Board 2026</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add goal</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
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
        </ModalPortal>
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
