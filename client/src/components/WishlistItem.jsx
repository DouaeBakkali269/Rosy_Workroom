import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function WishlistItem({ item, onEdit, onDelete, onMarkPurchased, onRemoveImage }) {
  const { t, langKey } = useLanguage()
  const [isHovered, setIsHovered] = useState(false)
  const localeByLang = { en: 'en-US', fr: 'fr-FR', de: 'de-DE' }
  const locale = localeByLang[langKey] || 'en-US'

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
                title={t('wishlist.removeImage')}
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
              title={t('wishlist.editItem')}
            >
              ✎
            </button>
            {item.status === 'wishlist' && (
              <button
                className="icon-btn check-btn"
                onClick={() => onMarkPurchased(item.id)}
                title={t('wishlist.markPurchased')}
              >
                ✓
              </button>
            )}
            <button
              className="icon-btn delete-btn"
              onClick={() => onDelete(item.id)}
              title={t('wishlist.deleteItem')}
            >
              ✕
            </button>
          </div>
        </div>
        {item.purchased_date && (
          <p className="wishlist-item-date">
            {t('wishlist.purchasedOn')}: {new Date(item.purchased_date).toLocaleDateString(locale, { 
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
