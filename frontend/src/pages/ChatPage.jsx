import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import BriefingPreview from '../components/BriefingPreview'
import './ChatPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Definir as seções do briefing (IDs devem corresponder ao backend)
const BRIEFING_SECTIONS = [
  { id: 'intro', name: 'Início' },
  { id: 'contato', name: 'Detalhes de Contato' },
  { id: 'basicas', name: 'Informações Básicas' },
  { id: 'entrega', name: 'Lista de Entrega' },
  { id: 'perfil', name: 'Perfil da Empresa' },
  { id: 'posicionamento', name: 'Posicionamento & Personalidade' },
  { id: 'concorrentes', name: 'Concorrentes e Referências' },
  { id: 'visuais', name: 'Preferências Visuais' },
  { id: 'final', name: 'Informações Finais' }
]

function ChatPage() {
  const { sessionId } = useParams()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)
  const [currentOptions, setCurrentOptions] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [chatError, setChatError] = useState(false) // Detectar quando chat falha
  const [fallbackMode, setFallbackMode] = useState(false) // Modo formulário manual
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadSession()
    loadHistory()
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-focus no input após carregar ou enviar mensagem
  useEffect(() => {
    if (!loading && !currentOptions && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading, currentOptions])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/session/${sessionId}`)
      if (!response.ok) {
        throw new Error('Sessão não encontrada')
      }
      const data = await response.json()
      
      // Garantir que briefing_data sempre exista
      if (!data.briefing_data) {
        data.briefing_data = {}
      }
      
      // Adicionar informações iniciais da sessão ao briefing_data se ainda não existirem
      if (data.client_name && !data.briefing_data.client_name) {
        data.briefing_data.client_name = data.client_name
      }
      
      setSessionData(data)
    } catch (err) {
      setError('Erro ao carregar sessão: ' + err.message)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/${sessionId}/history`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setLoading(true)

    // Adicionar mensagem do usuário imediatamente
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const response = await fetch(`${API_URL}/api/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem')
      }

      const data = await response.json()
      
      // Adicionar resposta do bot
      const botMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, botMessage])

      // Se houver opções interativas (checkboxes), armazenar para mostrar
      if (data.interactive_options && data.interactive_options.length > 0) {
        setCurrentOptions(data.interactive_options)
        setSelectedOptions([])
      } else {
        setCurrentOptions(null)
      }

      // Atualizar progresso e recarregar dados do briefing
      if (sessionData) {
        setSessionData({
          ...sessionData,
          progress: data.progress,
          current_section: data.current_section,
          is_completed: data.is_completed
        })
        
        // Recarregar sessão completa para pegar briefing_data atualizado
        await loadSession()
      }

    } catch (err) {
      setError('Erro ao enviar mensagem: ' + err.message)
      setChatError(true)
      
      // Ativar modo fallback após erro
      if (chatError) {
        setFallbackMode(true)
        setIsPreviewOpen(true)
        alert('⚠️ O chatbot está temporariamente indisponível. Você pode continuar preenchendo o briefing manualmente no painel lateral.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxToggle = (value) => {
    if (value === 'none') {
      // Se selecionar "nenhum", desmarcar todos outros
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

  const submitOptions = async () => {
    if (selectedOptions.length === 0) return
    
    setLoading(true)
    
    // Montar mensagem com as opções selecionadas
    const labels = currentOptions
      .filter(opt => selectedOptions.includes(opt.value))
      .map(opt => opt.label)
    
    const message = labels.length > 0 ? labels.join(', ') : 'Nenhum item extra'
    
    // Adicionar mensagem do usuário imediatamente
    const newUserMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])
    
    // Limpar opções
    setCurrentOptions(null)
    setSelectedOptions([])
    
    try {
      const response = await fetch(`${API_URL}/api/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem')
      }

      const data = await response.json()
      
      // Adicionar resposta do bot
      const botMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        options: data.options
      }
      setMessages(prev => [...prev, botMessage])

      // Se houver novas opções interativas, armazenar
      if (data.interactive_options && data.interactive_options.length > 0) {
        setCurrentOptions(data.interactive_options)
        setSelectedOptions([])
      }

      // Atualizar progresso e recarregar dados do briefing
      if (sessionData) {
        setSessionData({
          ...sessionData,
          progress: data.progress,
          current_section: data.current_section,
          is_completed: data.is_completed
        })
        
        // Recarregar sessão completa para pegar briefing_data atualizado
        await loadSession()
      }

    } catch (err) {
      setError('Erro ao enviar mensagem: ' + err.message)
      setChatError(true)
      
      if (chatError) {
        setFallbackMode(true)
        setIsPreviewOpen(true)
        alert('⚠️ O chatbot está indisponível. Continue preenchendo manualmente no painel lateral.')
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    try {
      window.open(`${API_URL}/api/briefing/${sessionId}/download`, '_blank')
    } catch (err) {
      alert('Erro ao baixar PDF: ' + err.message)
    }
  }

  const generatePDF = async () => {
    try {
      const response = await fetch(`${API_URL}/api/briefing/${sessionId}/generate-pdf`, {
        method: 'POST'
      })
      if (response.ok) {
        alert('PDF gerado com sucesso! Clique em "Baixar PDF" para fazer o download.')
      }
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message)
    }
  }

  if (error) {
    return (
      <div className="chat-page error">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="chat-page loading">
        <div className="loading-spinner">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="chat-page-container">
      {/* Botão flutuante para abrir preview */}
      <button 
        className={`preview-toggle-button ${isPreviewOpen ? 'hidden' : ''}`}
        onClick={() => setIsPreviewOpen(true)}
      >
        PREVIEW
      </button>

      {/* Chat */}
      <div className="chat-page">
        <header className="chat-header">
          <div className="header-content">
            <img src="/logo-horizontal.png" alt="Silver Brand Design" className="header-logo" />
            <p className="client-name">{sessionData.client_name}</p>
          </div>
          <div className="progress-container">
            <span className="progress-text">
              {sessionData.progress}% concluído
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${sessionData.progress}%` }}
              />
              {/* Checkpoints na barra */}
              {BRIEFING_SECTIONS.filter(section => section.id !== 'intro').map((section, index) => {
                const position = ((index + 1) / (BRIEFING_SECTIONS.length - 1)) * 100
                const sectionIndex = BRIEFING_SECTIONS.findIndex(s => s.id === sessionData.current_section)
                const checkpointIndex = BRIEFING_SECTIONS.findIndex(s => s.id === section.id)
                const isCompleted = checkpointIndex < sectionIndex
                const isCurrent = section.id === sessionData.current_section
                
                return (
                  <div
                    key={section.id}
                    className={`checkpoint ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    style={{ left: `${position}%` }}
                    data-tooltip={section.name}
                  >
                    <div className="checkpoint-dot"></div>
                  </div>
                )
              })}
            </div>
          </div>
        </header>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Bem-vindo ao briefing interativo! 👋</h2>
              <p>Vou te ajudar a estruturar a identidade visual da sua marca.</p>
              <p>Vamos começar?</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                {msg.content}
              </div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          ))}
          
          {loading && (
            <div className="message bot-message">
              <div className="message-content typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {sessionData.is_completed ? (
          <div className="completion-panel">
            <h3>🎉 Briefing Completo!</h3>
            <p>Obrigado por compartilhar essas informações. Agora você pode baixar o PDF com tudo que conversamos.</p>
            <div className="completion-actions">
              <button onClick={generatePDF} className="btn-secondary">
                Gerar PDF
              </button>
              <button onClick={downloadPDF} className="btn-primary">
                Baixar PDF
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentOptions && currentOptions.length > 0 && (
              <div className="options-panel">
                <p className="options-title">Selecione os itens que você precisa:</p>
                <div className="options-grid">
                  {currentOptions.map((option, index) => (
                    <label key={index} className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(option.value)}
                        onChange={() => handleCheckboxToggle(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <button 
                  onClick={submitOptions}
                  className="btn-submit-options"
                  disabled={selectedOptions.length === 0}
                >
                  Enviar Seleção
                </button>
              </div>
            )}
            
            <form onSubmit={sendMessage} className="input-container">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="message-input"
                disabled={loading || currentOptions}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={loading || !inputValue.trim() || currentOptions}
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </div>

      {/* Preview do Briefing - lado direito */}
      <div className={`briefing-preview-panel ${isPreviewOpen ? 'open' : ''}`}>
        <button 
          className="preview-close-button"
          onClick={() => setIsPreviewOpen(false)}
          title="Fechar preview"
        >
          ×
        </button>
        <BriefingPreview 
          sessionData={sessionData} 
          briefingData={sessionData?.briefing_data || {}}
          fallbackMode={fallbackMode}
          onSave={async (data) => {
            // Salvar dados no backend
            try {
              const response = await fetch(`${API_URL}/api/briefing/${sessionId}/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ briefing_data: data })
              })
              if (response.ok) {
                await loadSession()
                alert('✅ Dados salvos com sucesso!')
                setChatError(false) // Reset erro
              }
            } catch (err) {
              alert('❌ Erro ao salvar: ' + err.message)
            }
          }}
        />
      </div>
    </div>
  )
}

export default ChatPage
