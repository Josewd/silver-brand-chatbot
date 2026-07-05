import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import FormPanel from '../components/FormPanel'
import './FormPage.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const FormPage = () => {
  const { clientToken } = useParams()
  const [sessionData, setSessionData] = useState(null)
  const [formState, setFormState] = useState({})
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schema, setSchema] = useState(null)

  useEffect(() => {
    if (clientToken) {
      // Salvar token no localStorage para uso nas requisições
      localStorage.setItem('clientToken', clientToken)
      loadSession()
    }
  }, [clientToken])

  const loadSession = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${BACKEND_URL}/api/sessions/${clientToken}`, {
        headers: {
          'x-client-token': clientToken
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Sessão não encontrada ou link inválido')
        }
        throw new Error('Erro ao carregar sessão')
      }

      const data = await response.json()
      
      setSessionData({
        id: data.sessionId,
        status: data.status,
        createdAt: data.createdAt
      })
      setSchema(data.schema)
      setFormState(data.formState || {})
      setProgress(data.progress || {})

    } catch (err) {
      console.error('Erro ao carregar sessão:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    // Atualizar estado local imediatamente para UX responsiva
    setFormState(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleFieldBlur = async (fieldId, value) => {
    try {
      // Salvar no servidor quando o campo perde o foco
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionData.id}/fields/${fieldId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': clientToken
        },
        body: JSON.stringify({ value })
      })

      if (response.ok) {
        const data = await response.json()
        // Atualizar progresso com dados do servidor
        setProgress(data.progress || {})
      } else {
        console.error('Erro ao salvar campo:', response.statusText)
      }

    } catch (error) {
      console.error('Erro ao salvar campo:', error)
    }
  }

  const calculateOverallProgress = (progress) => {
    const values = Object.values(progress)
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  const overallProgress = calculateOverallProgress(progress)
  const isCompleted = overallProgress >= 95 // Considera completo com 95%+

  if (loading) {
    return (
      <div className="form-page loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando formulário...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="form-page error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Erro ao carregar formulário</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-page">
      {/* Header fixo */}
      <div className="form-page-header">
        <div className="header-content">
          <img src="/logo-horizontal.png" alt="Silver Brand Design" className="form-logo" />
          <div className="progress-info">
            <span className="progress-label">Progresso geral:</span>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="progress-text">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="form-page-content">
        {isCompleted && (
          <div className="completion-banner">
            <div className="completion-content">
              <span className="completion-icon">🎉</span>
              <div>
                <h3>Briefing Completo!</h3>
                <p>Obrigado por compartilhar essas informações. Entraremos em contato em breve!</p>
              </div>
            </div>
          </div>
        )}

        <FormPanel
          schema={schema}
          formState={formState}
          onFieldChange={handleFieldChange}
          onFieldBlur={handleFieldBlur}
          progress={progress}
          readOnly={isCompleted}
          sessionData={sessionData}
        />

        {!isCompleted && (
          <div className="form-footer">
            <p className="footer-text">
              💡 Use a "Ajuda Inteligente" nos campos complexos para obter sugestões personalizadas
            </p>
            <p className="footer-contact">
              Dúvidas? Entre em contato: <strong>brandhousesilver@gmail.com</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormPage