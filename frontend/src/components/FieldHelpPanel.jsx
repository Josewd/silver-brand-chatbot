import React, { useState, useEffect, useRef } from 'react'
import './FieldHelpPanel.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const FieldHelpPanel = ({ 
  fieldId, 
  fieldLabel, 
  currentFormState, 
  sessionId, 
  onClose, 
  onApplyValue 
}) => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [draft, setDraft] = useState(null)
  const [hasInitialRequest, setHasInitialRequest] = useState(false)
  const messagesEndRef = useRef(null)

  // Carregar histórico de mensagens ao abrir
  useEffect(() => {
    console.log('FieldHelpPanel useEffect executado:', { fieldId, sessionId, hasInitialRequest })
    
    const initializeHelp = async () => {
      console.log('Iniciando carregamento do histórico...')
      const hasHistory = await loadHelpHistory()
      console.log('Histórico carregado:', hasHistory)
      
      // Se não há histórico, enviar mensagem inicial automaticamente
      if (!hasHistory && !hasInitialRequest) {
        console.log('Enviando mensagem inicial contextual...')
        setHasInitialRequest(true)
        await sendInitialContextualMessage()
      } else {
        console.log('Não enviando mensagem inicial:', { hasHistory, hasInitialRequest })
      }
    }
    
    if (sessionId) {
      initializeHelp()
    } else {
      console.log('SessionId não encontrado:', sessionId)
    }
  }, [fieldId, sessionId])

  // Auto-scroll para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendInitialContextualMessage = async () => {
    setIsLoading(true)
    
    // Criar mensagem contextual baseada no campo e dados preenchidos
    const contextualMessage = createContextualMessage()
    
    console.log('Enviando mensagem contextual:', contextualMessage)
    console.log('Session ID:', sessionId)
    console.log('Field ID:', fieldId)
    
    try {
      const clientToken = localStorage.getItem('clientToken')
      console.log('Client Token:', clientToken)
      
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/fields/${fieldId}/help`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': clientToken
        },
        body: JSON.stringify({
          message: contextualMessage
        })
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)

      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString()
      }

      setMessages([assistantMessage])

      // Se a IA propôs um rascunho
      if (data.draft) {
        setDraft(data.draft)
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem inicial:', error)
      // Fallback para mensagem local em caso de erro
      const fallbackMessage = {
        role: 'assistant',
        content: `Erro na comunicação: ${error.message}. Tente enviar uma mensagem manual para ativar a ajuda.`,
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages([fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const createContextualMessage = () => {
    const currentValue = currentFormState[fieldId] || ''
    const companyInfo = {
      nome: currentFormState.nome || '',
      empresa_slogan: currentFormState.empresa_slogan || '',
      sobre_empresa: currentFormState.sobre_empresa || ''
    }

    if (currentValue.trim()) {
      return `Com base no que já foi preenchido para "${fieldLabel}": "${currentValue}", e considerando as informações da empresa (${companyInfo.empresa_slogan || companyInfo.nome || 'não informado'}), me ajude a melhorar e profissionalizar esta resposta. Analise criticamente e proponha uma versão mais estratégica e comercialmente eficaz.`
    } else {
      return `Preciso de ajuda para preencher o campo "${fieldLabel}". Considerando as informações da empresa que já foram fornecidas (${companyInfo.empresa_slogan || companyInfo.nome || 'ainda não informado'}), me forneça sugestões profissionais e estratégicas para este campo.`
    }
  }

  const loadHelpHistory = async () => {
    if (!sessionId) {
      console.log('loadHelpHistory: sessionId não disponível')
      return false
    }

    console.log('loadHelpHistory: carregando histórico para', { sessionId, fieldId })

    try {
      const clientToken = localStorage.getItem('clientToken')
      console.log('loadHelpHistory: clientToken:', clientToken)
      
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/fields/${fieldId}/help`, {
        headers: {
          'x-client-token': clientToken
        }
      })

      console.log('loadHelpHistory: response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('loadHelpHistory: data recebida:', data)
        
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map(msg => ({
            ...msg,
            timestamp: msg.created_at
          }))
          setMessages(formattedMessages)
          console.log('loadHelpHistory: mensagens carregadas:', formattedMessages.length)
          return true // Indica que há histórico
        } else {
          console.log('loadHelpHistory: nenhuma mensagem encontrada')
        }
      } else {
        console.log('loadHelpHistory: resposta não ok:', response.status)
      }
    } catch (error) {
      console.warn('Erro ao carregar histórico de ajuda:', error)
    }
    
    return false // Indica que não há histórico
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setDraft(null) // Limpar rascunho anterior

    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/fields/${fieldId}/help`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': localStorage.getItem('clientToken')
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      })

      if (!response.ok) {
        throw new Error('Falha na comunicação com servidor')
      }

      const data = await response.json()

      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Se a IA propôs um rascunho
      if (data.draft) {
        setDraft(data.draft)
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleApplyDraft = () => {
    if (draft) {
      onApplyValue?.(draft)
      onClose?.()
    }
  }

  const handleContinueChat = () => {
    setDraft(null)
  }

  return (
    <div className="field-help-overlay">
      <div className="field-help-panel">
        {/* Header */}
        <div className="help-header">
          <div className="help-title">
            <span className="help-icon">✨</span>
            Ajuda Inteligente
          </div>
          <div className="help-subtitle">
            {fieldLabel}
          </div>
          <button 
            className="help-close-button"
            onClick={onClose}
            title="Fechar ajuda"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="help-messages">
          {messages.length === 0 && isLoading && (
            <div className="help-message assistant">
              <div className="message-content">
                <div className="initial-loading">
                  <span className="loading-icon">🤖</span>
                  Analisando o contexto e preparando uma sugestão personalizada...
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`help-message ${message.role} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && (
            <div className="help-message assistant">
              <div className="message-content typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Draft Panel */}
        {draft && (
          <div className="draft-panel">
            <div className="draft-header">
              <span className="draft-icon">📝</span>
              Rascunho proposto:
            </div>
            <div className="draft-content">
              {draft}
            </div>
            <div className="draft-actions">
              <button 
                className="draft-apply-button"
                onClick={handleApplyDraft}
              >
                ✅ Usar esta resposta
              </button>
              <button 
                className="draft-continue-button"
                onClick={handleContinueChat}
              >
                💬 Continuar ajustando
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="help-input-container">
          <textarea
            className="help-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            disabled={isLoading}
            rows={2}
          />
          <button 
            className="help-send-button"
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FieldHelpPanel