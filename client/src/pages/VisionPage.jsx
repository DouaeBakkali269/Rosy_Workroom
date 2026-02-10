import { useMemo, useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import { getVisionGoals, createVisionGoal, updateVisionGoal, deleteVisionGoal } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const GOAL_TYPES = [
  {
    key: 'financial',
    icon: '💰',
    label: 'Financial',
    desc: 'Goals related to money management, income, savings, debt reduction, and building long-term financial security that makes you feel stable, supported, and in control of your numbers.'
  },
  {
    key: 'business',
    icon: '💼',
    label: 'Business',
    desc: 'Goals about career growth, professional achievements, entrepreneurship, and creating or managing business projects that move your work life in the direction you truly want.'
  },
  {
    key: 'relationships',
    icon: '💗',
    label: 'Relationships',
    desc: 'Goals focused on building meaningful connections with partners, friends, family, and nurturing the kind of loving, supportive relationships you want in your everyday life.'
  },
  {
    key: 'health_fitness',
    icon: '🏃‍♀️',
    label: 'Health & Fitness',
    desc: 'Goals about physical health, fitness level, movement, healthy habits, and gently improving your overall energy, strength, and well-being over time.'
  },
  {
    key: 'fun_recreation',
    icon: '🎀',
    label: 'Fun & Recreation',
    desc: 'Goals related to enjoyment, hobbies, travel, creative projects, and cozy experiences that bring you happiness, playfulness, creativity, and relaxation.'
  },
  {
    key: 'personal',
    icon: '🌸',
    label: 'Personal',
    desc: 'Goals about self-development, lifestyle, education, possessions, habits, and personal life improvements that help you feel closer to the version of yourself you want to become.'
  },
  {
    key: 'contribution',
    icon: '🤝',
    label: 'Contribution',
    desc: 'Goals about giving back, helping others, volunteering, donating, or making a positive impact on your community and the wider world in a way that feels gentle and aligned with you.'
  }
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
  const [typeOrder, setTypeOrder] = useState(() => {
    const stored = localStorage.getItem('visionTypeOrder')
    if (!stored) return GOAL_TYPES.map((t) => t.key)
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every((key) => TYPE_BY_KEY[key])) {
        return parsed
      }
      return GOAL_TYPES.map((t) => t.key)
    } catch {
      return GOAL_TYPES.map((t) => t.key)
    }
  })
  const [draggingType, setDraggingType] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, goalId: null, goalTitle: '' })
  const [editingGoal, setEditingGoal] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal'
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
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: normalizeType(formData.category),
        icon: editingGoal?.icon || '✨'
      }

      if (editingGoal) {
        await updateVisionGoal(editingGoal.id, payload)
      } else {
        await createVisionGoal(payload)
      }

      setFormData({ title: '', description: '', category: 'personal' })
      setEditingGoal(null)
      setIsModalOpen(false)
      loadGoals()
    } catch (error) {
      console.error('Failed to create vision goal:', error)
    }
  }

  function handleTypeDragStart(key) {
    setDraggingType(key)
  }

  function handleTypeDragOver(e) {
    e.preventDefault()
  }

  function handleTypeDrop(targetKey) {
    if (!draggingType || draggingType === targetKey) return
    setTypeOrder((prev) => {
      const next = prev.filter((k) => k !== draggingType)
      const targetIndex = next.indexOf(targetKey)
      if (targetIndex === -1) {
        next.push(draggingType)
      } else {
        next.splice(targetIndex, 0, draggingType)
      }
      localStorage.setItem('visionTypeOrder', JSON.stringify(next))
      return next
    })
    setDraggingType(null)
  }

  function openAddModal() {
    setEditingGoal(null)
    setFormData({ title: '', description: '', category: 'personal' })
    setIsModalOpen(true)
  }

  function openEditModal(goal) {
    setEditingGoal(goal)
    setFormData({
      title: goal.title || '',
      description: goal.description || '',
      category: normalizeType(goal.category)
    })
    setIsModalOpen(true)
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
    <section className="page-section active">
      <div className="section-header week-planner-header">
        <div>
          <h2>{t('vision.title')}</h2>
          <p className="week-range">Tiny steps, big blooms for your dream life.</p>
        </div>
        <button
          className="btn primary"
          type="button"
          onClick={openAddModal}
        >
          + {t('vision.addGoal')}
        </button>
      </div>

      <div className="week-planner-container">
        <div className="week-sidebar">
          <div className="week-days">
            <button
              className={`day-btn ${selectedType === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedType('all')}
            >
              <span className="day-name">✨ All goals</span>
              <span className="task-count">
                {goals.filter((g) => !g.achieved).length} active
              </span>
            </button>
            {typeOrder.map((key) => {
              const type = TYPE_BY_KEY[key]
              if (!type) return null
              const isActive = selectedType === type.key
              const count = goals.filter((g) => normalizeType(g.category) === type.key && !g.achieved).length
              return (
                <button
                  key={type.key}
                  className={`day-btn ${isActive ? 'active' : ''}`}
                  type="button"
                  draggable
                  onDragStart={() => handleTypeDragStart(type.key)}
                  onDragOver={handleTypeDragOver}
                  onDrop={() => handleTypeDrop(type.key)}
                  onClick={() => setSelectedType(type.key)}
                >
                  <span className="day-name">{type.label}</span>
                  <span className="task-count">
                    {count} goals
                  </span>
                </button>
              )
            })}
            <button
              className={`day-btn reflection-day ${selectedType === 'completed' ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedType('completed')}
            >
              <span className="day-name">🌟 Achieved board</span>
              <span className="task-count">
                {goals.filter((g) => Boolean(g.achieved)).length} achieved
              </span>
            </button>
          </div>
        </div>

        <div className="day-details">
          <div className="day-header">
            <h3>
              {selectedType === 'all'
                ? 'All active goals'
                : selectedType === 'completed'
                  ? 'Achieved goals'
                  : TYPE_BY_KEY[selectedType]?.label || 'Goals'}
            </h3>
            {selectedType !== 'completed' && selectedType !== 'all' && (
              <div className="day-header-actions">
                <span className="completion-rate">
                  {
                    goals.filter(
                      (g) => normalizeType(g.category) === selectedType && Boolean(g.achieved)
                    ).length
                  } achieved · {
                    goals.filter(
                      (g) => normalizeType(g.category) === selectedType && !g.achieved
                    ).length
                  } in progress
                </span>
              </div>
            )}
          </div>

          {selectedType !== 'all' && selectedType !== 'completed' && (
            <p className="vision-selected-type-desc"><strong>{TYPE_BY_KEY[selectedType]?.desc}</strong></p>
          )}

          <div className="vision-goals-grid">
            {selectedType === 'completed'
              ? archivedGoals.length
                ? archivedGoals.map((goal) => {
                    const type = TYPE_BY_KEY[normalizeType(goal.category)] || TYPE_BY_KEY.personal
                    return (
                      <article key={goal.id} className="vision-goal-card vision-goal-card-achieved">
                        <div className="vision-achieved-ribbon">
                          <span className="vision-achieved-ribbon-text">Achieved</span>
                        </div>
                        <div className="vision-goal-card-head">
                          <span className="vision-goal-type-chip">{type.label}</span>
                          <div className="vision-goal-actions">
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() => openEditModal(goal)}
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn vision-unachieve-icon"
                              type="button"
                              title={t('vision.moveBackToGoals')}
                              aria-label={t('vision.moveBackToGoals')}
                              onClick={() => handleToggleAchieved(goal)}
                            >
                              ↩
                            </button>
                            <button
                              className="icon-btn vision-goal-delete"
                              type="button"
                              onClick={() => openDeleteConfirm(goal.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <h3 className="vision-goal-name">{goal.title}</h3>
                        <p className="vision-goal-desc">{goal.description}</p>
                        <div className="vision-goal-footer">
                          <span />
                          <span className="vision-achieved-date">Achieved: {goal.achieved_at ? new Date(goal.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                        </div>
                      </article>
                    )
                  })
                : <div className="vision-empty-state">No achieved goals yet. You are almost there 🌸</div>
              : activeGoals.length
                ? activeGoals.map((goal) => {
                    const type = TYPE_BY_KEY[normalizeType(goal.category)] || TYPE_BY_KEY.personal
                    return (
                      <article key={goal.id} className="vision-goal-card">
                        <div className="vision-goal-card-head">
                          <span className="vision-goal-type-chip">{type.label}</span>
                          <div className="vision-goal-actions">
                            <button
                              className="icon-btn vision-achieve-icon"
                              type="button"
                              title={t('vision.markAchieved')}
                              aria-label={t('vision.markAchieved')}
                              onClick={() => handleToggleAchieved(goal)}
                            >
                              ✓
                            </button>
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() => openEditModal(goal)}
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn vision-goal-delete"
                              type="button"
                              onClick={() => openDeleteConfirm(goal.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <h3 className="vision-goal-name">{goal.title}</h3>
                        <p className="vision-goal-desc">{goal.description}</p>
                      </article>
                    )
                  })
                : <div className="vision-empty-state">No goals to achieve in this view yet. Add your first one 💗</div>
            }
          </div>
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
