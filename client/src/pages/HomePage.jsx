export default function HomePage({ onNavigate }) {
  const handleNavigate = (page) => {
    if (onNavigate) onNavigate(page)
  }

  return (
    <section className="page-section active" id="home">
      <div className="home-hero">
        <div className="home-hero-panel">
          <img className="home-decoration" src="/2.png" alt="Strawberry girl sticker" />
          <h1 className="home-title">Strawberry Bloom Studio</h1>
          <p className="home-subtitle">A sweet space for planning, tracking, and dreamy focus.</p>
          <p className="home-description">
            Organize projects, money, notes, and goals in one cozy place. 
            Set gentle priorities, track your wins, and keep your days soft and intentional.
          </p>
          <div className="hero-actions">
            <div className="hero-actions-row hero-actions-row-1">
              <button className="btn primary hero-btn" onClick={() => handleNavigate('projects')}>Plan Your Projects</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('week-planner')}>Plan Your Week</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('money')}>Track Your Money</button>
            </div>
            <div className="hero-actions-row hero-actions-row-2">
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('vision')}>Add Your Goals</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('notes')}>Take Notes</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
