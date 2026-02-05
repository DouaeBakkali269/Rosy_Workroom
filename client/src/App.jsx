import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import KanbanPage from './pages/KanbanPage'
import MoneyPage from './pages/MoneyPage'
import NotesPage from './pages/NotesPage'
import WishlistPage from './pages/WishlistPage'
import VisionPage from './pages/VisionPage'
import WeekPlannerPage from './pages/WeekPlannerPage'
import LoginPage from './pages/LoginPage'
import './styles/App.css'

function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppLayout({ user, onLogout }) {
  return (
    <div className="page">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <Outlet />
      </main>
      <div className="floating-shapes">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    console.log('🔍 Checking for stored user:', storedUser)
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  function handleLogin(userData) {
    console.log('✅ User logged in:', userData)
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function handleLogout() {
    console.log('👋 User logged out')
    localStorage.removeItem('user')
    setUser(null)
  }

  console.log('🎯 Current user state:', user)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} initialMode="login" />} />
        <Route path="/signup" element={<LoginPage onLogin={handleLogin} initialMode="signup" />} />

        <Route element={<AppLayout user={user} onLogout={handleLogout} />}>
          <Route
            path="/dashboard"
            element={<RequireAuth user={user}><DashboardPage /></RequireAuth>}
          />
          <Route
            path="/week-planner"
            element={<RequireAuth user={user}><WeekPlannerPage /></RequireAuth>}
          />
          <Route
            path="/projects"
            element={<RequireAuth user={user}><ProjectsPage /></RequireAuth>}
          />
          <Route
            path="/kanban"
            element={<RequireAuth user={user}><KanbanPage /></RequireAuth>}
          />
          <Route
            path="/money"
            element={<RequireAuth user={user}><MoneyPage /></RequireAuth>}
          />
          <Route
            path="/notes"
            element={<RequireAuth user={user}><NotesPage /></RequireAuth>}
          />
          <Route
            path="/wishlist"
            element={<RequireAuth user={user}><WishlistPage /></RequireAuth>}
          />
          <Route
            path="/vision"
            element={<RequireAuth user={user}><VisionPage /></RequireAuth>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
