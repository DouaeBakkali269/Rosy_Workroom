import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        padding: '20px 60px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(233, 157, 186, 0.2)'
      }}>
        <h2 style={{ margin: 0, color: 'rgba(233, 157, 186, 0.95)', fontSize: '24px' }}>Rosy Workroom</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn ghost" onClick={() => navigate('/login')}>Log In</button>
          <button className="btn primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </header>

      <section className="page-section active" style={{ flex: 1 }}>
        <div className="home-hero">
          <div className="home-hero-panel" style={{ display: 'flex', alignItems: 'center', gap: '0', maxWidth: 'none' }}>
            <div style={{ flex: 1 }}>
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
            <img className="home-decoration" src="/2.png" alt="Strawberry girl sticker" style={{ maxWidth: '400px', height: 'auto', flexShrink: 0 }} />
          </div>
        </div>

        <div className="project-grid" style={{ marginTop: '90px', marginLeft: '60px', marginRight: '60px' }}>
          <div className="project-card">
            <div className="project-title">📋 Projects</div>
            <p className="project-desc">
              Create and organize all your projects in one place. Add tags, set due dates, and keep track of everything 
              you're working on with a beautiful, distraction-free interface.
            </p>
            <p 
              onClick={() => navigate('/projects')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              View Projects →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">📊 Kanban Board</div>
            <p className="project-desc">
              Visualize your workflow with customizable kanban boards. Move tasks through To Do, In Progress, and Done 
              columns. Add checklists and track progress with ease.
            </p>
            <p 
              onClick={() => navigate('/projects')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Create Project →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">💸 Budget Tracker</div>
            <p className="project-desc">
              Manage your finances with monthly budgets and transaction tracking. Set budget goals, record expenses 
              and income, and see exactly where your money goes each month.
            </p>
            <p 
              onClick={() => navigate('/money')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Track Budget →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">📝 Notes</div>
            <p className="project-desc">
              Capture thoughts, ideas, and important information in a clean notepad. Perfect for journaling, 
              meeting notes, or keeping track of anything that matters to you.
            </p>
            <p 
              onClick={() => navigate('/notes')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Take Notes →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">🎯 Vision Board</div>
            <p className="project-desc">
              Define your dreams and long-term goals. Create a vision for what you want to achieve and keep 
              yourself inspired and motivated with clear, meaningful objectives.
            </p>
            <p 
              onClick={() => navigate('/vision')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Build Vision →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">🗓️ Weekly Planner</div>
            <p className="project-desc">
              Plan your week with intention. Set priorities, schedule tasks, and create weekly plans that keep 
              you focused and organized without overwhelming you.
            </p>
            <p 
              onClick={() => navigate('/week-planner')} 
              style={{ 
                marginTop: '12px', 
                color: 'rgba(233, 157, 186, 0.95)', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Plan Week →
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '60px 60px', 
        borderTop: '1px solid rgba(233, 157, 186, 0.2)',
        textAlign: 'center',
        color: 'black',
        fontSize: '14px'
      }}>
        <p style={{ margin: '0 0 10px 0' }}>Made with 💗 for gentle productivity</p>
        <p style={{ margin: '0 0 10px  0' }}>© 2026 Rosy Workroom. All rights reserved.</p>
      </footer>
    </div>
  )
}
