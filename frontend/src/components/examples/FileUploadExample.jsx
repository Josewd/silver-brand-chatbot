import React, { useState } from 'react'
import SimpleFileUpload from './SimpleFileUpload'

const FileUploadExample = () => {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [singleFile, setSingleFile] = useState(null)

  const handleMultipleFiles = (files) => {
    console.log('Arquivos selecionados:', files)
    setSelectedFiles(files)
  }

  const handleSingleFile = (file) => {
    console.log('Arquivo selecionado:', file)
    setSingleFile(file)
  }

  const handleImageSelect = (files) => {
    console.log('Imagens selecionadas:', files)
    // Aqui você pode processar as imagens
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2>Exemplos de Upload de Arquivos</h2>
      
      {/* Upload básico - arquivo único */}
      <div>
        <h3>Upload Básico (Arquivo Único)</h3>
        <SimpleFileUpload
          onFileSelect={handleSingleFile}
        />
        {singleFile && (
          <p style={{ marginTop: '10px', color: '#666' }}>
            Arquivo selecionado: {singleFile.name} ({(singleFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Upload múltiplo */}
      <div>
        <h3>Upload Múltiplo</h3>
        <SimpleFileUpload
          multiple={true}
          onFileSelect={handleMultipleFiles}
        />
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ color: '#666' }}>Arquivos selecionados:</p>
            <ul style={{ color: '#666', marginTop: '5px' }}>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Upload apenas imagens */}
      <div>
        <h3>Upload de Imagens Apenas</h3>
        <SimpleFileUpload
          accept="image/*"
          multiple={true}
          allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']}
          maxSize={2 * 1024 * 1024} // 2MB
          onFileSelect={handleImageSelect}
          className="outline"
        />
      </div>

      {/* Diferentes estilos */}
      <div>
        <h3>Diferentes Estilos</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          
          <SimpleFileUpload onFileSelect={handleSingleFile}>
            <span>📁 Selecionar Arquivo</span>
          </SimpleFileUpload>

          <SimpleFileUpload 
            className="secondary" 
            onFileSelect={handleSingleFile}
          />

          <SimpleFileUpload 
            className="outline" 
            onFileSelect={handleSingleFile}
          />

          <SimpleFileUpload 
            className="success" 
            onFileSelect={handleSingleFile}
          />

          <SimpleFileUpload 
            className="small" 
            onFileSelect={handleSingleFile}
          />

          <SimpleFileUpload 
            className="large" 
            onFileSelect={handleSingleFile}
          />
        </div>
      </div>

      {/* Botão customizado */}
      <div>
        <h3>Botão Customizado</h3>
        <SimpleFileUpload
          accept="image/*"
          onFileSelect={handleImageSelect}
          className="outline"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📸</span>
            <span>Adicionar Foto</span>
          </div>
        </SimpleFileUpload>
      </div>

      {/* Botão desabilitado */}
      <div>
        <h3>Botão Desabilitado</h3>
        <SimpleFileUpload
          disabled={true}
          onFileSelect={handleSingleFile}
        />
      </div>
    </div>
  )
}

export default FileUploadExample