import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getProjects, createProject, updateProject, deleteProject, searchUsers } from '../services/api'
import ProjectKanban from '../components/ProjectKanban'
import { useLanguage } from '../context/LanguageContext'

export default function ProjectsPage() {
  const { t } = useLanguage()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editProject, setEditProject] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    members: [],
    dueDate: '',
    description: ''
  })
  const [editForm, setEditForm] = useState({
    name: '',
    tags: '',
    members: [],
    dueDate: '',
    description: ''
  })

  const [memberInput, setMemberInput] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState([])
  const [editMemberInput, setEditMemberInput] = useState('')
  const [editMemberSuggestions, setEditMemberSuggestions] = useState([])
  const [memberError, setMemberError] = useState('')
  const [editMemberError, setEditMemberError] = useState('')
  const [submitError, setSubmitError] = useState('')

  useLockBodyScroll(isModalOpen || Boolean(deleteConfirm) || Boolean(editProject))

  useEffect(() => {
    loadProjects()
  }, [])

  function errorMessage(error, fallback) {
    const raw = error?.message || ''
    try {
      const parsed = JSON.parse(raw)
      return parsed.error || fallback
    } catch {
      return raw || fallback
    }
  }

  async function loadProjects() {
    const data = await getProjects()
    setProjects(data)
  }

  async function loadMemberSuggestions(value, setSuggestions, setError) {
    const query = value.trim()
    if (!query) {
      setSuggestions([])
      setError('')
      return
    }
    try {
      const results = await searchUsers(query)
      setSuggestions(Array.isArray(results) ? results : [])
      setError('')
    } catch (error) {
      console.error('Failed to search users:', error)
      setSuggestions([])
      setError(t('projects.memberSearchError'))
    }
  }

  function addMember(setter, state, user) {
    if (!user?.username) return
    const username = String(user.username).trim()
    if (!username) return
    const exists = state.members.some(member => member.toLowerCase() === username.toLowerCase())
    if (exists) return
    setter({ ...state, members: [...state.members, username] })
  }

  function removeMember(setter, state, name) {
    setter({ ...state, members: state.members.filter(member => member !== name) })
  }

  async function addMemberFromInput({
    inputValue,
    suggestions,
    setError,
    setInput,
    setSuggestions,
    setter,
    state
  }) {
    const typed = inputValue.trim()
    if (!typed) return

    const exactSuggested = suggestions.find(
      (user) => String(user.username).toLowerCase() === typed.toLowerCase()
    )

    if (exactSuggested) {
      addMember(setter, state, exactSuggested)
      setInput('')
      setSuggestions([])
      setError('')
      return
    }

    try {
      const users = await searchUsers(typed)
      const exact = (Array.isArray(users) ? users : []).find(
        (user) => String(user.username).toLowerCase() === typed.toLowerCase()
      )
      if (!exact) {
        setError(t('projects.userNotFound').replace('{user}', typed))
        return
      }
      addMember(setter, state, exact)
      setInput('')
      setSuggestions([])
      setError('')
    } catch (error) {
      setError(t('projects.memberVerifyError'))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (memberInput.trim()) {
      setMemberError(t('projects.memberInputError'))
      return
    }

    try {
      setSubmitError('')
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      await createProject({
        name: formData.name,
        tags: tagsArray,
        members: formData.members,
        dueDate: formData.dueDate,
        description: formData.description
      })

      setFormData({ name: '', tags: '', members: [], dueDate: '', description: '' })
      setMemberInput('')
      setMemberSuggestions([])
      setMemberError('')
      setIsModalOpen(false)
      loadProjects()
    } catch (error) {
      setSubmitError(errorMessage(error, t('projects.createFailed')))
    }
  }

  function openEdit(project) {
    setEditProject(project)
    setEditForm({
      name: project.name || '',
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      members: Array.isArray(project.members) ? project.members : [],
      dueDate: project.dueDate || '',
      description: project.description || ''
    })
    setEditMemberInput('')
    setEditMemberSuggestions([])
    setEditMemberError('')
    setSubmitError('')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editForm.name.trim()) return
    if (editMemberInput.trim()) {
      setEditMemberError(t('projects.memberInputError'))
      return
    }

    try {
      setSubmitError('')
      const tagsArray = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      await updateProject(editProject.id, {
        name: editForm.name,
        tags: tagsArray,
        members: editForm.members,
        dueDate: editForm.dueDate,
        description: editForm.description
      })

      setEditProject(null)
      setEditForm({ name: '', tags: '', members: [], dueDate: '', description: '' })
      setEditMemberInput('')
      setEditMemberSuggestions([])
      setEditMemberError('')
      loadProjects()
    } catch (error) {
      setSubmitError(errorMessage(error, t('projects.updateFailed')))
    }
  }

  function handleDelete(id) {
    setDeleteConfirm(id)
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    await deleteProject(deleteConfirm)
    if (selectedProject?.id === deleteConfirm) setSelectedProject(null)
    setDeleteConfirm(null)
    loadProjects()
  }

  if (selectedProject) {
    return <ProjectKanban project={selectedProject} onBack={() => setSelectedProject(null)} />
  }

  const createdProjects = projects.filter(project => project.isOwner !== false)
  const sharedProjects = projects.filter(project => project.isOwner === false)

  function renderProjectList(list, emptyText) {
    if (list.length === 0) return <div className="empty-state">{emptyText}</div>
    return list.map(project => (
      <div key={project.id} className="project-card">
        <div className="project-header-row">
          <div className="project-tags">
            {Array.isArray(project.tags) && project.tags.length > 0
              ? project.tags.map((tag, idx) => <span key={idx} className="tag">{tag}</span>)
              : <span className="tag">{t('projects.tagFallback')}</span>}
          </div>
          <span className="project-task-count">{t('projects.tasksCount')}: {project.taskCount || 0}</span>
        </div>
        <div className="project-title">{project.name}</div>
        <p className="project-desc">{project.description || ''}</p>
        <div className="project-meta project-meta-stack">
          <span>{t('projects.due')}: {project.dueDate || t('projects.tbd')}</span>
          <span>{t('projects.membersCount')}: {Array.isArray(project.members) ? project.members.length : 0}</span>
        </div>
        <div className="card-actions">
          <button className="btn primary" onClick={() => setSelectedProject(project)}>{t('projects.openBoard')}</button>
          {project.isOwner !== false && (
            <>
              <button className="btn ghost" onClick={() => openEdit(project)}>{t('projects.edit')}</button>
              <button className="btn ghost" onClick={() => handleDelete(project.id)}>{t('projects.delete')}</button>
            </>
          )}
        </div>
      </div>
    ))
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>{t('projects.title')}</h2>
      </div>
      <div className="project-actions">
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>{t('projects.addProject')}</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{t('projects.createTitle')}</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>x</button>
              </div>
              <form className="modal-body" onSubmit={handleSubmit}>
                <label className="field">
                  <span className="field-label">{t('projects.projectName')}</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('projects.projectNamePlaceholder')}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.tags')}</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder={t('projects.tagsPlaceholder')}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.members')}</span>
                  <div className="member-input-wrap">
                    <input
                      className="input"
                      type="text"
                      value={memberInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setMemberInput(value)
                        loadMemberSuggestions(value, setMemberSuggestions, setMemberError)
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          await addMemberFromInput({
                            inputValue: memberInput,
                            suggestions: memberSuggestions,
                            setError: setMemberError,
                            setInput: setMemberInput,
                            setSuggestions: setMemberSuggestions,
                            setter: setFormData,
                            state: formData
                          })
                        }
                      }}
                      placeholder={t('projects.typeUsername')}
                    />
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={async () => {
                        await addMemberFromInput({
                          inputValue: memberInput,
                          suggestions: memberSuggestions,
                          setError: setMemberError,
                          setInput: setMemberInput,
                          setSuggestions: setMemberSuggestions,
                          setter: setFormData,
                          state: formData
                        })
                      }}
                    >
                      {t('projects.memberAdd')}
                    </button>
                  </div>
                  {memberSuggestions.length > 0 && (
                    <div className="member-suggestions">
                      {memberSuggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            addMember(setFormData, formData, user)
                            setMemberInput('')
                            setMemberSuggestions([])
                            setMemberError('')
                          }}
                        >
                          {user.username}
                          {user.email ? <span className="member-suggestion-meta">{user.email}</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                  {memberError && <p className="form-error">{memberError}</p>}
                  {formData.members.length > 0 && (
                    <div className="member-chips">
                      {formData.members.map((member) => (
                        <button
                          key={member}
                          type="button"
                          className="member-chip"
                          onClick={() => removeMember(setFormData, formData, member)}
                        >
                          {member} x
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.dueDate')}</span>
                  <input
                    className="input"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.descriptionOptional')}</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('projects.shortDescription')}
                  />
                </label>
                <div className="modal-actions">
                  {submitError && <p className="form-error">{submitError}</p>}
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('projects.createButton')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="projects-section">
        <h3 className="projects-subtitle">{t('projects.createdTitle')}</h3>
        <div className="project-grid">
          {renderProjectList(createdProjects, t('projects.emptyCreated'))}
        </div>
      </div>

      <div className="projects-section">
        <h3 className="projects-subtitle">{t('projects.sharedTitle')}</h3>
        <div className="project-grid">
          {renderProjectList(sharedProjects, t('projects.emptyShared'))}
        </div>
      </div>

      {editProject && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditProject(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{t('projects.editTitle')}</h3>
                <button className="modal-close" onClick={() => setEditProject(null)}>x</button>
              </div>
              <form className="modal-body" onSubmit={handleEditSubmit}>
                <label className="field">
                  <span className="field-label">{t('projects.projectName')}</span>
                  <input
                    className="input"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder={t('projects.projectNamePlaceholder')}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.tags')}</span>
                  <input
                    className="input"
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder={t('projects.tagsPlaceholder')}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.members')}</span>
                  <div className="member-input-wrap">
                    <input
                      className="input"
                      type="text"
                      value={editMemberInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditMemberInput(value)
                        loadMemberSuggestions(value, setEditMemberSuggestions, setEditMemberError)
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          await addMemberFromInput({
                            inputValue: editMemberInput,
                            suggestions: editMemberSuggestions,
                            setError: setEditMemberError,
                            setInput: setEditMemberInput,
                            setSuggestions: setEditMemberSuggestions,
                            setter: setEditForm,
                            state: editForm
                          })
                        }
                      }}
                      placeholder={t('projects.typeUsername')}
                    />
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={async () => {
                        await addMemberFromInput({
                          inputValue: editMemberInput,
                          suggestions: editMemberSuggestions,
                          setError: setEditMemberError,
                          setInput: setEditMemberInput,
                          setSuggestions: setEditMemberSuggestions,
                          setter: setEditForm,
                          state: editForm
                        })
                      }}
                    >
                      {t('projects.memberAdd')}
                    </button>
                  </div>
                  {editMemberSuggestions.length > 0 && (
                    <div className="member-suggestions">
                      {editMemberSuggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            addMember(setEditForm, editForm, user)
                            setEditMemberInput('')
                            setEditMemberSuggestions([])
                            setEditMemberError('')
                          }}
                        >
                          {user.username}
                          {user.email ? <span className="member-suggestion-meta">{user.email}</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                  {editMemberError && <p className="form-error">{editMemberError}</p>}
                  {editForm.members.length > 0 && (
                    <div className="member-chips">
                      {editForm.members.map((member) => (
                        <button
                          key={member}
                          type="button"
                          className="member-chip"
                          onClick={() => removeMember(setEditForm, editForm, member)}
                        >
                          {member} x
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.dueDate')}</span>
                  <input
                    className="input"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t('projects.descriptionOptional')}</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder={t('projects.shortDescription')}
                  />
                </label>
                <div className="modal-actions">
                  {submitError && <p className="form-error">{submitError}</p>}
                  <button className="btn ghost" type="button" onClick={() => setEditProject(null)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('projects.saveButton')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteConfirm && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{t('projects.deleteTitle')}</h3>
                <button className="modal-close" onClick={() => setDeleteConfirm(null)}>x</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '24px', color: '#666' }}>
                  {t('projects.deleteMessage')}
                </p>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <button className="btn ghost" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
                <button className="btn primary" style={{ backgroundColor: '#ff6b6b' }} onClick={confirmDelete}>{t('common.delete')}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
