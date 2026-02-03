const API_BASE = '/api'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Tasks
export const getTasks = () => apiRequest('tasks')
export const createTask = (data) => apiRequest('tasks', { method: 'POST', body: JSON.stringify(data) })
export const updateTask = (id, data) => apiRequest(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTask = (id) => apiRequest(`tasks/${id}`, { method: 'DELETE' })

// Projects
export const getProjects = () => apiRequest('projects')
export const createProject = (data) => apiRequest('projects', { method: 'POST', body: JSON.stringify(data) })
export const updateProject = (id, data) => apiRequest(`projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteProject = (id) => apiRequest(`projects/${id}`, { method: 'DELETE' })

// Transactions
export const getTransactions = () => apiRequest('transactions')
export const createTransaction = (data) => apiRequest('transactions', { method: 'POST', body: JSON.stringify(data) })
export const deleteTransaction = (id) => apiRequest(`transactions/${id}`, { method: 'DELETE' })

// Kanban Cards
export const getKanbanCards = (projectId = 0) => apiRequest(`kanban/${projectId}`)
export const createKanbanCard = (data) => apiRequest('kanban', { method: 'POST', body: JSON.stringify(data) })
export const updateKanbanCard = (id, data) => apiRequest(`kanban/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteKanbanCard = (id) => apiRequest(`kanban/${id}`, { method: 'DELETE' })
