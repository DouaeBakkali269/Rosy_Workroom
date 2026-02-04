import { useState, useEffect } from 'react'
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
  const [activePage, setActivePage] = useState('home')
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  function handleLogin(userData) {
    setUser(userData)
    setActivePage('home')
  }

  function handleLogout() {
    localStorage.removeItem('user')
    setUser(null)
    setActivePage('home')
  }

  // Login is optional - comment out to disable mandatory login
  // if (!user) {
  //   return (
  //     <div className="page">
  //       <main className="content">
  //         <LoginPage onLogin={handleLogin} />
  //       </main>
  //       <div className="floating-shapes">
  //         <span></span><span></span><span></span><span></span>
  //       </div>
  //     </div>
  //   )
  // }

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <HomePage onNavigate={setActivePage} />
      case 'dashboard': return <DashboardPage onNavigate={setActivePage} />
      case 'projects': return <ProjectsPage />
      case 'kanban': return <KanbanPage />
      case 'money': return <MoneyPage />
      case 'notes': return <NotesPage />
      case 'wishlist': return <WishlistPage />
      case 'vision': return <VisionPage />
      case 'week-planner': return <WeekPlannerPage />
      default: return <HomePage onNavigate={setActivePage} />
    }
  }

  return (
    <div className="page">
      <Navbar 
        activePage={activePage} 
        onNavigate={setActivePage}
        user={user}
        onLogout={handleLogout}
      />
      <main className="content">
        {renderPage()}
      </main>
      <div className="floating-shapes">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  )
}

export default App
