import { useState, useEffect } from 'react'

export default function ImageUpload({ onImageSelect, currentImage, onRemoveImage }) {
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
      alert('Please upload an image file (JPG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
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
          <img src={preview} alt="Preview" className="preview-img" />
          <button
            type="button"
            className="btn-remove-image"
            onClick={handleRemove}
            title="Remove image"
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
            <p>Drag and drop your image here or</p>
            <label className="drag-drop-label">
              click to select
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ display: 'none' }}
              />
            </label>
            <span className="drag-drop-hint">Max 5MB (JPG, PNG, GIF, WebP)</span>
          </div>
        </div>
      )}
    </div>
  )
}
