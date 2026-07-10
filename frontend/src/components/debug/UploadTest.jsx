import React, { useState } from 'react';

const UploadTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const testUploadConfig = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/upload/test`);
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error.message });
    }
  };
  
  const testFileUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldId', 'test');
      
      const clientToken = localStorage.getItem('clientToken') || 'test-token';
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/upload`, {
        method: 'POST',
        headers: {
          'x-client-token': clientToken
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ Upload bem-sucedido!\nURL: ${result.url}\nArquivo: ${result.filename}`);
        console.log('Upload result:', result);
      } else {
        const error = await response.json();
        alert(`❌ Erro no upload: ${error.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px', border: '2px solid #e2e8f0', borderRadius: '8px', margin: '20px' }}>
      <h3>🧪 Debug - Teste de Upload</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testUploadConfig} style={{ padding: '8px 16px', marginRight: '10px' }}>
          Testar Configuração
        </button>
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => testFileUpload(e.target.files[0])}
          disabled={uploading}
          style={{ marginLeft: '10px' }}
        />
        {uploading && <span>📤 Enviando...</span>}
      </div>
      
      {testResult && (
        <div style={{ 
          background: '#f8fafc', 
          padding: '15px', 
          borderRadius: '4px', 
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>Resultado do Teste:</strong>
          <br />
          {JSON.stringify(testResult, null, 2)}
        </div>
      )}
    </div>
  );
};

export default UploadTest;