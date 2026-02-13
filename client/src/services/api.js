const API_BASE = '/api'

function getAuthToken() {
  const raw = localStorage.getItem('auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
        return parsed.token.trim()
      }
    } catch {
      // ignore malformed auth cache
    }
  }
  return null
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers,
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

export const logout = () => apiRequest('auth/logout', { method: 'POST' })

// Tasks
export const getTasks = () => apiRequest('tasks')
export const createTask = (data) => apiRequest('tasks', { method: 'POST', body: JSON.stringify(data) })
export const updateTask = (id, data) => apiRequest(`tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTask = (id) => apiRequest(`tasks/${id}`, { method: 'DELETE' })

// Users
export const searchUsers = (query) => apiRequest(`users/search?q=${encodeURIComponent(query)}`)

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
export const getKanbanColumns = (projectId = 0) => apiRequest(`kanban/columns?projectId=${encodeURIComponent(projectId)}`)
export const createKanbanColumn = (data) => apiRequest('kanban/columns', { method: 'POST', body: JSON.stringify(data) })
export const updateKanbanColumn = (key, data) => apiRequest(`kanban/columns/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteKanbanColumn = (key, projectId = 0) => apiRequest(`kanban/columns/${encodeURIComponent(key)}?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' })
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
export const updateVisionGoal = async (id, data) => {
  try {
    return await apiRequest(`vision-goals/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  } catch (error) {
    const message = String(error?.message || '')
    const canRetry =
      message.includes('Cannot PUT') ||
      message.includes('404') ||
      message.includes('Not Found')

    if (!canRetry) throw error

    try {
      return await apiRequest(`vision-goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    } catch (patchError) {
      return apiRequest(`vision-goals/${id}/toggle`, { method: 'POST', body: JSON.stringify(data) })
    }
  }
}
export const deleteVisionGoal = (id) => apiRequest(`vision-goals/${id}`, { method: 'DELETE' })

// Wishlist
export const getWishlist = () => apiRequest('wishlist')
export const createWishlistItem = (data) => apiRequest('wishlist', { method: 'POST', body: JSON.stringify(data) })
export const updateWishlistItem = (id, data) => apiRequest(`wishlist/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteWishlistItem = (id) => apiRequest(`wishlist/${id}`, { method: 'DELETE' })

// Profile
export const getProfile = () => apiRequest('profile')
export const updateProfile = (data) => apiRequest('profile', { method: 'PUT', body: JSON.stringify(data) })
export const updateProfilePassword = (data) => apiRequest('profile/password', { method: 'POST', body: JSON.stringify(data) })

export const uploadProfileAvatar = async (file) => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(`${API_BASE}/profile/avatar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Avatar upload failed')
  }

  return response.json()
}

export const deleteProfileAvatar = async () => {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}/profile/avatar`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Avatar removal failed')
  }

  if (response.status === 204) return null
  return response.json()
}

// Wishlist Image Upload
export const uploadWishlistImage = async (id, file) => {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('image', file)
  
  console.log('📤 Uploading image for item ID:', id, 'File:', file.name, 'Size:', file.size)
  
  const response = await fetch(`${API_BASE}/wishlist/${id}/upload-image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  })
  
  if (!response.ok) {
    const message = await response.text()
    console.error('❌ Upload failed:', response.status, message)
    throw new Error(message || 'Image upload failed')
  }
  
  const result = await response.json()
  console.log('✅ Image uploaded successfully:', result)
  return result
}

// Wishlist Image Delete
export const deleteWishlistImage = async (id) => {
  const token = getAuthToken()
  
  const response = await fetch(`${API_BASE}/wishlist/${id}/delete-image`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Image deletion failed')
  }
  
  if (response.status === 204) {
    return null
  }
  
  return response.json()
}

// Week Planner
export const getCurrentWeekPlan = () => apiRequest('week-plan/current')
export const getWeekPlan = (weekKey) => apiRequest(`week-plan?weekKey=${encodeURIComponent(weekKey)}`)
export const saveWeekPlan = (weekKey, plan) => apiRequest('week-plan', { method: 'POST', body: JSON.stringify({ weekKey, plan }) })
export const getWeekPlanHistory = () => apiRequest('week-plan/history')
