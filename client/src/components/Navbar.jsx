import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  
  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: t('nav.dashboard'), mobile: t('nav.dashboard') },
    { id: 'week-planner', path: '/week-planner', label: t('nav.weekPlanner'), mobile: t('nav.weekPlanner') },
    { id: 'projects', path: '/projects', label: t('nav.projects'), mobile: t('nav.projects') },
    { id: 'money', path: '/money', label: t('nav.money'), mobile: t('nav.money') },
    { id: 'notes', path: '/notes', label: t('nav.notes'), mobile: t('nav.notes') },
    { id: 'wishlist', path: '/wishlist', label: t('nav.wishlist'), mobile: t('nav.wishlist') },
    { id: 'vision', path: '/vision', label: t('nav.vision'), mobile: t('nav.vision') },
    { id: 'profile', path: '/profile', label: t('nav.profile'), mobile: t('nav.profile') }
  ]

  // Mobile bottom tabs configuration
  const mobileTabs = [
    { id: 'dashboard', label: t('nav.dashboard'), path: '/dashboard' },
    { id: 'week-planner', label: t('nav.weekPlanner'), path: '/week-planner' },
    { id: 'projects', label: t('nav.projects'), path: '/projects' },
    { id: 'money', label: t('nav.money'), path: '/money' },
    { id: 'notes', label: t('nav.notes'), path: '/notes' },
    { id: 'wishlist', label: t('nav.wishlist'), path: '/wishlist' },
    { id: 'vision', label: t('nav.vision'), path: '/vision' },
    { id: 'profile', label: t('nav.profile'), path: '/profile' }
  ]

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  return (
    <>
      {/* DESKTOP NAVBAR */}
      <nav className="navbar navbar-desktop">
        <div className="navbar-brand">
          <div className="logo">RW</div>
        </div>

        <div className="nav-items">
          {navItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <span className="nav-label-desktop">{item.label}</span>
              <span className="nav-label-mobile">{item.mobile}</span>
            </NavLink>
          ))}
        </div>

        {user && (
          <div className="navbar-footer">
            <button 
              className="btn ghost navbar-logout-btn" 
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </nav>

      {/* MOBILE TOP TAB BAR */}
      {user && (
        <nav className="navbar-mobile">
          <div className="mobile-tabs">
            <button
              className="mobile-logo"
              onClick={() => navigate('/dashboard')}
              title="Rosy Workroom"
            >
              RW
            </button>
            {mobileTabs.map(tab => (
              <div key={tab.id}>
                <button
                  className={`mobile-tab ${location.pathname === tab.path ? 'active' : ''}`}
                  onClick={() => navigate(tab.path)}
                  title={tab.label}
                >
                  {tab.label}
                </button>
              </div>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
