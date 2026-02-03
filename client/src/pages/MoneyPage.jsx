import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import { getTransactions, createTransaction, deleteTransaction } from '../services/api'

export default function MoneyPage() {
  const [transactions, setTransactions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    item: '',
    category: '',
    amount: ''
  })

  useLockBodyScroll(isModalOpen)

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    const data = await getTransactions()
    setTransactions(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { date, item, category, amount } = formData
    if (!date || !item || !category || !amount) return
    await createTransaction({ ...formData, amount: parseFloat(amount) })
    setFormData({ date: '', item: '', category: '', amount: '' })
    setIsModalOpen(false)
    loadTransactions()
  }

  async function handleDelete(id) {
    await deleteTransaction(id)
    loadTransactions()
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Money Tracker</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add transaction</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Transaction</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                className="input"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <input
                className="input"
                type="text"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="Item"
                required
              />
              <input
                className="input"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
                required
              />
              <input
                className="input"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn primary" type="submit">Add Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Monthly overview</div>
          <div className="money-grid">
            <div>
              <div className="money-label">Income</div>
              <div className="money-value">$2,400</div>
            </div>
            <div>
              <div className="money-label">Spent</div>
              <div className="money-value">$1,120</div>
            </div>
            <div>
              <div className="money-label">Saved</div>
              <div className="money-value">$1,280</div>
            </div>
            <div>
              <div className="money-label">Top Category</div>
              <div className="money-value">Home</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Categories</div>
          <div className="tag-row">
            <span className="tag">Home</span>
            <span className="tag">Beauty</span>
            <span className="tag">Transport</span>
            <span className="tag">Subscriptions</span>
            <span className="tag">Gifts</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: '65%' }}></div>
          </div>
          <div className="progress-label">65% of budget used</div>
        </div>
      </div>

      <div className="card table-card">
        <div className="card-title">Recent transactions</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Category</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No transactions yet 💸</td></tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.item}</td>
                  <td>{tx.category}</td>
                  <td>${Number(tx.amount).toFixed(2)}</td>
                  <td>
                    <button className="icon-btn" onClick={() => handleDelete(tx.id)}>✕</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
