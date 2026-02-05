import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  
  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', mobile: 'Dash' },
    { id: 'week-planner', path: '/week-planner', label: 'Week Planner', mobile: 'Week' },
    { id: 'projects', path: '/projects', label: 'Projects', mobile: 'Proj' },
    { id: 'money', path: '/money', label: 'Money', mobile: 'Money' },
    { id: 'notes', path: '/notes', label: 'Notes', mobile: 'Notes' },
    { id: 'wishlist', path: '/wishlist', label: 'Wishlist', mobile: 'Wish' },
    { id: 'vision', path: '/vision', label: 'Vision 2026', mobile: 'Vision' }
  ]

  // Mobile bottom tabs configuration
  const mobileTabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'week-planner', label: 'Week Planner', path: '/week-planner' },
    { id: 'projects', label: 'Projects', path: '/projects' },
    { id: 'money', label: 'Money', path: '/money' },
    { id: 'notes', label: 'Notes', path: '/notes' },
    { id: 'wishlist', label: 'Wishlist', path: '/wishlist' },
    { id: 'vision', label: 'Vision 2026', path: '/vision' },
    { id: 'profile', label: 'Profile', path: null }
  ]

  const handleLogout = () => {
    setShowProfileMenu(false)
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
            <span className="pill navbar-user-pill">
              👧🏻 {user.username}
            </span>
            <button 
              className="btn ghost navbar-logout-btn" 
              onClick={handleLogout}
            >
              Logout
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
                {tab.id !== 'profile' ? (
                  <button
                    className={`mobile-tab ${location.pathname === tab.path ? 'active' : ''}`}
                    onClick={() => navigate(tab.path)}
                    title={tab.label}
                  >
                    {tab.label}
                  </button>
                ) : (
                  <div className="mobile-tab-profile">
                    <button
                      className={`mobile-tab profile-btn ${showProfileMenu ? 'active' : ''}`}
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      title={tab.label}
                    >
                      {tab.label}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showProfileMenu && (
            <div className="profile-menu-mobile-fixed">
              <div className="profile-menu-header">
                👧🏻 {user.username}
              </div>
              <button
                className="profile-menu-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      )}
    </>
  )
}
