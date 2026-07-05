import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import BriefingPreview from '../components/BriefingPreview'
import SectionProgressIndicator from '../components/SectionProgressIndicator'
import { useBriefingSync } from '../hooks/useBriefingSync'
import './ChatPage.css'

// Sistema usando apenas WebSocket + SQLite (Node.js porta 3002)
// API Python (porta 8000) removida completamente

// Definir as seções do briefing (IDs devem corresponder ao backend)
const BRIEFING_SECTIONS = [
  { id: 'contato', name: 'Detalhes de Contato' },
  { id: 'info_basicas', name: 'Informações Básicas' },
  { id: 'entrega', name: 'Lista de Entrega' },
  { id: 'perfil', name: 'Perfil da Empresa' },
  { id: 'posicionamento', name: 'Posicionamento' },
  { id: 'personalidade', name: 'Personalidade da Marca' },
  { id: 'concorrentes', name: 'Concorrentes e Referências' },
  { id: 'visual', name: 'Preferências Visuais' },
  { id: 'final', name: 'Final' }
]

function ChatPage() {
  const { sessionId } = useParams()
  const [inputValue, setInputValue] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)
  const [currentOptions, setCurrentOptions] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Hook híbrido (WebSocket + REST)
  const {
    briefingData,
    progress: syncedProgress,
    isCompleted: syncedIsCompleted,
    loadBriefingData,
    updateField,
    saveBriefingData,
    finalizeBriefing,
    hasRequiredFields,
    getSectionProgress,
    // Novos: WebSocket
    messages,
    loading,
    connected,
    sessionReady,
    sendMessage,
    generateBriefingPreview,
    sessionId: wsSessionId,
    fallbackMode,
    chatError,
    setChatError,
    setFallbackMode
  } = useBriefingSync(sessionId)

  // Estados calculados
  const progress = syncedProgress || 0
  const isCompleted = syncedIsCompleted || false

  // Auto-scroll para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Detectar opções interativas na última mensagem
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.options) {
        console.log('🎛️ Configurando opções interativas:', lastMessage.options);
        
        if (lastMessage.options.type === 'checkbox') {
          setCurrentOptions(lastMessage.options.options.map(opt => ({
            type: 'checkbox',
            value: opt.value,
            text: opt.text
          })));
        } else if (lastMessage.options.type === 'scale') {
          setCurrentOptions([{
            type: 'scale',
            value: lastMessage.options.fieldId,
            text: lastMessage.options.question
          }]);
        } else if (lastMessage.options.type === 'multiple_scales') {
          setCurrentOptions(lastMessage.options.scales.map(scale => ({
            type: 'scale',
            value: scale.id,
            text: scale.label,
            min: scale.min,
            max: scale.max
          })));
        }
      }
    }
  }, [messages])

  // Focar no input quando carregar
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Funções desabilitadas - API Python removida
  const loadSessionViaRest = async () => {
    console.log('⚠️ loadSessionViaRest: API Python desabilitada - usando apenas WebSocket + SQLite')
    return null
  }

  const sendMessageViaRest = async (userMessage) => {
    console.log('⚠️ sendMessageViaRest: API Python desabilitada - usando apenas WebSocket + SQLite')
    setLoading(false)
    return null
  }

  const generatePDF = async () => {
    alert('⚠️ Funcionalidade de PDF temporariamente indisponível. Sistema migrado para SQLite + WebSocket.')
  }

  const downloadPDF = () => {
    alert('⚠️ Funcionalidade de PDF temporariamente indisponível. Sistema migrado para SQLite + WebSocket.')
  }

  // Função para gerar e abrir o preview do briefing
  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true)

    setIsPreviewOpen(true)
    try {
      const result = await generateBriefingPreview()
      
      if (result.success) {
        // Mostrar sucesso e abrir preview
        alert(`✅ ${result.message}\nNovos campos: ${result.newFieldsAdded.join(', ')}`)
        setIsPreviewOpen(true)
      } else {
        // Mostrar erro
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
      alert('❌ Erro ao gerar preview. Tente novamente.')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // Enviar via WebSocket
    const success = sendMessage(userMessage)
    
    if (!success) {
      console.log('WebSocket failed - API Python desabilitada')
      setError('Erro de conectividade. Sistema usando apenas WebSocket.')
    }
  }

  const handleCheckboxToggle = (value) => {
    if (value === 'none') {
      setSelectedOptions(['none'])
    } else {
      setSelectedOptions(prev => {
        const newSelected = prev.filter(v => v !== 'none')
        if (newSelected.includes(value)) {
          return newSelected.filter(v => v !== value)
        } else {
          return [...newSelected, value]
        }
      })
    }
  }

  const handleScaleChange = (value, rating) => {
    setSelectedOptions(prev => {
      const filtered = prev.filter(v => !v.startsWith(value))
      return [...filtered, `${value}:${rating}`]
    })
  }

  const submitOptions = async () => {
    if (selectedOptions.length === 0) return
    
    setLoading(true)
    
    const optionType = currentOptions[0]?.type
    let formattedMessage = ''
    
    if (optionType === 'checkbox') {
      if (selectedOptions.includes('none')) {
        formattedMessage = 'Nenhuma das opções acima'
      } else {
        formattedMessage = `Selecionei: ${selectedOptions.join(', ')}`
      }
    } else if (optionType === 'scale') {
      const ratings = selectedOptions.map(selection => {
        const [value, rating] = selection.split(':')
        return `${value}: ${rating}`
      }).join('; ')
      formattedMessage = `Avaliações: ${ratings}`
    }

    // Enviar via WebSocket
    const success = sendMessage(formattedMessage)
    
    if (success) {
      setCurrentOptions(null)
      setSelectedOptions([])
    } else {
      console.log('WebSocket failed para opções')
    }
    
    setLoading(false)
  }

  if (error) {
    return (
      <div className="chat-page error">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  if (!sessionData && !sessionReady) {
    return (
      <div className="chat-page loading">
        <div className="loading-spinner">Carregando...</div>
      </div>
    )
  }

  // Dados mock se sessionData não estiver disponível
  const mockSessionData = sessionData || {
    id: sessionId,
    client_name: 'Cliente',
    created_at: new Date().toISOString()
  }

  return (
    <div className="chat-page-container">
      {/* Botões flutuantes para preview */}
      
        <button 
          onClick={handleGeneratePreview}
          className={`preview-toggle-button ${isPreviewOpen ? 'hidden' : ''}`}
          disabled={isGeneratingPreview || messages.length === 0}
          title="Usar IA para preencher briefing baseado na conversa"
        >
          Preview
        </button>

      {/* Chat Principal */}
      <div className="chat-page">
        {/* Header */}
        <div className="chat-header">
          <div className="session-info">
          <img src="/logo-horizontal.png" alt="Silver Brand Design" className="header-logo" />
            <span className={`connection-status ${connected ? 'status-connected' : 'status-disconnected'}`}>
              {connected ? '🟢 Conectado' : '🔴 Desconectado'}
            </span>
          </div>
        </div>

        {/* Progress */}
        <SectionProgressIndicator 
          sections={BRIEFING_SECTIONS}
          briefingData={briefingData}
          getSectionProgress={getSectionProgress}
          currentProgress={progress}
        />

        {/* Messages */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={msg.role === 'user' ? 'user-message' : 'bot-message'}>
              <div className="message-content">
                {msg.content}
                {msg.options && msg.options.length > 0 && (
                  <div className="message-options">
                    {msg.options.map((option, optIndex) => (
                      <span key={optIndex} className="option-tag">
                        {option.text || option}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Completion State */}
        {isCompleted ? (
          <div className="completion-panel">
            <h3>🎉 Briefing Completo!</h3>
            <p>Obrigado por compartilhar essas informações.</p>
            <div className="completion-actions">
              <button onClick={generatePDF} className="btn-secondary">
                Gerar PDF (Indisponível)
              </button>
              <button onClick={downloadPDF} className="btn-primary">
                Baixar PDF (Indisponível)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Interactive Options */}
            {currentOptions && currentOptions.length > 0 && (
              <div className="options-panel">
                {currentOptions[0]?.type === 'checkbox' && (
                  <>
                    <h4>Selecione as opções que se aplicam:</h4>
                    <div className="checkbox-options">
                      {currentOptions.map((option, index) => (
                        <label key={index} className="checkbox-option">
                          <input 
                            type="checkbox"
                            checked={selectedOptions.includes(option.value)}
                            onChange={() => handleCheckboxToggle(option.value)}
                          />
                          {option.text}
                        </label>
                      ))}
                      <label className="checkbox-option">
                        <input 
                          type="checkbox"
                          checked={selectedOptions.includes('none')}
                          onChange={() => handleCheckboxToggle('none')}
                        />
                        Nenhuma das opções acima
                      </label>
                    </div>
                    <button 
                      onClick={submitOptions} 
                      className="btn-primary"
                      disabled={selectedOptions.length === 0 || loading}
                    >
                      {loading ? 'Enviando...' : 'Enviar Seleção'}
                    </button>
                  </>
                )}

                {currentOptions[0]?.type === 'scale' && (
                  <>
                    <h4>Avalie de 1 a 5:</h4>
                    <div className="scale-options">
                      {currentOptions.map((option, index) => (
                        <div key={index} className="scale-option">
                          <label>{option.text}:</label>
                          <div className="scale-buttons">
                            {[1, 2, 3, 4, 5].map(rating => (
                              <button
                                key={rating}
                                className={`scale-btn ${selectedOptions.some(s => s === `${option.value}:${rating}`) ? 'selected' : ''}`}
                                onClick={() => handleScaleChange(option.value, rating)}
                              >
                                {rating}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={submitOptions} 
                      className="btn-primary"
                      disabled={selectedOptions.length === 0 || loading}
                    >
                      {loading ? 'Enviando...' : 'Enviar Avaliações'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="input-container">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="message-input"
              />
              <button 
                type="submit" 
                disabled={loading || !inputValue.trim()}
                className="send-button"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Preview Panel */}
      <div className={`briefing-preview-panel ${isPreviewOpen ? 'open' : ''}`}>
        {isPreviewOpen && (
          <BriefingPreview 
            sessionData={mockSessionData}
            briefingData={briefingData || {}}
            progress={progress}
            isCompleted={isCompleted}
            fallbackMode={fallbackMode || false}
            hasRequiredFields={hasRequiredFields}
            getSectionProgress={getSectionProgress}
            onFieldUpdate={updateField}
            onSave={saveBriefingData}
            onFinalize={finalizeBriefing}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default ChatPage