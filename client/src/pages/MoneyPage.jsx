import { useState, useEffect, useCallback, useRef } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ConfirmModal from '../components/ConfirmModal'
import MonthPicker from '../components/MonthPicker'
import CategoryManager from '../components/CategoryManager'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getMonthlyBudget, setMonthlyBudget,
  getCategories, createCategory, updateCategory, deleteCategory,
  getSettings, updateSettings,
} from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const PAGE_SIZE = 8

// Compute the date range for a given year/month and cycle start day
function getCycleDates(year, month, startDay) {
  if (startDay === 1) {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
      dateTo: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDay = startDay - 1
  return {
    dateFrom: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
    dateTo: `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  }
}

export default function MoneyPage() {
  const { t } = useLanguage()

  // Budget cycle setting
  const [cycleStartDay, setCycleStartDay] = useState(1)
  const [settingsReady, setSettingsReady] = useState(false)
  const [isCycleSettingsOpen, setIsCycleSettingsOpen] = useState(false)
  const [cycleInput, setCycleInput] = useState(1)
  const activeRangeRef = useRef('')
  const tableRequestRef = useRef(0)

  // Month navigation
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  // Data
  const [transactions, setTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
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

  useLockBodyScroll(isModalOpen || isBudgetModalOpen || isCategoryManagerOpen || isBreakdownOpen || isCycleSettingsOpen || confirmDelete.isOpen)

  // Load user settings on mount
  useEffect(() => {
    getSettings()
      .then(s => {
        const day = s?.budget_cycle_start_day || 1
        setCycleStartDay(day)
        setCycleInput(day)
      })
      .catch(() => {})
      .finally(() => setSettingsReady(true))
  }, [])

  const cycleDates = getCycleDates(selectedYear, selectedMonth, cycleStartDay)

  const loadAllTransactions = useCallback(async () => {
    const { dateFrom, dateTo } = getCycleDates(selectedYear, selectedMonth, cycleStartDay)
    const rangeKey = `${dateFrom}|${dateTo}`
    activeRangeRef.current = rangeKey
    try {
      const data = await getTransactions({ dateFrom, dateTo, limit: 9999 })
      if (activeRangeRef.current !== rangeKey) return
      setAllTransactions(data.transactions || [])
    } catch (err) {
      console.error('Failed to load all transactions:', err)
    }
  }, [selectedYear, selectedMonth, cycleStartDay])

  const loadTransactions = useCallback(async (page = 1) => {
    const { dateFrom, dateTo } = getCycleDates(selectedYear, selectedMonth, cycleStartDay)
    const rangeKey = `${dateFrom}|${dateTo}`
    const requestId = ++tableRequestRef.current
    activeRangeRef.current = rangeKey
    try {
      const data = await getTransactions({
        dateFrom,
        dateTo,
        page,
        limit: PAGE_SIZE,
      })
      if (tableRequestRef.current !== requestId || activeRangeRef.current !== rangeKey) return
      setTransactions(data.transactions || [])
      setTotalPages(data.totalPages || 1)
      setTotalTransactions(data.total || 0)
      setCurrentPage(data.page || 1)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }, [selectedYear, selectedMonth, cycleStartDay])

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
    if (!settingsReady) return
    setCurrentPage(1)
    loadTransactions(1)
    loadAllTransactions()
    loadBudget()
  }, [settingsReady, selectedYear, selectedMonth, loadTransactions, loadAllTransactions, loadBudget])

  function handleMonthChange(year, month) {
    setSelectedYear(year)
    setSelectedMonth(month)
    setEditingId(null)
    setFilters({ dateFrom: '', dateTo: '', item: '', category: '' })
  }

  function clearFilters() {
    setFilters({ dateFrom: '', dateTo: '', item: '', category: '' })
    setFilterPage(1)
  }

  async function saveCycleSetting() {
    const day = Math.min(Math.max(parseInt(cycleInput) || 1, 1), 28)
    await updateSettings({ budget_cycle_start_day: day })
    setCycleStartDay(day)
    setCycleInput(day)
    setIsCycleSettingsOpen(false)
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
    loadAllTransactions()
  }

  // --- Budget ---
  async function handleSaveBudget(e) {
    e.preventDefault()
    const budget = parseFloat(budgetInput)
    if (isNaN(budget) || budget < 0) return
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
    loadAllTransactions()
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
      loadAllTransactions()
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
    const previous = categories.find(c => c.id === id)
    await updateCategory(id, data)
    await loadCategories()
    if (previous && data.name && previous.name !== data.name) {
      if (filters.category === previous.name) {
        setFilters(current => ({ ...current, category: data.name }))
      }
      await loadTransactions(currentPage)
      await loadAllTransactions()
    }
  }

  async function handleDeleteCategory(id) {
    await deleteCategory(id)
    await loadCategories()
  }

  // --- Pagination ---
  const [filterPage, setFilterPage] = useState(1)

  function goToPage(page) {
    if (hasActiveFilters) {
      setFilterPage(page)
    } else {
      if (page < 1 || page > totalPages) return
      loadTransactions(page)
    }
  }

  // --- Download PDF (lazy-loaded) ---
  async function downloadPDF() {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const autoTable = (await import('jspdf-autotable')).default
    const { dateFrom, dateTo } = getCycleDates(selectedYear, selectedMonth, cycleStartDay)
    let txList = allTransactions

    if (filters.category || filters.item || filters.dateFrom || filters.dateTo) {
      txList = allTransactions.filter(tx => {
        if (filters.dateFrom && tx.date < filters.dateFrom) return false
        if (filters.dateTo && tx.date > filters.dateTo) return false
        if (filters.item && !tx.item.toLowerCase().includes(filters.item.toLowerCase())) return false
        if (filters.category && tx.category !== filters.category) return false
        return true
      })
    }

    const doc = new jsPDF()
    const title = `${t('money.title')} - ${dateFrom} to ${dateTo}`

    doc.setFontSize(16)
    doc.setTextColor(142, 75, 109)
    doc.text(title, 14, 18)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`${t('money.budgetLabel')}: ${monthlyBudget.toFixed(2)} MAD`, 14, 26)
    const pdfTotalSpent = txList.reduce((sum, tx) => sum + tx.amount, 0)
    doc.text(`${t('money.spentLabel')}: ${pdfTotalSpent.toFixed(2)} MAD`, 14, 32)
    doc.text(`${t('money.remainingLabel')}: ${(monthlyBudget - pdfTotalSpent).toFixed(2)} MAD`, 14, 38)

    if (hasActiveFilters) {
      doc.setFontSize(9)
      doc.setTextColor(180, 120, 150)
      const filterParts = []
      if (filters.category) filterParts.push(`${t('money.tableCategory')}: ${filters.category}`)
      if (filters.item) filterParts.push(`${t('money.tableItem')}: ${filters.item}`)
      if (filters.dateFrom) filterParts.push(`${t('money.filterFrom')}: ${filters.dateFrom}`)
      if (filters.dateTo) filterParts.push(`${t('money.filterTo')}: ${filters.dateTo}`)
      doc.text(`Filters: ${filterParts.join(' | ')}`, 14, 44)
    }

    autoTable(doc, {
      startY: hasActiveFilters ? 50 : 44,
      head: [[t('money.tableDate'), t('money.tableItem'), t('money.tableCategory'), `${t('money.tableAmount')} (MAD)`]],
      body: txList.map(tx => [tx.date, tx.item, tx.category, tx.amount.toFixed(2)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [142, 75, 109], textColor: 255 },
      alternateRowStyles: { fillColor: [252, 245, 248] },
      foot: [[
        '', '', t('money.spentLabel'),
        pdfTotalSpent.toFixed(2)
      ]],
      footStyles: { fillColor: [142, 75, 109], textColor: 255, fontStyle: 'bold' },
    })

    const fileName = `transactions_${dateFrom}_${dateTo}.pdf`
    doc.save(fileName)
  }

  // --- Filtered transactions ---
  // When filters active: filter ALL transactions client-side, then paginate client-side
  // When no filters: use server-paginated results directly
  const allFiltered = hasActiveFilters
    ? allTransactions.filter(tx => {
        if (filters.dateFrom && tx.date < filters.dateFrom) return false
        if (filters.dateTo && tx.date > filters.dateTo) return false
        if (filters.item && !tx.item.toLowerCase().includes(filters.item.toLowerCase())) return false
        if (filters.category && tx.category !== filters.category) return false
        return true
      })
    : null

  const displayPage = hasActiveFilters ? filterPage : currentPage
  const displayTotalPages = hasActiveFilters
    ? Math.max(1, Math.ceil((allFiltered?.length || 0) / PAGE_SIZE))
    : totalPages
  const displayTotal = hasActiveFilters ? (allFiltered?.length || 0) : totalTransactions

  const filteredTransactions = hasActiveFilters
    ? (allFiltered || []).slice((filterPage - 1) * PAGE_SIZE, filterPage * PAGE_SIZE)
    : transactions

  // --- Computed Stats (from ALL transactions in the month, not just the current page) ---
  const totalSpent = allTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const remaining = monthlyBudget - totalSpent
  const saved = Math.max(remaining, 0)
  const budgetPercentage = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0

  // Category breakdown (from ALL transactions in the month)
  const categoryTotals = allTransactions.reduce((acc, tx) => {
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
        cycleStartDay={cycleStartDay}
        onSettingsClick={() => { setCycleInput(cycleStartDay); setIsCycleSettingsOpen(true) }}
        settingsTitle={t('money.cycleSettings')}
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

      {/* Cycle Settings Modal */}
      {isCycleSettingsOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsCycleSettingsOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
              <div className="modal-header">
                <h3>{t('money.cycleSettings')}</h3>
                <button className="modal-close" onClick={() => setIsCycleSettingsOpen(false)}>✕</button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: 13, color: '#777', marginBottom: 14, lineHeight: 1.5 }}>
                  {t('money.cycleDescription')}
                </p>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#8e4b6d', marginBottom: 6, display: 'block' }}>
                  {t('money.cycleStartDay')}
                </label>
                <select
                  className="input"
                  value={cycleInput}
                  onChange={(e) => setCycleInput(parseInt(e.target.value))}
                  style={{ marginBottom: 16 }}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>
                      {d === 1 ? `1 (${t('money.cycleCalendarDefault')})` : d}
                    </option>
                  ))}
                </select>
                {cycleInput !== 1 && (
                  <p style={{ fontSize: 12, color: '#b07a99', marginBottom: 14, background: 'rgba(233,176,202,0.15)', padding: '8px 10px', borderRadius: 8 }}>
                    {t('money.cyclePreview')}: {cycleInput} → {cycleInput - 1}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn ghost" onClick={() => setIsCycleSettingsOpen(false)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn primary" onClick={saveCycleSetting}>
                    {t('common.save')}
                  </button>
                </div>
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
          <div className="tag-row" style={{ flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const isActive = filters.category === cat.name
              return (
                <span
                  key={cat.id}
                  className="tag"
                  onClick={() => {
                    if (isActive) {
                      setFilters({ ...filters, category: '' })
                    } else {
                      setFilters({ ...filters, category: cat.name })
                      setShowFilters(true)
                    }
                    setFilterPage(1)
                  }}
                  style={{
                    borderLeft: `3px solid ${cat.color}`,
                    cursor: 'pointer',
                    background: isActive ? cat.color + '22' : undefined,
                    outline: isActive ? `2px solid ${cat.color}` : 'none',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.name}
                </span>
              )
            })}
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
            <button
              className="icon-btn"
              onClick={downloadPDF}
              title={t('money.downloadPDF')}
              style={{ fontSize: 15, color: '#8e4b6d' }}
            >⤓</button>
            <span style={{ fontSize: 13, color: '#999' }}>
              {hasActiveFilters ? displayTotal + ' / ' : ''}{totalTransactions} {t('money.totalTransactions')}
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
            disabled={displayPage <= 1}
            onClick={() => goToPage(displayPage - 1)}
          >
            ‹
          </button>
          {displayTotalPages <= 7
            ? Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${displayPage === p ? 'active' : ''}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))
            : Array.from({ length: displayTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === displayTotalPages || Math.abs(p - displayPage) <= 1)
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
                      className={`pagination-btn ${displayPage === item ? 'active' : ''}`}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
                  )
                )
          }
          <button
            className="pagination-btn"
            disabled={displayPage >= displayTotalPages}
            onClick={() => goToPage(displayPage + 1)}
          >
            ›
          </button>
          <span className="pagination-info">
            {t('money.page')} {displayPage} {t('money.of')} {displayTotalPages}
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
