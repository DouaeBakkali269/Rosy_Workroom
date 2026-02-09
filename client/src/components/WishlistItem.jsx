import { useState } from 'react'

export default function WishlistItem({ item, onEdit, onDelete, onMarkPurchased, onRemoveImage }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="wishlist-item-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="wishlist-item-image">
        {item.image_path ? (
          <>
            <img src={item.image_path} alt={item.item} className="wishlist-img" />
            {isHovered && (
              <button
                className="btn-remove-wishlist-image"
                onClick={() => onRemoveImage(item.id)}
                title="Remove image"
              >
                ✕
              </button>
            )}
          </>
        ) : (
          <div className="wishlist-img-placeholder">
            <span>📷</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="wishlist-item-content">
        <h3 className="wishlist-item-name">{item.item}</h3>
        <div className="wishlist-item-footer">
          <p className="wishlist-item-price">{item.price} MAD</p>
          <div className="wishlist-item-actions">
            <button
              className="icon-btn"
              onClick={() => onEdit(item)}
              title="Edit item"
            >
              ✎
            </button>
            {item.status === 'wishlist' && (
              <button
                className="icon-btn check-btn"
                onClick={() => onMarkPurchased(item.id)}
                title="Mark as purchased"
              >
                ✓
              </button>
            )}
            <button
              className="icon-btn delete-btn"
              onClick={() => onDelete(item.id)}
              title="Delete item"
            >
              ✕
            </button>
          </div>
        </div>
        {item.purchased_date && (
          <p className="wishlist-item-date">
            Purchased: {new Date(item.purchased_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        )}
      </div>
    </div>
  )
}
