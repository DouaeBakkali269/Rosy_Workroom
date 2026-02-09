import { useState, useEffect } from 'react'
import useLockBodyScroll from '../hooks/useLockBodyScroll'
import ModalPortal from '../components/ModalPortal'
import ImageUpload from '../components/ImageUpload'
import WishlistItem from '../components/WishlistItem'
import ConfirmModal from '../components/ConfirmModal'
import { 
  getWishlist, 
  createWishlistItem, 
  updateWishlistItem, 
  deleteWishlistItem,
  uploadWishlistImage,
  deleteWishlistImage 
} from '../services/api'

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([])
  const [purchased, setPurchased] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [formData, setFormData] = useState({
    item: '',
    price: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, itemId: null, itemName: '' })
  const [confirmImageDelete, setConfirmImageDelete] = useState({ isOpen: false, itemId: null })

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

  function openAddModal() {
    setEditingItem(null)
    setFormData({ item: '', price: '' })
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setFormData({ item: item.item, price: item.price })
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.item.trim()) return
    
    setIsSubmitting(true)
    try {
      let itemData
      
      if (editingItem) {
        // Update existing item
        console.log('Updating item:', editingItem.id, formData)
        await updateWishlistItem(editingItem.id, {
          item: formData.item,
          price: formData.price,
          status: editingItem.status
        })
        itemData = { ...editingItem, item: formData.item, price: formData.price }
      } else {
        // Create new item
        console.log('Creating new item:', formData)
        itemData = await createWishlistItem({
          item: formData.item,
          price: formData.price || '0 MAD',
          status: 'wishlist'
        })
        console.log('Item created with ID:', itemData.id)
      }

      // Upload image if selected
      if (selectedFile && itemData.id) {
        try {
          console.log('Uploading image for item:', itemData.id)
          itemData = await uploadWishlistImage(itemData.id, selectedFile)
          console.log('Image uploaded, item data:', itemData)
        } catch (err) {
          console.error('Image upload failed:', err)
          alert('Item saved but image upload failed')
        }
      }

      setFormData({ item: '', price: '' })
      setSelectedFile(null)
      setEditingItem(null)
      setIsModalOpen(false)
      console.log('Reloading items...')
      loadItems()
    } catch (error) {
      console.error('Failed to save wishlist item:', error)
      alert('Failed to save item. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id) {
    const item = [...wishlist, ...purchased].find(i => i.id === id)
    setConfirmDelete({ 
      isOpen: true, 
      itemId: id, 
      itemName: item?.item || 'this item' 
    })
  }

  async function confirmDeleteItem() {
    try {
      await deleteWishlistItem(confirmDelete.itemId)
      setConfirmDelete({ isOpen: false, itemId: null, itemName: '' })
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

  async function handleRemoveImage(id) {
    setConfirmImageDelete({ isOpen: true, itemId: id })
  }

  async function confirmRemoveImage() {
    try {
      await deleteWishlistImage(confirmImageDelete.itemId)
      setConfirmImageDelete({ isOpen: false, itemId: null })
      loadItems()
    } catch (error) {
      console.error('Failed to remove image:', error)
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h2>Wishlist & Purchases</h2>
        <button className="btn primary" onClick={openAddModal}>Add item</button>
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingItem ? 'Edit Wishlist Item' : 'Add Wishlist Item'}</h3>
                <button 
                  className="modal-close" 
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <input
                  className="input"
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="Item name"
                  required
                  disabled={isSubmitting}
                />
                <input
                  className="input"
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Price (e.g., $50)"
                  disabled={isSubmitting}
                />

                <ImageUpload
                  onImageSelect={setSelectedFile}
                  currentImage={editingItem?.image_path}
                  onRemoveImage={() => {
                    setSelectedFile(null)
                  }}
                />

                <div className="modal-actions">
                  <button 
                    className="btn ghost" 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn primary" 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Add')} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="wishlist-sections">
        <div className="wishlist-section">
          <div className="section-title">Wishlist</div>
          {wishlist.length === 0 ? (
            <div className="empty-state">
              <p>No items in your wishlist yet. Start adding!</p>
            </div>
          ) : (
            <div className="wishlist-grid">
              {wishlist.map(item => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onMarkPurchased={handleMarkPurchased}
                  onRemoveImage={handleRemoveImage}
                />
              ))}
            </div>
          )}
        </div>

        <div className="wishlist-section">
          <div className="section-title">Purchased</div>
          {purchased.length === 0 ? (
            <div className="empty-state">
              <p>No purchased items yet.</p>
            </div>
          ) : (
            <div className="wishlist-grid">
              {purchased.map(item => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onMarkPurchased={() => {}}
                  onRemoveImage={handleRemoveImage}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={confirmDeleteItem}
        onCancel={() => setConfirmDelete({ isOpen: false, itemId: null, itemName: '' })}
        title="Delete Item"
        message={`Are you sure you want to delete "${confirmDelete.itemName}"? This action cannot be undone.`}
      />

      <ConfirmModal
        isOpen={confirmImageDelete.isOpen}
        onConfirm={confirmRemoveImage}
        onCancel={() => setConfirmImageDelete({ isOpen: false, itemId: null })}
        title="Remove Image"
        message="Are you sure you want to remove this image?"
      />
    </section>
  )
}
