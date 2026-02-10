import { useMemo, useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import { getVisionGoals, createVisionGoal, updateVisionGoal, deleteVisionGoal } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const GOAL_TYPES = [
  { key: 'financial', icon: '💰', label: 'Financial', desc: 'Money management, savings, debt reduction, and long-term security.' },
  { key: 'business', icon: '💼', label: 'Business', desc: 'Career growth, entrepreneurship, and business project milestones.' },
  { key: 'relationships', icon: '💗', label: 'Relationships', desc: 'Meaningful connection goals with partner, friends, and family.' },
  { key: 'health_fitness', icon: '🏃‍♀️', label: 'Health & Fitness', desc: 'Health habits, fitness levels, and overall physical well-being.' },
  { key: 'fun_recreation', icon: '🎀', label: 'Fun & Recreation', desc: 'Joyful hobbies, travel, and experiences that recharge you.' },
  { key: 'personal', icon: '🌸', label: 'Personal', desc: 'Self-development, lifestyle upgrades, and personal habits.' },
  { key: 'contribution', icon: '🤝', label: 'Contribution', desc: 'Giving back, helping others, and making positive impact.' }
]

const TYPE_BY_KEY = Object.fromEntries(GOAL_TYPES.map((item) => [item.key, item]))

function normalizeType(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'personal'
  if (raw === 'health & fitness' || raw === 'health-and-fitness' || raw === 'health') return 'health_fitness'
  if (raw === 'fun & recreation' || raw === 'fun-and-recreation' || raw === 'fun') return 'fun_recreation'
  return TYPE_BY_KEY[raw] ? raw : 'personal'
}

function prettyDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VisionPage() {
  const { t } = useLanguage()
  const [goals, setGoals] = useState([])
  const [selectedType, setSelectedType] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, goalId: null, goalTitle: '' })
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal',
    icon: '✨'
  })

  useLockBodyScroll(isModalOpen || confirmDelete.isOpen)

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    try {
      const data = await getVisionGoals()
      setGoals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load vision goals:', error)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return

    try {
      await createVisionGoal({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: normalizeType(formData.category),
        icon: formData.icon.trim() || '✨'
      })
      setFormData({ title: '', description: '', category: 'personal', icon: '✨' })
      setIsModalOpen(false)
      loadGoals()
    } catch (error) {
      console.error('Failed to create vision goal:', error)
    }
  }

  function openDeleteConfirm(goalId) {
    const goal = goals.find((item) => item.id === goalId)
    setConfirmDelete({
      isOpen: true,
      goalId,
      goalTitle: goal?.title || t('vision.thisGoal')
    })
  }

  async function confirmDeleteGoal() {
    try {
      await deleteVisionGoal(confirmDelete.goalId)
      loadGoals()
    } catch (error) {
      console.error('Failed to delete vision goal:', error)
    } finally {
      setConfirmDelete({ isOpen: false, goalId: null, goalTitle: '' })
    }
  }

  async function handleToggleAchieved(goal) {
    try {
      const updated = await updateVisionGoal(goal.id, { achieved: !Boolean(goal.achieved) })
      setGoals((prev) => prev.map((item) => (item.id === goal.id ? updated : item)))
    } catch (error) {
      console.error('Failed to update vision goal:', error)
    }
  }

  const { activeGoals, archivedGoals } = useMemo(() => {
    const normalized = goals.map((goal) => ({ ...goal, category: normalizeType(goal.category) }))
    let filtered = normalized;
    if (selectedType === 'completed') {
      filtered = normalized.filter((goal) => Boolean(goal.achieved));
    } else if (selectedType !== 'all') {
      filtered = normalized.filter((goal) => goal.category === selectedType && !goal.achieved);
    } else {
      filtered = normalized.filter((goal) => !goal.achieved);
    }
    return {
      activeGoals: selectedType === 'completed' ? [] : filtered,
      archivedGoals: selectedType === 'completed' ? filtered : normalized.filter((goal) => Boolean(goal.achieved))
    }
  }, [goals, selectedType])

  return (
    <section className="page-section active vision-board-page">
      <div className="vision-board-shell">
        <header className="section-header">
          <div>
            <h2>{t('vision.title')}</h2>
            <p className="subtitle">Tiny steps, big blooms.</p>
          </div>
          <button className="btn primary" onClick={() => setIsModalOpen(true)}>+ Add Goal</button>
        </header>

        <div className="vision-type-tabs" role="tablist" aria-label="Goal categories">
          <button
            className={`vision-type-tab ${selectedType === 'all' ? 'active' : ''}`}
            type="button"
            onClick={() => setSelectedType('all')}
          >
            ✨ All
          </button>
          {GOAL_TYPES.map((type) => (
            <button
              key={type.key}
              className={`vision-type-tab ${selectedType === type.key ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedType(type.key)}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
          <button
            className={`vision-type-tab ${selectedType === 'completed' ? 'active' : ''}`}
            type="button"
            onClick={() => setSelectedType('completed')}
          >
            🌟 Completed
          </button>
        </div>

        {selectedType !== 'all' && selectedType !== 'completed' && <p className="vision-selected-type-desc">{TYPE_BY_KEY[selectedType]?.desc}</p>}

        <div className="vision-goals-grid">
          {selectedType === 'completed'
            ? archivedGoals.length
              ? archivedGoals.map((goal) => {
                  const type = TYPE_BY_KEY[goal.category] || TYPE_BY_KEY.personal
                  return (
                    <article key={goal.id} className="vision-goal-card vision-goal-card-achieved">
                      <div className="vision-goal-card-head">
                        <span className="vision-goal-type-chip">{type.icon} {type.label}</span>
                        <button className="icon-btn vision-goal-delete" onClick={() => openDeleteConfirm(goal.id)}>✕</button>
                      </div>
                      <h3 className="vision-goal-name">{goal.title}</h3>
                      <p className="vision-goal-desc">{goal.description}</p>
                      <div className="vision-goal-footer">
                        <span className="vision-achieved-stamp">ACHIEVED 💖</span>
                        <button className="vision-achieve-pill" type="button" onClick={() => handleToggleAchieved(goal)}>
                          <span className="vision-achieve-check">✓</span>
                          <span>{t('vision.markUnachieved')}</span>
                        </button>
                      </div>
                      <div className="vision-achieved-date">Completed: {prettyDate(goal.achieved_at) || 'Recently'}</div>
                    </article>
                  )
                })
              : <div className="vision-empty-state">No completed goals yet. You are almost there 🌸</div>
            : activeGoals.length
              ? activeGoals.map((goal) => {
                  const type = TYPE_BY_KEY[goal.category] || TYPE_BY_KEY.personal
                  return (
                    <article key={goal.id} className="vision-goal-card">
                      <div className="vision-goal-card-head">
                        <span className="vision-goal-type-chip">{type.icon} {type.label}</span>
                        <button className="icon-btn vision-goal-delete" onClick={() => openDeleteConfirm(goal.id)}>✕</button>
                      </div>
                      <h3 className="vision-goal-name">{goal.title}</h3>
                      <p className="vision-goal-desc">{goal.description}</p>
                      <div className="vision-goal-footer">
                        <button className="vision-achieve-pill" type="button" onClick={() => handleToggleAchieved(goal)}>
                          <span className="vision-achieve-check">♡</span>
                          <span>Achieved</span>
                        </button>
                      </div>
                    </article>
                  )
                })
              : <div className="vision-empty-state">No goals to achieve in this view yet. Add your first one 💗</div>
          }
        </div>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('vision.addGoalTitle')}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <input
                  className="input"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('vision.goalTitlePlaceholder')}
                  required
                />

                <textarea
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('vision.goalDescriptionPlaceholder')}
                  rows="4"
                  required
                ></textarea>

                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>

                <input
                  className="input"
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder={t('vision.goalIconPlaceholder')}
                  maxLength="2"
                />

                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('vision.cancel')}</button>
                  <button className="btn primary" type="submit">{t('vision.addGoalButton')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteGoal}
        onCancel={() => setConfirmDelete({ isOpen: false, goalId: null, goalTitle: '' })}
        title={t('vision.deleteGoalTitle')}
        message={t('vision.deleteGoalMessage').replace('{goal}', confirmDelete.goalTitle)}
      />
    </section>
  )
}
