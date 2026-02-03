export default function Navbar({ activePage, onNavigate }) {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Projects' },
    { id: 'money', label: 'Money' },
    { id: 'notes', label: 'Notes' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'vision', label: 'Vision 2026' }
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
          >
            {item.label}
          </button>
        ))}
      </div>

    </nav>
  )
}
