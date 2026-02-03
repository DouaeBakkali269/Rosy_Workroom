import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([])
  const [purchased, setPurchased] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    item: '',
    price: ''
  })

  useLockBodyScroll(isModalOpen)

  useEffect(() => {
    // Load from localStorage
    const savedWishlist = localStorage.getItem('wishlist')
    const savedPurchased = localStorage.getItem('purchased')
    
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    } else {
      setWishlist([
        { id: 1, item: 'Rose gold desk organizer', price: '$28' },
        { id: 2, item: 'Soft pink office chair', price: '$120' },
        { id: 3, item: 'Planner refill set', price: '$22' }
      ])
    }
    
    if (savedPurchased) {
      setPurchased(JSON.parse(savedPurchased))
    } else {
      setPurchased([
        { id: 1, item: 'Floral mousepad', date: 'Jan 25' },
        { id: 2, item: 'Notebook set', date: 'Jan 20' },
        { id: 3, item: 'Candle trio', date: 'Jan 12' }
      ])
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!formData.item.trim()) return
    
    const newItem = {
      id: Date.now(),
      item: formData.item,
      price: formData.price || '$0'
    }
    
    const updated = [...wishlist, newItem]
    setWishlist(updated)
    localStorage.setItem('wishlist', JSON.stringify(updated))
    setFormData({ item: '', price: '' })
    setIsModalOpen(false)
  }

  function handleDelete(id) {
    const updated = wishlist.filter(w => w.id !== id)
    setWishlist(updated)
    localStorage.setItem('wishlist', JSON.stringify(updated))
  }

  function handleMarkPurchased(id) {
    const item = wishlist.find(w => w.id === id)
    if (item) {
      const newPurchased = [...purchased, {
        id: Date.now(),
        item: item.item,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      }]
      setPurchased(newPurchased)
      localStorage.setItem('purchased', JSON.stringify(newPurchased))
      handleDelete(id)
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Wishlist & Purchases</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add item</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Wishlist Item</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                className="input"
                type="text"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="Item name"
                required
              />
              <input
                className="input"
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Price (e.g., $50)"
              />
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn primary" type="submit">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Wishlist</div>
          <ul className="list">
            {wishlist.map(w => (
              <li key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{w.item}</span>
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>{w.price}</span>
                  <button className="icon-btn" onClick={() => handleMarkPurchased(w.id)}>✓</button>
                  <button className="icon-btn" onClick={() => handleDelete(w.id)}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-title">Purchased</div>
          <ul className="list">
            {purchased.map(p => (
              <li key={p.id}>
                <span>{p.item}</span>
                <span>{p.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
