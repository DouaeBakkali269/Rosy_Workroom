export default function HomePage() {
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
            <button className="btn primary">Start a focus session</button>
            <button className="btn ghost">Plan my week</button>
          </div>
        </div>
      </div>
    </section>
  )
}
