import React, { useState } from 'react'
import './FileUploadInput.css'

const FileUploadInput = ({ 
  field, 
  value = [], 
  onChange, 
  onBlur, 
  disabled = false 
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFiles = (files) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    
    const validFiles = fileArray.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`Arquivo ${file.name} não é uma imagem válida. Use JPG, PNG, GIF ou WebP.`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        alert(`Arquivo ${file.name} é muito grande. Máximo 5MB por arquivo.`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      uploadFiles(validFiles)
    }
  }

  const uploadFiles = async (files) => {
    setUploading(true)
    try {
      const uploadedFiles = []
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fieldId', field.id)
        
        const clientToken = localStorage.getItem('clientToken')
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/upload`, {
          method: 'POST',
          headers: {
            'x-client-token': clientToken
          },
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          uploadedFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            url: result.url,
            size: file.size
          })
        } else {
          throw new Error(`Erro ao enviar ${file.name}`)
        }
      }

      const newValue = field.multiple ? [...(value || []), ...uploadedFiles] : uploadedFiles[0]
      onChange?.(newValue)
      onBlur?.(newValue)
      
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('Erro ao enviar arquivos. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleInputChange = (e) => {
    const files = e.target.files
    handleFiles(files)
    // Limpar input para permitir reenvio do mesmo arquivo
    e.target.value = ''
  }

  const removeFile = (fileId) => {
    if (field.multiple) {
      const newValue = (value || []).filter(f => f.id !== fileId)
      onChange?.(newValue)
      onBlur?.(newValue)
    } else {
      onChange?.(null)
      onBlur?.(null)
    }
  }

  const files = field.multiple ? (value || []) : (value ? [value] : [])

  return (
    <div className="file-upload-input">
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="upload-loading">
            <div className="upload-spinner"></div>
            <p>Enviando imagens...</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <p>
              <strong>Clique para selecionar</strong> ou arraste imagens aqui
            </p>
            <p className="upload-hint">
              JPG, PNG, GIF ou WebP • Máx 5MB por arquivo
              {field.multiple && ' • Múltiplos arquivos permitidos'}
            </p>
            <input
              type="file"
              accept={field.accept || 'image/*'}
              multiple={field.multiple}
              onChange={handleInputChange}
              disabled={disabled}
              className="upload-input"
            />
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="uploaded-files">
          <h4>Imagens enviadas:</h4>
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-preview">
                  {file.url && <img src={file.url} alt={file.name} />}
                </div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <button
                  type="button"
                  className="file-remove"
                  onClick={() => removeFile(file.id)}
                  disabled={disabled}
                  title="Remover arquivo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploadInput