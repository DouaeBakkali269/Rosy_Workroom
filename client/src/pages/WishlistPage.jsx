import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import { getWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem } from '../services/api'

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
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getWishlist()
      setWishlist(data.filter(item => item.status === 'wishlist'))
      setPurchased(data.filter(item => item.status === 'purchased'))
    } catch (error) {
      console.error('Failed to load wishlist:', error)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.item.trim()) return
    
    try {
      await createWishlistItem({
        item: formData.item,
        price: formData.price || '0 MAD',
        status: 'wishlist'
      })
      setFormData({ item: '', price: '' })
      setIsModalOpen(false)
      loadItems()
    } catch (error) {
      console.error('Failed to create wishlist item:', error)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteWishlistItem(id)
      loadItems()
    } catch (error) {
      console.error('Failed to delete wishlist item:', error)
    }
  }

  async function handleMarkPurchased(id) {
    try {
      await updateWishlistItem(id, {
        status: 'purchased',
        purchased_date: new Date().toISOString().split('T')[0]
      })
      loadItems()
    } catch (error) {
      console.error('Failed to mark item as purchased:', error)
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Wishlist & Purchases</h2>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>Add item</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
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
        </ModalPortal>
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
                <span>{new Date(p.purchased_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
