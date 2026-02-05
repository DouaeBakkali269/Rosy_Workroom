import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getTransactions, createTransaction, deleteTransaction, getMonthlyBudget, setMonthlyBudget } from '../services/api'

export default function MoneyPage() {
  const [transactions, setTransactions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [monthlyBudget, setMonthlyBudgetState] = useState(0)
  const [budgetInput, setBudgetInput] = useState('')
  const [formData, setFormData] = useState({
    date: '',
    item: '',
    category: '',
    amount: ''
  })

  useLockBodyScroll(isModalOpen || isBudgetModalOpen)

  useEffect(() => {
    loadTransactions()
    loadMonthlyBudget()
  }, [])

  async function loadTransactions() {
    const data = await getTransactions()
    setTransactions(data)
  }

  async function loadMonthlyBudget() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    try {
      const budget = await getMonthlyBudget(year, month)
      if (budget) {
        setMonthlyBudgetState(budget.budget)
        setBudgetInput(budget.budget.toString())
      }
    } catch (err) {
      console.error('Failed to load budget:', err)
    }
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

  async function handleSaveBudget(e) {
    e.preventDefault()
    const budget = parseFloat(budgetInput)
    if (!budget || budget <= 0) return
    
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    try {
      await setMonthlyBudget({ year, month, budget })
      setMonthlyBudgetState(budget)
      setIsBudgetModalOpen(false)
    } catch (err) {
      console.error('Failed to save budget:', err)
    }
  }

  async function handleDelete(id) {
    await deleteTransaction(id)
    loadTransactions()
  }

  // Calculate totals
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const remaining = monthlyBudget - totalSpent
  const saved = Math.max(remaining, 0)
  const categoryTotals = transactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount
    return acc
  }, {})
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
  const budgetPercentage = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Money Tracker</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add transaction</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
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
        </ModalPortal>
      )}

      {isBudgetModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsBudgetModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Set Monthly Budget</h3>
                <button className="modal-close" onClick={() => setIsBudgetModalOpen(false)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={handleSaveBudget}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Budget amount"
                  required
                />
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsBudgetModalOpen(false)}>Cancel</button>
                  <button className="btn primary" type="submit">Save Budget</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Monthly overview</div>
            <button className="btn ghost" onClick={() => setIsBudgetModalOpen(true)}>Edit budget</button>
          </div>
          <div className="money-grid">
            <div>
              <div className="money-label">Budget</div>
              <div className="money-value">{monthlyBudget.toFixed(2)} MAD</div>
            </div>
            <div>
              <div className="money-label">Spent</div>
              <div className="money-value">{totalSpent.toFixed(2)} MAD</div>
            </div>
            <div>
              <div className="money-label">Saved</div>
              <div className="money-value" style={{ color: saved > 0 ? '#5b8c6a' : '#e74c3c' }}>
                {saved.toFixed(2)} MAD
              </div>
            </div>
            <div>
              <div className="money-label">Top Category</div>
              <div className="money-value">{topCategory}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Categories</div>
          <div className="tag-row">
            {Object.keys(categoryTotals).slice(0, 5).map(cat => (
              <span key={cat} className="tag">{cat}</span>
            ))}
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.min(budgetPercentage, 100)}%` }}></div>
          </div>
          <div className="progress-label">{budgetPercentage}% of budget used</div>
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
                  <td>{Number(tx.amount).toFixed(2)} MAD</td>
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
