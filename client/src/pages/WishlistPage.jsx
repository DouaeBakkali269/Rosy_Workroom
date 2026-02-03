export default function WishlistPage() {
  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Wishlist & Purchases</h2>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Wishlist</div>
          <ul className="list">
            <li><span>Rose gold desk organizer</span><span>$28</span></li>
            <li><span>Soft pink office chair</span><span>$120</span></li>
            <li><span>Planner refill set</span><span>$22</span></li>
          </ul>
        </div>
        <div className="card">
          <div className="card-title">Purchased</div>
          <ul className="list">
            <li><span>Floral mousepad</span><span>Jan 25</span></li>
            <li><span>Notebook set</span><span>Jan 20</span></li>
            <li><span>Candle trio</span><span>Jan 12</span></li>
          </ul>
        </div>
      </div>
    </section>
  )
}
