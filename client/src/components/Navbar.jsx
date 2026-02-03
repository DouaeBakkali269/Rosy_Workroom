export default function Navbar({ activePage, onNavigate }) {
  const navItems = [
    { id: 'home', label: 'Home', mobile: 'H' },
    { id: 'dashboard', label: 'Dashboard', mobile: 'Dash' },
    { id: 'week-planner', label: 'Week Planner', mobile: 'Week' },
    { id: 'projects', label: 'Projects', mobile: 'Proj' },
    { id: 'money', label: 'Money', mobile: 'Money' },
    { id: 'notes', label: 'Notes', mobile: 'Notes' },
    { id: 'wishlist', label: 'Wishlist', mobile: 'Wish' },
    { id: 'vision', label: 'Vision 2026', mobile: 'Vision' }
  ]

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo">RW</div>
      </div>

      <div className="nav-items">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="nav-label-desktop">{item.label}</span>
            <span className="nav-label-mobile">{item.mobile}</span>
          </button>
        ))}
      </div>

    </nav>
  )
}
