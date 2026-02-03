import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getProjects, createProject, deleteProject } from '../services/api'
import ProjectKanban from '../components/ProjectKanban'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    dueDate: '',
    description: ''
  })

  useLockBodyScroll(isModalOpen)

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
    await createProject(formData)
    setFormData({ name: '', tag: '', dueDate: '', description: '' })
    setIsModalOpen(false)
    loadProjects()
  }

  async function handleDelete(id) {
    if (confirm('Delete this project?')) {
      await deleteProject(id)
      if (selectedProject?.id === id) setSelectedProject(null)
      loadProjects()
    }
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
                  <span className="field-label">Tag</span>
                  <input
                    className="input"
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="Tag"
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
                <div className="project-tag">{project.tag || 'Project'}</div>
                <span className="project-task-count">Tasks: {project.taskCount || 0}</span>
              </div>
              <div className="project-title">{project.name}</div>
              <p className="project-desc">{project.description || ''}</p>
              <div className="project-meta">
                <span>Due: {project.dueDate || 'TBD'}</span>
              </div>
              <div className="card-actions">
                <button className="btn primary" onClick={() => setSelectedProject(project)}>Open Board</button>
                <button className="btn ghost" onClick={() => handleDelete(project.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
