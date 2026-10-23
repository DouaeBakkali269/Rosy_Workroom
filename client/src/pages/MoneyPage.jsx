import { useState, useEffect, useCallback } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import MonthPicker from '../components/MonthPicker'
import CategoryManager from '../components/CategoryManager'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getMonthlyBudget, setMonthlyBudget,
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const PAGE_SIZE = 8

export default function MoneyPage() {
  const { t } = useLanguage()

  // Month navigation
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  // Data
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [monthlyBudget, setMonthlyBudgetState] = useState(0)
  const [budgetInput, setBudgetInput] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, txId: null, txLabel: '' })

  // Inline editing
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', item: '', category: '', amount: '' })

  // Add form
  const [formData, setFormData] = useState({ date: '', item: '', category: '', amount: '' })

  // Filters
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', item: '', category: '' })
  const [showFilters, setShowFilters] = useState(false)

  useLockBodyScroll(isModalOpen || isBudgetModalOpen || isCategoryManagerOpen || isBreakdownOpen || confirmDelete.isOpen)

  const loadTransactions = useCallback(async (page = 1) => {
    try {
      const data = await getTransactions({
        year: selectedYear,
        month: selectedMonth,
        page,
        limit: PAGE_SIZE,
      })
      setTransactions(data.transactions || [])
      setTotalPages(data.totalPages || 1)
      setTotalTransactions(data.total || 0)
      setCurrentPage(data.page || 1)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }, [selectedYear, selectedMonth])

  const loadBudget = useCallback(async () => {
    try {
      const budget = await getMonthlyBudget(selectedYear, selectedMonth)
      if (budget) {
        setMonthlyBudgetState(budget.budget)
        setBudgetInput(budget.budget.toString())
      } else {
        setMonthlyBudgetState(0)
        setBudgetInput('')
      }
    } catch (err) {
      console.error('Failed to load budget:', err)
    }
  }, [selectedYear, selectedMonth])

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    setCurrentPage(1)
    loadTransactions(1)
    loadBudget()
  }, [selectedYear, selectedMonth, loadTransactions, loadBudget])

  function handleMonthChange(year, month) {
    setSelectedYear(year)
    setSelectedMonth(month)
    setEditingId(null)
    setFilters({ dateFrom: '', dateTo: '', item: '', category: '' })
  }

  function clearFilters() {
    setFilters({ dateFrom: '', dateTo: '', item: '', category: '' })
  }

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.item || filters.category

  // --- Add Transaction ---
  async function handleSubmit(e) {
    e.preventDefault()
    const { date, item, category, amount } = formData
    if (!date || !item || !category || !amount) return
    await createTransaction({ ...formData, amount: parseFloat(amount) })
    setFormData({ date: '', item: '', category: '', amount: '' })
    setIsModalOpen(false)
    loadTransactions(1)
  }

  // --- Budget ---
  async function handleSaveBudget(e) {
    e.preventDefault()
    const budget = parseFloat(budgetInput)
    if (!budget || budget <= 0) return
    try {
      await setMonthlyBudget({ year: selectedYear, month: selectedMonth, budget })
      setMonthlyBudgetState(budget)
      setIsBudgetModalOpen(false)
    } catch (err) {
      console.error('Failed to save budget:', err)
    }
  }

  // --- Delete Transaction ---
  function handleDelete(id) {
    const tx = transactions.find(item => item.id === id)
    setConfirmDelete({ isOpen: true, txId: id, txLabel: tx?.item || t('money.thisTransaction') })
  }

  async function confirmDeleteTransaction() {
    await deleteTransaction(confirmDelete.txId)
    setConfirmDelete({ isOpen: false, txId: null, txLabel: '' })
    loadTransactions(currentPage)
  }

  // --- Inline Edit ---
  function startEdit(tx) {
    setEditingId(tx.id)
    setEditForm({
      date: tx.date,
      item: tx.item,
      category: tx.category,
      amount: tx.amount.toString(),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ date: '', item: '', category: '', amount: '' })
  }

  async function saveEdit() {
    if (!editForm.date || !editForm.item || !editForm.category || !editForm.amount) return
    try {
      await updateTransaction(editingId, {
        date: editForm.date,
        item: editForm.item,
        category: editForm.category,
        amount: parseFloat(editForm.amount),
      })
      setEditingId(null)
      loadTransactions(currentPage)
    } catch (err) {
      console.error('Failed to update transaction:', err)
    }
  }

  // --- Category CRUD callbacks ---
  async function handleAddCategory(data) {
    await createCategory(data)
    await loadCategories()
  }

  async function handleUpdateCategory(id, data) {
    await updateCategory(id, data)
    await loadCategories()
  }

  async function handleDeleteCategory(id) {
    await deleteCategory(id)
    await loadCategories()
  }

  // --- Pagination ---
  function goToPage(page) {
    if (page < 1 || page > totalPages) return
    loadTransactions(page)
  }

  // --- Filtered transactions ---
  const filteredTransactions = transactions.filter(tx => {
    if (filters.dateFrom && tx.date < filters.dateFrom) return false
    if (filters.dateTo && tx.date > filters.dateTo) return false  // same from & to = show that exact date
    if (filters.item && !tx.item.toLowerCase().includes(filters.item.toLowerCase())) return false
    if (filters.category && tx.category !== filters.category) return false
    return true
  })

  // --- Computed Stats ---
  const totalSpent = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const remaining = monthlyBudget - totalSpent
  const saved = Math.max(remaining, 0)
  const budgetPercentage = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0

  // Category breakdown
  const categoryTotals = filteredTransactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount
    return acc
  }, {})
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || t('common.none')

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)

  function getCategoryColor(name) {
    const cat = categories.find(c => c.name === name)
    return cat?.color || '#c4c4c4'
  }

  return (
    <section className="page-section active">
      {/* Header with month picker */}
      <div className="section-header">
        <h2>{t('money.title')}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn ghost" onClick={() => setIsCategoryManagerOpen(true)}>
            {t('money.manageCategories')}
          </button>
          <button className="btn primary" onClick={() => setIsModalOpen(true)}>
            {t('money.addTransaction')}
          </button>
        </div>
      </div>

      <MonthPicker
        year={selectedYear}
        month={selectedMonth}
        onChange={handleMonthChange}
      />

      {/* Add Transaction Modal */}
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
                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">{t('money.categoryPlaceholder')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
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
                  <button className="btn ghost" type="button" onClick={() => {
                    setFormData({ date: '', item: '', category: '', amount: '' })
                    setIsModalOpen(false)
                  }}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn primary" type="submit">
                    {t('money.addTransactionButton')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Budget Modal */}
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
                  <button className="btn ghost" type="button" onClick={() => setIsBudgetModalOpen(false)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn primary" type="submit">
                    {t('money.saveBudget')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
      />

      {/* Spending Breakdown Popup */}
      {isBreakdownOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsBreakdownOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3>{t('money.spendingBreakdown')}</h3>
                <button className="modal-close" onClick={() => setIsBreakdownOpen(false)}>✕</button>
              </div>
              <div style={{ padding: '16px 20px', maxHeight: 400, overflowY: 'auto' }}>
                {sortedCategories.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20, textAlign: 'center' }}>
                    {t('money.noTransactions')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {sortedCategories.map(([catName, catTotal]) => {
                      const pct = totalSpent > 0 ? Math.round((catTotal / totalSpent) * 100) : 0
                      return (
                        <div key={catName}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: getCategoryColor(catName) }} />
                              {catName}
                            </span>
                            <span style={{ fontSize: 13, color: '#888' }}>
                              {catTotal.toFixed(2)} MAD · {pct}%
                            </span>
                          </div>
                          <div className="progress" style={{ height: 8 }}>
                            <div
                              className="progress-bar"
                              style={{ width: `${pct}%`, background: getCategoryColor(catName) }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ borderTop: '1px solid rgba(233,176,202,0.3)', paddingTop: 12, marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                        <span>Total</span>
                        <span>{totalSpent.toFixed(2)} MAD</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Overview Cards */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">{t('money.monthlyOverview')}</div>
          <div className="money-grid">
            <div>
              <div className="money-label">{t('money.budgetLabel')}</div>
              <div className="money-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {monthlyBudget.toFixed(2)} MAD
                <button
                  className="icon-btn"
                  onClick={() => setIsBudgetModalOpen(true)}
                  title={t('money.editBudget')}
                  style={{ fontSize: 14, opacity: 0.6 }}
                >
                  ✎
                </button>
              </div>
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
          <div className="card-header">
            <div className="card-title">{t('money.categories')}</div>
            <button className="btn primary" onClick={() => setIsBreakdownOpen(true)}>
              {t('money.spendingBreakdown')}
            </button>
          </div>
          <div className="tag-row">
            {Object.keys(categoryTotals).slice(0, 5).map(cat => (
              <span
                key={cat}
                className="tag"
                style={{ borderLeft: `3px solid ${getCategoryColor(cat)}` }}
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.min(budgetPercentage, 100)}%` }}></div>
          </div>
          <div className="progress-label">{budgetPercentage}% {t('money.budgetUsed')}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card table-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">{t('money.recentTransactions')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasActiveFilters && (
              <button className="btn ghost" onClick={clearFilters} style={{ fontSize: 12, padding: '4px 10px' }}>
                {t('money.clearFilters')}
              </button>
            )}
            <button
              className={`btn ${showFilters ? 'primary' : 'ghost'}`}
              onClick={() => setShowFilters(f => !f)}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              {t('money.toggleFilters')}
            </button>
            <span style={{ fontSize: 13, color: '#999' }}>
              {hasActiveFilters ? filteredTransactions.length + ' / ' : ''}{totalTransactions} {t('money.totalTransactions')}
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('money.tableDate')}</th>
              <th>{t('money.tableItem')}</th>
              <th>{t('money.tableCategory')}</th>
              <th>{t('money.tableAmount')}</th>
              <th></th>
            </tr>
            {showFilters && (
              <tr className="filter-row">
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 10, color: '#8e4b6d', fontWeight: 600 }}>{t('money.filterFrom')}</span>
                    <input
                      className="input input-sm"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      style={{ width: 'auto', maxWidth: 120, padding: '2px 4px' }}
                    />
                    <span style={{ fontSize: 10, color: '#8e4b6d', fontWeight: 600 }}>{t('money.filterTo')}</span>
                    <input
                      className="input input-sm"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      style={{ width: 'auto', maxWidth: 120, padding: '2px 4px' }}
                    />
                  </div>
                </th>
                <th>
                  <input
                    className="input input-sm"
                    type="text"
                    value={filters.item}
                    onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                    placeholder={t('money.filterItem')}
                  />
                </th>
                <th>
                  <select
                    className="input input-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">{t('money.filterAllCategories')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </th>
                <th></th>
                <th></th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">{t('money.noTransactions')} 💸</td></tr>
            ) : (
              filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  {editingId === tx.id ? (
                    <>
                      <td>
                        <input
                          className="input input-sm"
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          type="text"
                          value={editForm.item}
                          onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="input input-sm"
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        >
                          <option value="">{t('money.categoryPlaceholder')}</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="input input-sm"
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="icon-btn" onClick={saveEdit} title={t('money.saveEdit')}>✓</button>
                          <button className="icon-btn" onClick={cancelEdit} title={t('money.cancelEdit')}>✕</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{tx.date}</td>
                      <td>{tx.item}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: getCategoryColor(tx.category),
                              display: 'inline-block',
                            }}
                          />
                          {tx.category}
                        </span>
                      </td>
                      <td>{Number(tx.amount).toFixed(2)} MAD</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="icon-btn" onClick={() => startEdit(tx)} title={t('money.editTransaction')}>✎</button>
                          <button className="icon-btn" onClick={() => handleDelete(tx.id)}>✕</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination — always visible */}
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            ‹
          </button>
          {totalPages <= 7
            ? Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${currentPage === p ? 'active' : ''}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))
            : Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((item, i) =>
                  item === '...' ? (
                    <span key={`dots-${i}`} className="pagination-dots">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
                  )
                )
          }
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            ›
          </button>
          <span className="pagination-info">
            {t('money.page')} {currentPage} {t('money.of')} {totalPages}
          </span>
        </div>
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
