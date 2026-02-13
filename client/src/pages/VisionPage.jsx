import { useMemo, useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import {
  getVisionGoals,
  getVisionTypes,
  getVisionTypePreferences,
  createVisionType,
  deleteVisionType,
  createVisionGoal,
  updateVisionGoal,
  deleteVisionGoal
} from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const DEFAULT_GOAL_TYPES = [
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

function normalizeType(value, typeByKey) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'personal'
  if (raw === 'health & fitness' || raw === 'health-and-fitness' || raw === 'health') return 'health_fitness'
  if (raw === 'fun & recreation' || raw === 'fun-and-recreation' || raw === 'fun') return 'fun_recreation'
  return typeByKey[raw] ? raw : 'personal'
}

export default function VisionPage() {
  const { t } = useLanguage()
  const [goals, setGoals] = useState([])
  const [customTypes, setCustomTypes] = useState([])
  const [disabledDefaultTypeKeys, setDisabledDefaultTypeKeys] = useState([])
  const [selectedType, setSelectedType] = useState('all')
  const allGoalTypes = useMemo(
    () => [
      ...DEFAULT_GOAL_TYPES
        .filter((item) => !disabledDefaultTypeKeys.includes(item.key))
        .map((item) => ({ ...item, isCustom: false, isDefault: true })),
      ...customTypes.map((item) => ({
        ...item,
        label: item.name,
        desc: item.description,
        icon: '✨',
        isCustom: true,
        isDefault: false
      }))
    ],
    [customTypes, disabledDefaultTypeKeys]
  )
  const typeByKey = useMemo(
    () => Object.fromEntries(allGoalTypes.map((item) => [item.key, item])),
    [allGoalTypes]
  )
  const [typeOrder, setTypeOrder] = useState(() => {
    const stored = localStorage.getItem('visionTypeOrder')
    if (!stored) return DEFAULT_GOAL_TYPES.map((t) => t.key)
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
      return DEFAULT_GOAL_TYPES.map((t) => t.key)
    } catch {
      return DEFAULT_GOAL_TYPES.map((t) => t.key)
    }
  })
  const [draggingType, setDraggingType] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, goalId: null, goalTitle: '' })
  const [editingGoal, setEditingGoal] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal'
  })
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: ''
  })

  useLockBodyScroll(isModalOpen || isTypeModalOpen || confirmDelete.isOpen)

  useEffect(() => {
    loadGoalsAndTypes()
  }, [])

  useEffect(() => {
    const allKeys = allGoalTypes.map((item) => item.key)
    setTypeOrder((prev) => {
      const normalizedPrev = Array.isArray(prev) ? prev.filter((key) => allKeys.includes(key)) : []
      const missing = allKeys.filter((key) => !normalizedPrev.includes(key))
      const next = [...normalizedPrev, ...missing]
      if (selectedType !== 'all' && selectedType !== 'completed' && !next.includes(selectedType)) {
        setSelectedType('all')
      }
      localStorage.setItem('visionTypeOrder', JSON.stringify(next))
      return next
    })
  }, [allGoalTypes, selectedType])

  async function loadGoalsAndTypes() {
    try {
      const [goalsData, typesData, prefsData] = await Promise.all([
        getVisionGoals(),
        getVisionTypes(),
        getVisionTypePreferences()
      ])
      setGoals(Array.isArray(goalsData) ? goalsData : [])
      setCustomTypes(Array.isArray(typesData) ? typesData : [])
      const disabledDefaults = Array.isArray(prefsData)
        ? prefsData
          .filter((item) => Boolean(item?.disabled))
          .map((item) => String(item.key || '').trim().toLowerCase())
        : []
      setDisabledDefaultTypeKeys(disabledDefaults)
    } catch (error) {
      console.error('Failed to load vision data:', error)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: normalizeType(formData.category, typeByKey),
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
      loadGoalsAndTypes()
    } catch (error) {
      console.error('Failed to create vision goal:', error)
    }
  }

  async function handleTypeSubmit(e) {
    e.preventDefault()
    const name = typeFormData.name.trim()
    const description = typeFormData.description.trim()
    if (!name || !description) return

    try {
      const created = await createVisionType({ name, description })
      setCustomTypes((prev) => [...prev, created])
      setTypeFormData({ name: '', description: '' })
      setIsTypeModalOpen(false)
    } catch (error) {
      console.error('Failed to create vision type:', error)
    }
  }

  async function handleDeleteType(typeKey) {
    try {
      await deleteVisionType(typeKey)
      setCustomTypes((prev) => prev.filter((item) => item.key !== typeKey))
      if (selectedType === typeKey) {
        setSelectedType('all')
      }
      await loadGoalsAndTypes()
    } catch (error) {
      console.error('Failed to delete vision type:', error)
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
      category: normalizeType(goal.category, typeByKey)
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
      loadGoalsAndTypes()
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
    const normalized = goals.map((goal) => ({ ...goal, category: normalizeType(goal.category, typeByKey) }))
    let filtered = normalized
    if (selectedType === 'completed') {
      filtered = normalized.filter((goal) => Boolean(goal.achieved))
    } else if (selectedType !== 'all') {
      filtered = normalized.filter((goal) => goal.category === selectedType && !goal.achieved)
    } else {
      filtered = normalized.filter((goal) => !goal.achieved)
    }
    return {
      activeGoals: selectedType === 'completed' ? [] : filtered,
      archivedGoals: selectedType === 'completed' ? filtered : normalized.filter((goal) => Boolean(goal.achieved))
    }
  }, [goals, selectedType, typeByKey])

  return (
    <section className="page-section active">
      <div className="section-header week-planner-header">
        <div>
          <h2>{t('vision.title')}</h2>
          <p className="week-range">Tiny steps, big blooms for your dream life.</p>
        </div>
        <div className="vision-header-actions">
          <button
            className="btn primary"
            type="button"
            onClick={openAddModal}
          >
            + {t('vision.addGoal')}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setIsTypeModalOpen(true)}
          >
            + {t('vision.addType')}
          </button>
        </div>
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
              const type = typeByKey[key]
              if (!type) return null
              const isActive = selectedType === type.key
              const count = goals.filter((g) => normalizeType(g.category, typeByKey) === type.key && !g.achieved).length
              return (
                <button
                  key={type.key}
                  className={`day-btn vision-type-btn ${isActive ? 'active' : ''}`}
                  type="button"
                  draggable
                  onDragStart={() => handleTypeDragStart(type.key)}
                  onDragOver={handleTypeDragOver}
                  onDrop={() => handleTypeDrop(type.key)}
                  onClick={() => setSelectedType(type.key)}
                >
                  <span className="day-name">{type.label}</span>
                  <button
                    type="button"
                    className="vision-type-delete"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteType(type.key)
                    }}
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    ✕
                  </button>
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
                  : typeByKey[selectedType]?.label || 'Goals'}
            </h3>
            {selectedType !== 'completed' && selectedType !== 'all' && (
              <div className="day-header-actions">
                <span className="completion-rate">
                  {
                    goals.filter(
                      (g) => normalizeType(g.category, typeByKey) === selectedType && Boolean(g.achieved)
                    ).length
                  } achieved · {
                    goals.filter(
                      (g) => normalizeType(g.category, typeByKey) === selectedType && !g.achieved
                    ).length
                  } in progress
                </span>
              </div>
            )}
          </div>

          {selectedType !== 'all' && selectedType !== 'completed' && (
            <p className="vision-selected-type-desc"><strong>{typeByKey[selectedType]?.desc}</strong></p>
          )}

          <div className="vision-goals-grid">
            {selectedType === 'completed'
              ? archivedGoals.length
                ? archivedGoals.map((goal) => {
                    const type = typeByKey[normalizeType(goal.category, typeByKey)] || typeByKey.personal
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
                              ✓
                            </button>
                            <button
                              className="icon-btn vision-unachieve-icon"
                              type="button"
                              title={t('vision.moveBackToGoals')}
                              aria-label={t('vision.moveBackToGoals')}
                              onClick={() => handleToggleAchieved(goal)}
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
                    const type = typeByKey[normalizeType(goal.category, typeByKey)] || typeByKey.personal
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
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>x</button>
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
                  {allGoalTypes.map((type) => (
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

      {isTypeModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsTypeModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('vision.addTypeTitle')}</h3>
                <button className="modal-close" onClick={() => setIsTypeModalOpen(false)}>x</button>
              </div>
              <form className="modal-form" onSubmit={handleTypeSubmit}>
                <input
                  className="input"
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  placeholder={t('vision.typeNamePlaceholder')}
                  required
                />

                <textarea
                  className="input"
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  placeholder={t('vision.typeDescriptionPlaceholder')}
                  rows="4"
                  required
                ></textarea>

                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsTypeModalOpen(false)}>{t('vision.cancel')}</button>
                  <button className="btn primary" type="submit">{t('vision.addTypeButton')}</button>
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

