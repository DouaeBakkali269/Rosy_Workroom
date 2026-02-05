const API_BASE = '/api'

function getUserId() {
  const user = localStorage.getItem('user')
  if (user) {
    return JSON.parse(user).id
  }
  return null
}

async function apiRequest(path, options = {}) {
  const userId = getUserId()
  
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      'X-User-ID': userId || ''
    },
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

// Notes
export const getNotes = () => apiRequest('notes')
export const createNote = (data) => apiRequest('notes', { method: 'POST', body: JSON.stringify(data) })
export const updateNote = (id, data) => apiRequest(`notes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteNote = (id) => apiRequest(`notes/${id}`, { method: 'DELETE' })

// Monthly Budgets
export const getMonthlyBudgets = () => apiRequest('monthly-budgets')
export const getMonthlyBudget = (year, month) => apiRequest(`monthly-budgets/${year}/${month}`)
export const setMonthlyBudget = (data) => apiRequest('monthly-budgets', { method: 'POST', body: JSON.stringify(data) })

// Vision Goals
export const getVisionGoals = () => apiRequest('vision-goals')
export const createVisionGoal = (data) => apiRequest('vision-goals', { method: 'POST', body: JSON.stringify(data) })
export const deleteVisionGoal = (id) => apiRequest(`vision-goals/${id}`, { method: 'DELETE' })

// Wishlist
export const getWishlist = () => apiRequest('wishlist')
export const createWishlistItem = (data) => apiRequest('wishlist', { method: 'POST', body: JSON.stringify(data) })
export const updateWishlistItem = (id, data) => apiRequest(`wishlist/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteWishlistItem = (id) => apiRequest(`wishlist/${id}`, { method: 'DELETE' })

// Week Planner
export const getWeekPlan = () => apiRequest('week-plan')
export const saveWeekPlan = (data) => apiRequest('week-plan', { method: 'POST', body: JSON.stringify(data) })
