import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page-container">
      {/* Header */}
      <header className="landing-header">
        <h2 className="landing-logo">Rosy Workroom</h2>
        <div className="landing-header-buttons">
          <button className="btn ghost" onClick={() => navigate('/login')}>Log In</button>
          <button className="btn primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </header>

      <section className="page-section active landing-main-section">
        <div className="home-hero">
          <div className="home-hero-panel landing-hero-panel">
            <div className="landing-hero-text">
              <h1 className="home-title">Rosy Workroom</h1>
              <p className="home-subtitle">A gentle workspace to plan, track, and bloom.</p>
              <p className="home-description">
                One cozy place for projects, kanban tasks, budgets, notes, goals, and weekly planning.
                Designed with a soft pink palette and calm focus to make progress feel lovely.
              </p>

              <div className="hero-actions">
                <div className="hero-actions-row hero-actions-row-1">
                  <button className="btn primary hero-btn" onClick={() => navigate('/signup')}>Get Started</button>
                  <button className="btn ghost hero-btn" onClick={() => navigate('/login')}>Log In</button>
                </div>
              </div>
            </div>
            <div className="landing-image-container">
              <img className="home-decoration" src="/2.png" alt="Strawberry girl sticker" />
            </div>
          </div>
        </div>

        <div className="project-grid landing-project-grid">
          <div className="project-card">
            <div className="project-title">📋 Projects</div>
            <p className="project-desc">
              Create and organize all your projects in one place. Add tags, set due dates, and keep track of everything 
              you're working on with a beautiful, distraction-free interface.
            </p>
            <p onClick={() => navigate('/projects')} className="project-card-link">
              View Projects →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">📊 Kanban Board</div>
            <p className="project-desc">
              Visualize your workflow with customizable kanban boards. Move tasks through To Do, In Progress, and Done 
              columns. Add checklists and track progress with ease.
            </p>
            <p onClick={() => navigate('/projects')} className="project-card-link">
              Create Project →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">💸 Budget Tracker</div>
            <p className="project-desc">
              Manage your finances with monthly budgets and transaction tracking. Set budget goals, record expenses 
              and income, and see exactly where your money goes each month.
            </p>
            <p onClick={() => navigate('/money')} className="project-card-link">
              Track Budget →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">📝 Notes</div>
            <p className="project-desc">
              Capture thoughts, ideas, and important information in a clean notepad. Perfect for journaling, 
              meeting notes, or keeping track of anything that matters to you.
            </p>
            <p onClick={() => navigate('/notes')} className="project-card-link">
              Take Notes →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">🎯 Vision Board</div>
            <p className="project-desc">
              Define your dreams and long-term goals. Create a vision for what you want to achieve and keep 
              yourself inspired and motivated with clear, meaningful objectives.
            </p>
            <p onClick={() => navigate('/vision')} className="project-card-link">
              Build Vision →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">🗓️ Weekly Planner</div>
            <p className="project-desc">
              Plan your week with intention. Set priorities, schedule tasks, and create weekly plans that keep 
              you focused and organized without overwhelming you.
            </p>
            <p onClick={() => navigate('/week-planner')} className="project-card-link">
              Plan Week →
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="landing-footer-text">Made with 💗 for gentle productivity</p>
        <p className="landing-footer-text">© 2026 Rosy Workroom. All rights reserved.</p>
      </footer>
    </div>
  )
}
