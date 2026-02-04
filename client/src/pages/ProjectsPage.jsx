import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getProjects, createProject, updateProject, deleteProject } from '../services/api'
import ProjectKanban from '../components/ProjectKanban'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editProject, setEditProject] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    tags: '',
    dueDate: '',
    description: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    dueDate: '',
    description: ''
  })

  useLockBodyScroll(isModalOpen || Boolean(deleteConfirm) || Boolean(editProject))

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const data = await getProjects()
    setProjects(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    
    await createProject({
      ...formData,
      tags: tagsArray
    })
    setFormData({ name: '', tags: '', dueDate: '', description: '' })
    setIsModalOpen(false)
    loadProjects()
  }

  async function handleDelete(id) {
    setDeleteConfirm(id)
  }

  async function confirmDelete() {
    if (deleteConfirm) {
      await deleteProject(deleteConfirm)
      if (selectedProject?.id === deleteConfirm) setSelectedProject(null)
      setDeleteConfirm(null)
      loadProjects()
    }
  }

  function openEdit(project) {
    setEditProject(project)
    setEditForm({
      name: project.name || '',
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      dueDate: project.dueDate || '',
      description: project.description || ''
    })
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editForm.name.trim()) return

    const tagsArray = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)

    await updateProject(editProject.id, {
      name: editForm.name,
      tags: tagsArray,
      dueDate: editForm.dueDate,
      description: editForm.description
    })

    setEditProject(null)
    setEditForm({ name: '', tags: '', dueDate: '', description: '' })
    loadProjects()
  }

  if (selectedProject) {
    return <ProjectKanban project={selectedProject} onBack={() => setSelectedProject(null)} />
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Projects</h2>
      </div>
      <div className="project-actions">
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add Project</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Create Project</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleSubmit}>
                <label className="field">
                  <span className="field-label">Project name</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Project name"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Tags</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Due date</span>
                  <input
                    className="input"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Description (optional)</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description"
                  />
                </label>
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn primary" type="submit">Create</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
      <div className="project-grid">
        {projects.length === 0 ? (
          <div className="empty-state">No projects yet. Add one to begin ✨</div>
        ) : (
          projects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header-row">
                <div className="project-tags">{Array.isArray(project.tags) && project.tags.length > 0 ? project.tags.map((tag, idx) => (<span key={idx} className="tag">{tag}</span>)) : (<span className="tag">Project</span>)}</div>
                <span className="project-task-count">Tasks: {project.taskCount || 0}</span>
              </div>
              <div className="project-title">{project.name}</div>
              <p className="project-desc">{project.description || ''}</p>
              <div className="project-meta">
                <span>Due: {project.dueDate || 'TBD'}</span>
              </div>
              <div className="card-actions">
                <button className="btn primary" onClick={() => setSelectedProject(project)}>Open Board</button>
                <button className="btn ghost" onClick={() => openEdit(project)}>Edit</button>
                <button className="btn ghost" onClick={() => handleDelete(project.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editProject && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditProject(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Edit Project</h3>
                <button className="modal-close" onClick={() => setEditProject(null)}>✕</button>
              </div>
              <form className="modal-body" onSubmit={handleEditSubmit}>
                <label className="field">
                  <span className="field-label">Project name</span>
                  <input
                    className="input"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Project name"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Tags</span>
                  <input
                    className="input"
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Due date</span>
                  <input
                    className="input"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Description (optional)</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Short description"
                  />
                </label>
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setEditProject(null)}>Cancel</button>
                  <button className="btn primary" type="submit">Save</button>
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
                <h3 className="modal-title">Delete Project?</h3>
                <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '24px', color: '#666' }}>
                  Are you sure you want to delete this project? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <button className="btn ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn primary" style={{ backgroundColor: '#ff6b6b' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}

