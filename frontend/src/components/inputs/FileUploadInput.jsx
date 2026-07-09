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
  const [previews, setPreviews] = useState({}) // Estado para gerenciar previews

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
      // Apenas listar arquivos, sem fazer upload
      listFiles(validFiles)
    }
  }

  const listFiles = (newFiles) => {
    // Criar objetos com informações dos arquivos para exibição
    const fileObjects = newFiles.map(file => ({
      id: Date.now() + Math.random() + Math.random(), // ID temporário único
      name: file.name,
      size: file.size,
      type: file.type,
      file: file // Manter referência ao arquivo original
    }))

    // Gerar previews para imagens de forma assíncrona
    fileObjects.forEach(fileObj => {
      if (fileObj.file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviews(prev => ({
            ...prev,
            [fileObj.id]: e.target.result
          }))
        }
        reader.readAsDataURL(fileObj.file)
      }
    })

    // Adicionar à lista existente se múltiplo, ou substituir se único
    const currentFiles = Array.isArray(value) ? value : []
    const newValue = field.multiple ? [...currentFiles, ...fileObjects] : fileObjects[0]
    
    onChange?.(newValue)
    onBlur?.(newValue)
  }

  // Função de upload removida - arquivos são apenas listados
  // const uploadFiles = async (files) => { ... }

  const handleUploadFiles = async () => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadedFiles = []
      
      for (const fileObj of files) {
        const formData = new FormData()
        formData.append('file', fileObj.file)
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
            id: fileObj.id,
            name: fileObj.name,
            url: result.url,
            size: fileObj.size,
            uploaded: true
          })
        } else {
          throw new Error(`Erro ao enviar ${fileObj.name}`)
        }
      }

      // Atualizar arquivos com URLs do servidor
      const newValue = field.multiple ? uploadedFiles : uploadedFiles[0]
      onChange?.(newValue)
      onBlur?.(newValue)
      
      alert(`✅ ${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`)
      
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('❌ Erro ao enviar arquivos. Tente novamente.')
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
    // Remover preview do estado
    setPreviews(prev => {
      const newPreviews = { ...prev }
      delete newPreviews[fileId]
      return newPreviews
    })

    if (field.multiple) {
      const currentFiles = Array.isArray(value) ? value : []
      const newValue = currentFiles.filter(f => f.id !== fileId)
      onChange?.(newValue)
      onBlur?.(newValue)
    } else {
      onChange?.(null)
      onBlur?.(null)
    }
  }

  // Garantir que files seja sempre um array válido
  const files = React.useMemo(() => {
    // Se não há valor, retorna array vazio
    if (!value || value === '' || value === null || value === undefined) {
      return []
    }
    
    // Se já é um array, filtra valores válidos
    if (Array.isArray(value)) {
      return value.filter(file => file && typeof file === 'object')
    }
    
    // Se é um objeto válido, coloca em array
    if (typeof value === 'object') {
      return [value]
    }
    
    // Caso contrário, array vazio
    return []
  }, [value])

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
            <p>Processando arquivos...</p>
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

      {files && files.length > 0 && (
        <div className="uploaded-files">
          <div className="uploaded-files-header">
            <h4>Arquivos selecionados:</h4>
            <button
              type="button"
              className="upload-files-button"
              onClick={handleUploadFiles}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <>
                  <span className="upload-spinner-small"></span>
                  Enviando...
                </>
              ) : (
                <>
                  Fazer Upload
                </>
              )}
            </button>
          </div>
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className={`file-item ${file.uploaded ? 'uploaded' : ''}`}>
                <div className="file-preview">
                  {previews[file.id] ? (
                    <img src={previews[file.id]} alt={file.name} />
                  ) : file.url ? (
                    <img src={file.url} alt={file.name} />
                  ) : file.type && file.type.startsWith('image/') ? (
                    <div className="file-icon loading">🖼️</div>
                  ) : (
                    <div className="file-icon">📄</div>
                  )}
                  {file.uploaded && (
                    <div className="upload-success-badge">✓</div>
                  )}
                </div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                    {file.uploaded && <span className="uploaded-text"> • Enviado</span>}
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