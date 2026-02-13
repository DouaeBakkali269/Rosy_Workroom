import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function ImageUpload({ onImageSelect, currentImage, onRemoveImage }) {
  const { t } = useLanguage()
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    // If editing and item has an image, show it
    if (currentImage && !preview) {
      setPreview(currentImage)
    }
  }, [currentImage, preview])

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      processFile(file)
    }
  }

  function handleChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      processFile(file)
    }
  }

  function processFile(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert(t('upload.invalidType'))
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('upload.tooLarge'))
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      onImageSelect(file)
    }
    reader.readAsDataURL(file)
  }

  function handleRemove() {
    setPreview(null)
    onRemoveImage?.()
  }

  return (
    <div className="image-upload-container">
      {preview ? (
        <div className="image-preview">
          <img src={preview} alt={t('wishlist.previewAlt')} className="preview-img" />
          <button
            type="button"
            className="btn-remove-image"
            onClick={handleRemove}
            title={t('wishlist.removeImage')}
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drag-drop-content">
            <span className="drag-drop-icon">📸</span>
            <p>{t('upload.dragDrop')}</p>
            <label className="drag-drop-label">
              {t('upload.clickSelect')}
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ display: 'none' }}
              />
            </label>
            <span className="drag-drop-hint">{t('upload.maxHint')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
