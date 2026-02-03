import { useState } from 'react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import KanbanPage from './pages/KanbanPage'
import MoneyPage from './pages/MoneyPage'
import NotesPage from './pages/NotesPage'
import WishlistPage from './pages/WishlistPage'
import VisionPage from './pages/VisionPage'
import './styles/App.css'

function App() {
  const [activePage, setActivePage] = useState('home')

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <HomePage />
      case 'dashboard': return <DashboardPage />
      case 'projects': return <ProjectsPage />
      case 'kanban': return <KanbanPage />
      case 'money': return <MoneyPage />
      case 'notes': return <NotesPage />
      case 'wishlist': return <WishlistPage />
      case 'vision': return <VisionPage />
      default: return <HomePage />
    }
  }

  return (
    <div className="page">
      <Navbar activePage={activePage} onNavigate={setActivePage} />
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
