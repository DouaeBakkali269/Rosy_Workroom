import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
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
    setActivePage('home')
  }

  function handleLogout() {
    console.log('👋 User logged out')
    localStorage.removeItem('user')
    setUser(null

  console.log('🎯 Current user state:', user)

  // Require login to access the app
  if (!user) {
    console.log('🚪 No user - showing LoginPage')
    return (
      <div className="page">
        <main className="content">
          <LoginPage onLogin={handleLogin} />
        </main>
        <div className="floating-shapes">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (activePage) {
  return (
    <BrowserRouter>
      <div className="page">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/week-planner" element={<WeekPlannerPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/money" element={<MoneyPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/vision" element={<VisionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <div className="floating-shapes">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </BrowserRouter

export default App
