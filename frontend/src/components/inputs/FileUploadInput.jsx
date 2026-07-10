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
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

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
      file: file instanceof File ? file : null // Garantir que é um File válido
    }))

    // Gerar previews para imagens de forma assíncrona
    fileObjects.forEach(fileObj => {
      if (fileObj.file && fileObj.file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviews(prev => ({
            ...prev,
            [fileObj.id]: e.target.result
          }))
        }
        reader.onerror = (error) => {
          console.error('Erro ao ler arquivo:', error)
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
    // Filtrar apenas arquivos que ainda não foram enviados
    const filesToUpload = files.filter(file => !file.uploaded && file.file)
    
    if (filesToUpload.length === 0) {
      alert('Todos os arquivos já foram enviados!')
      return
    }

    console.log('📤 Iniciando upload de', filesToUpload.length, 'arquivo(s)...');
    
    setUploading(true)
    try {
      const uploadedFiles = []
      
      for (const fileObj of filesToUpload) {
        console.log('📁 Fazendo upload:', fileObj.name);
        
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
          console.log('✅ Upload bem-sucedido:', result);
          
          // Validar se a resposta tem URL
          if (!result.url) {
            console.error('⚠️ Resposta do servidor sem URL:', result);
            throw new Error(`Upload de ${fileObj.name} não retornou URL válida`);
          }
          
          uploadedFiles.push({
            id: fileObj.id,
            name: result.originalName || fileObj.name,
            url: result.url, // URL do servidor ou data URL
            size: fileObj.size,
            type: fileObj.type,
            uploaded: true,
            filename: result.filename, // Nome do arquivo no servidor
            isTemporary: result.isTemporary || false
            // Não incluir a propriedade 'file' para arquivos enviados
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          console.error('❌ Erro no upload:', errorData);
          throw new Error(`Erro ao enviar ${fileObj.name}: ${errorData.error || response.statusText}`)
        }
      }

      // Atualizar lista de arquivos: manter os já enviados e adicionar os novos
      const existingUploaded = files.filter(file => file.uploaded)
      const allUploadedFiles = [...existingUploaded, ...uploadedFiles]
      
      // Limpar arquivos para remover propriedades desnecessárias antes de enviar ao backend
      const cleanedFiles = allUploadedFiles.map(file => {
        const cleanFile = { ...file }
        // Remover propriedade 'file' que não deve ser serializada, mas manter outras propriedades essenciais
        delete cleanFile.file
        // Garantir que propriedades essenciais estão presentes
        if (!cleanFile.url && file.url) {
          cleanFile.url = file.url
        }
        if (!cleanFile.uploaded) {
          cleanFile.uploaded = true
        }
        
        console.log('🧹 Arquivo limpo para salvar:', {
          id: cleanFile.id,
          name: cleanFile.name,
          url: cleanFile.url ? (cleanFile.url.length > 50 ? cleanFile.url.substring(0, 50) + '...' : cleanFile.url) : 'SEM URL',
          uploaded: cleanFile.uploaded
        });
        
        return cleanFile
      })
      
      console.log('💾 Salvando', cleanedFiles.length, 'arquivo(s) no formulário...');
      
      // Atualizar valor do campo
      const newValue = field.multiple ? cleanedFiles : (cleanedFiles[0] || null)
      
      // Chamar onChange primeiro para atualizar estado local
      onChange?.(newValue)
      
      // Aguardar um pouco antes de chamar onBlur para evitar conflitos
      setTimeout(() => {
        if (onBlur) {
          console.log('💿 Salvando no banco de dados...');
          onBlur(newValue).catch(error => {
            console.error('❌ Erro ao salvar no backend:', error)
            alert('⚠️ Upload bem-sucedido, mas erro ao salvar no formulário. Tente salvar novamente.')
          })
        }
      }, 100)
      
      alert(`✅ ${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`)
      
    } catch (error) {
      console.error('❌ Erro no upload:', error)
      alert(`❌ Erro ao enviar arquivos: ${error.message}`)
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

  const openFileModal = (file) => {
    setSelectedFile(file)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedFile(null)
  }

  const downloadFile = async (file) => {
    // Verificar se é um arquivo enviado com URL
    if (file.uploaded && file.url) {
      if (file.url.startsWith('data:')) {
        // Arquivo base64 - converter e fazer download
        try {
          const [header, base64Data] = file.url.split(',')
          const mimeMatch = header.match(/data:([^;]+)/)
          const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
          
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name || 'download'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Erro ao fazer download do arquivo base64:', error)
          alert('Erro ao fazer download do arquivo')
        }
      } else if (file.url.startsWith('http')) {
        // URL do servidor - tentar download via API primeiro
        try {
          const clientToken = localStorage.getItem('clientToken')
          
          // Extrair o nome do arquivo da URL
          const fileName = file.url.split('/').pop() || file.name
          
          // Tentar usar a nova rota de download
          const downloadUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/upload/download/${fileName}`
          
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'x-client-token': clientToken
            }
          })
          
          if (response.ok) {
            // Download via API funcionou
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = file.name || fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          } else {
            // API falhou - tentar download direto
            console.warn('Download via API falhou, tentando download direto:', response.status)
            const link = document.createElement('a')
            link.href = file.url
            link.download = file.name || 'download'
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } catch (error) {
          console.error('Erro no download via API:', error)
          // Fallback para download direto
          const link = document.createElement('a')
          link.href = file.url
          link.download = file.name || 'download'
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    } else if (file.file && file.file instanceof File) {
      // Arquivo local ainda não enviado - criar blob URL
      try {
        const url = URL.createObjectURL(file.file)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Erro ao criar Object URL:', error)
        alert('Erro ao fazer download do arquivo local')
      }
    } else {
      // Arquivo sem URL válida ou File object
      console.error('Arquivo inválido para download:', file)
      console.log('Detalhes do arquivo:', {
        hasFile: !!file.file,
        hasUrl: !!file.url,
        uploaded: file.uploaded,
        name: file.name,
        type: file.type
      })
      
      if (file.uploaded && !file.url) {
        alert('Este arquivo foi enviado mas não possui URL válida para download. O arquivo pode ter sido removido do servidor ou ocorreu um erro no upload.')
      } else if (!file.uploaded && !file.file) {
        alert('Este arquivo não foi enviado ainda e não possui dados locais para download.')
      } else {
        alert('Não é possível fazer download deste arquivo. Verifique se o arquivo foi enviado corretamente.')
      }
    }
  }

  // Função para verificar se um arquivo ainda existe no servidor
  const checkFileIntegrity = async (file) => {
    if (!file.uploaded || !file.url || file.url.startsWith('data:')) {
      return true // Arquivo local ou base64 - sempre válido
    }
    
    try {
      const clientToken = localStorage.getItem('clientToken')
      const fileName = file.url.split('/').pop()
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/upload/check/${fileName}`,
        {
          method: 'HEAD',
          headers: {
            'x-client-token': clientToken
          }
        }
      )
      
      return response.ok
    } catch (error) {
      console.warn('Erro ao verificar integridade do arquivo:', error)
      return false
    }
  }

  // Garantir que files seja sempre um array válido
  const files = React.useMemo(() => {
    // Se não há valor, retorna array vazio
    if (!value || value === '' || value === null || value === undefined) {
      return []
    }
    
    // Se já é um array, filtra valores válidos e garante IDs únicos
    if (Array.isArray(value)) {
      return value.filter(file => file && typeof file === 'object').map(file => {
        // Garantir que cada arquivo tem um ID único
        if (!file.id) {
          file.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        
        return {
          ...file,
          // Limpar propriedade file se não for um File válido
          file: (file.file instanceof File) ? file.file : null
        }
      })
    }
    
    // Se é um objeto válido, coloca em array e garante ID único
    if (typeof value === 'object') {
      // Garantir que tem um ID único
      if (!value.id) {
        value.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      
      return [{
        ...value,
        file: (value.file instanceof File) ? value.file : null
      }]
    }
    
    // Caso contrário, array vazio
    return []
  }, [value])

  // Verificar integridade dos arquivos quando o componente carrega
  React.useEffect(() => {
    const verifyFiles = async () => {
      if (files.length === 0) return
      
      const filesWithIssues = []
      
      for (const file of files) {
        if (file.uploaded && file.url && !file.url.startsWith('data:')) {
          const isValid = await checkFileIntegrity(file)
          if (!isValid) {
            filesWithIssues.push(file)
          }
        }
      }
      
      if (filesWithIssues.length > 0) {
        console.warn('Arquivos com problemas de integridade:', filesWithIssues)
        // Opcionalmente notificar o usuário sobre arquivos com problemas
      }
    }
    
    verifyFiles()
  }, [files])

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
              <div key={file.id} className={`file-item ${file.uploaded ? 'uploaded' : 'pending'}`}>
                <div 
                  className="file-preview clickable"
                  onClick={() => openFileModal(file)}
                  title={file.uploaded ? "Clique para visualizar" : "Preview do arquivo (não enviado)"}
                >
                  {/* Mostrar preview: priorizar URL do servidor para arquivos enviados */}
                  {file.uploaded && file.url ? (
                    file.url.startsWith('data:') ? (
                      <img src={file.url} alt={file.name} />
                    ) : (
                      <img src={file.url} alt={file.name} />
                    )
                  ) : previews[file.id] ? (
                    <img src={previews[file.id]} alt={file.name} />
                  ) : file.type && file.type.startsWith('image/') ? (
                    <div className="file-icon loading">🖼️</div>
                  ) : (
                    <div className="file-icon">📄</div>
                  )}
                  
                  {/* Badge de status */}
                  {file.uploaded ? (
                    <div className="upload-success-badge">✓ Enviado</div>
                  ) : (
                    <div className="upload-pending-badge">⏳ Pendente</div>
                  )}
                </div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                    {file.uploaded && <span className="uploaded-text"> • Enviado</span>}
                    {!file.uploaded && <span className="pending-text"> • Clique em "Fazer Upload"</span>}
                  </span>
                  {/* Mostrar URL para debug (apenas em desenvolvimento) */}
                  {file.url && import.meta.env.DEV && (
                    <span className="file-debug">
                      URL: {file.url.length > 60 ? file.url.substring(0, 60) + '...' : file.url}
                    </span>
                  )}
                </div>
                
                {/* Botão de ação: remove (X) ou done (✓) */}
                {file.uploaded ? (
                  <button
                    type="button"
                    className="file-action done"
                    onClick={() => openFileModal(file)}
                    title="Visualizar arquivo"
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    className="file-action remove"
                    onClick={() => removeFile(file.id)}
                    disabled={disabled}
                    title="Remover arquivo"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de visualização */}
      {modalOpen && selectedFile && (
        <div className="file-modal-overlay" onClick={closeModal}>
          <div className="file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedFile.name}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-content">
              {selectedFile.type?.startsWith('image/') ? (
                <img 
                  src={selectedFile.uploaded && selectedFile.url ? selectedFile.url : previews[selectedFile.id]} 
                  alt={selectedFile.name}
                  className="modal-image"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', e.target.src)
                    e.target.style.display = 'none'
                    e.target.nextElementSibling.style.display = 'block'
                  }}
                />
              ) : null}
              {(!selectedFile.type?.startsWith('image/') || 
                (!selectedFile.url && !previews[selectedFile.id])) && (
                <div className="modal-file-icon">
                  <div className="large-file-icon">📄</div>
                  <p>Preview não disponível para este tipo de arquivo</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <div className="file-details">
                <p><strong>Tamanho:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Tipo:</strong> {selectedFile.type || 'Desconhecido'}</p>
                {selectedFile.uploaded && (
                  <p><strong>Status:</strong> <span className="status-uploaded">✓ Enviado</span></p>
                )}
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-download"
                  onClick={() => downloadFile(selectedFile)}
                >
                  <span className="download-icon">⬇️</span>
                  Download
                </button>
                <button 
                  className="btn-modal-close"
                  onClick={closeModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploadInput