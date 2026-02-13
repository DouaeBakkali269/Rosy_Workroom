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
import WeekHistoryPage from './pages/WeekHistoryPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import { LanguageProvider } from './context/LanguageContext'
import { logout as logoutApi } from './services/api'
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
  const [user, setUser] = useState(() => {
    const authRaw = localStorage.getItem('auth')
    if (authRaw) {
      try {
        const parsed = JSON.parse(authRaw)
        if (parsed?.user) return parsed.user
      } catch {
        // fall back to legacy storage
      }
    }

    const storedUser = localStorage.getItem('user')
    if (!storedUser) return null
    try {
      return JSON.parse(storedUser)
    } catch {
      return null
    }
  })

  function handleLogin(authData) {
    const nextUser = authData?.user || null
    if (!nextUser) return
    console.log('User logged in:', nextUser)
    setUser(nextUser)
    localStorage.setItem('auth', JSON.stringify(authData))
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  async function handleLogout() {
    console.log('User logged out')
    try {
      await logoutApi()
    } catch {
      // ignore API logout failures during local cleanup
    }
    localStorage.removeItem('auth')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <LanguageProvider initialLanguage={user?.language}>
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
              path="/week-planner/history"
              element={<RequireAuth user={user}><WeekHistoryPage /></RequireAuth>}
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
            <Route
              path="/profile"
              element={<RequireAuth user={user}><ProfilePage user={user} onLogout={handleLogout} /></RequireAuth>}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
