export default function NotesPage() {
  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Notes</h2>
      </div>
      <div className="notes-grid">
        <div className="note-card">
          <div className="note-title">Project description</div>
          <p>Build a gentle pink workspace with tracker pages and kanban.</p>
          <div className="note-tags">
            <span>Project</span>
            <span>Design</span>
          </div>
        </div>
        <div className="note-card">
          <div className="note-title">Meeting recap</div>
          <p>Client loves the rose gradient, wants more rounded corners.</p>
          <div className="note-tags">
            <span>Client</span>
            <span>Feedback</span>
          </div>
        </div>
        <div className="note-card">
          <div className="note-title">Personal reminder</div>
          <p>Schedule wellness day after campaign launch.</p>
          <div className="note-tags">
            <span>Self-care</span>
            <span>Life</span>
          </div>
        </div>
      </div>
    </section>
  )
}
