import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import { getTransactions, createTransaction, deleteTransaction, getMonthlyBudget, setMonthlyBudget } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

export default function MoneyPage() {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, txId: null, txLabel: '' })
  const [monthlyBudget, setMonthlyBudgetState] = useState(0)
  const [budgetInput, setBudgetInput] = useState('')
  const [formData, setFormData] = useState({
    date: '',
    item: '',
    category: '',
    amount: ''
  })

  useLockBodyScroll(isModalOpen || isBudgetModalOpen || confirmDelete.isOpen)

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

  function handleDelete(id) {
    const tx = transactions.find(item => item.id === id)
    setConfirmDelete({
      isOpen: true,
      txId: id,
      txLabel: tx?.item || t('money.thisTransaction')
    })
  }

  async function confirmDeleteTransaction() {
    await deleteTransaction(confirmDelete.txId)
    setConfirmDelete({ isOpen: false, txId: null, txLabel: '' })
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
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || t('common.none')
  const budgetPercentage = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>{t('money.title')}</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>{t('money.addTransaction')}</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('money.addTransactionTitle')}</h3>
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
                  placeholder={t('money.itemPlaceholder')}
                  required
                />
                <input
                  className="input"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('money.categoryPlaceholder')}
                  required
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={t('money.amountPlaceholder')}
                  required
                />
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('money.addTransactionButton')}</button>
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
                <h3>{t('money.setBudgetTitle')}</h3>
                <button className="modal-close" onClick={() => setIsBudgetModalOpen(false)}>✕</button>
              </div>
              <form className="modal-form" onSubmit={handleSaveBudget}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder={t('money.budgetPlaceholder')}
                  required
                />
                <div className="modal-actions">
                  <button className="btn ghost" type="button" onClick={() => setIsBudgetModalOpen(false)}>{t('common.cancel')}</button>
                  <button className="btn primary" type="submit">{t('money.saveBudget')}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('money.monthlyOverview')}</div>
            <button className="btn ghost" onClick={() => setIsBudgetModalOpen(true)}>{t('money.editBudget')}</button>
          </div>
          <div className="money-grid">
            <div>
              <div className="money-label">{t('money.budgetLabel')}</div>
              <div className="money-value">{monthlyBudget.toFixed(2)} MAD</div>
            </div>
            <div>
              <div className="money-label">{t('money.spentLabel')}</div>
              <div className="money-value">{totalSpent.toFixed(2)} MAD</div>
            </div>
            <div>
              <div className="money-label">{t('money.savedLabel')}</div>
              <div className="money-value" style={{ color: saved > 0 ? '#5b8c6a' : '#e74c3c' }}>
                {saved.toFixed(2)} MAD
              </div>
            </div>
            <div>
              <div className="money-label">{t('money.topCategory')}</div>
              <div className="money-value">{topCategory}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t('money.categories')}</div>
          <div className="tag-row">
            {Object.keys(categoryTotals).slice(0, 5).map(cat => (
              <span key={cat} className="tag">{cat}</span>
            ))}
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.min(budgetPercentage, 100)}%` }}></div>
          </div>
          <div className="progress-label">{budgetPercentage}% {t('money.budgetUsed')}</div>
        </div>
      </div>

      <div className="card table-card">
        <div className="card-title">{t('money.recentTransactions')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('money.tableDate')}</th>
              <th>{t('money.tableItem')}</th>
              <th>{t('money.tableCategory')}</th>
              <th>{t('money.tableAmount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">{t('money.noTransactions')} 💸</td></tr>
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
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setConfirmDelete({ isOpen: false, txId: null, txLabel: '' })}
        title={t('money.deleteTitle')}
        message={t('money.deleteMessage').replace('{tx}', confirmDelete.txLabel)}
      />
    </section>
  )
}
