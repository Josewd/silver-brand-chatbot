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
  const [submitting, setSubmitting] = useState(false)

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
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('Erro ao salvar campo:', response.status, errorData);
        
        // Mostrar erro específico para o usuário se for erro de arquivo
        if (errorData.error && errorData.error.includes('arquivo')) {
          alert(`❌ ${errorData.error}\n\nCampo: ${fieldId}\nDetalhes: ${errorData.details || 'Verifique se o arquivo foi enviado corretamente.'}`);
        } else {
          console.warn('Erro ao salvar campo (não crítico):', errorData.error);
        }
      }

    } catch (error) {
      console.error('Erro ao salvar campo:', error)
      // Não mostrar alert para erros de rede - pode ser temporário
      console.warn('Falha na comunicação com servidor. Os dados podem não ter sido salvos.');
    }
  }

  const calculateOverallProgress = (progress) => {
    const values = Object.values(progress)
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  const handleFinalizeBriefing = async () => {
    if (!sessionData?.id || submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionData.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': clientToken
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao finalizar briefing')
      }

      const data = await response.json()
      
      // Atualizar estado local
      setSessionData(prev => ({
        ...prev,
        status: 'completed'
      }))

      // Mostrar mensagem de sucesso
      alert('✅ Briefing finalizado com sucesso! Entraremos em contato em breve.')
      
    } catch (err) {
      console.error('Erro ao finalizar briefing:', err)
      setError('Erro ao finalizar briefing. Tente novamente.')
      alert('❌ Erro ao finalizar briefing. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const overallProgress = calculateOverallProgress(progress)
  const isCompleted = sessionData?.status === 'completed' || overallProgress >= 95
  const canFinalize = overallProgress >= 60 && !isCompleted

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
            
            {/* Botão de finalizar briefing */}
            <div className="finalize-section">
              <div className="finalize-info">
                <p className="finalize-progress">
                  Progresso atual: <strong>{overallProgress}%</strong>
                </p>
                {overallProgress < 60 ? (
                  <p className="finalize-requirement">
                    Complete pelo menos 60% do formulário para finalizar o briefing
                  </p>
                ) : (
                  <p className="finalize-ready">
                    ✅ Você já pode finalizar seu briefing!
                  </p>
                )}
              </div>
              
              <button
                className={`btn-finalize ${canFinalize ? 'enabled' : 'disabled'}`}
                onClick={handleFinalizeBriefing}
                disabled={!canFinalize || submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-small"></span>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <span className="finalize-icon">✓</span>
                    Finalizar Briefing
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormPage