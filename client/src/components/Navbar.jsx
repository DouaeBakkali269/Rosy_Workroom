import { NavLink } from 'react-router-dom'

export default function Navbar({ user, onLogout }) {
  const navItems = [
    { id: 'home', path: '/', label: 'Home', mobile: 'H' },
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', mobile: 'Dash' },
    { id: 'week-planner', path: '/week-planner', label: 'Week Planner', mobile: 'Week' },
    { id: 'projects', path: '/projects', label: 'Projects', mobile: 'Proj' },
    { id: 'money', path: '/money', label: 'Money', mobile: 'Money' },
    { id: 'notes', path: '/notes', label: 'Notes', mobile: 'Notes' },
    { id: 'wishlist', path: '/wishlist', label: 'Wishlist', mobile: 'Wish' },
    { id: 'vision', path: '/vision', label: 'Vision 2026', mobile: 'Vision' }
  ]

  return (
    <nav className="navbar">
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
          <span className="pill" style={{ marginRight: '10px' }}>
            👤 {user.username}
          </span>
          <button 
            className="btn ghost" 
            onClick={onLogout}
            style={{ padding: '4px 12px', fontSize: '13px' }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
