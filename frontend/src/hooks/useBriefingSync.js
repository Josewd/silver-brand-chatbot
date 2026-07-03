import { useState, useCallback, useEffect } from 'react'
import { useSocket } from './useSocket'
import { getSessionId, setSessionId, generateSessionId } from '../lib/sessionId'

// Sistema usando apenas WebSocket + SQLite (Node.js porta 3002)
// API Python (porta 8000) removida completamente

/**
 * Hook híbrido: WebSocket para chat + REST para fallback
 * Mantém compatibilidade com o sistema existente
 */
export function useBriefingSync(sessionId) {
  const { socket, connected } = useSocket()
  
  // Estados do briefing (mantidos do hook original)
  const [briefingData, setBriefingData] = useState({})
  const [progress, setProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState('intro')
  const [isCompleted, setIsCompleted] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Estados do WebSocket chat
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [wsSessionId, setWsSessionId] = useState(null)
  const [fallbackMode, setFallbackMode] = useState(false)

  // =================== WEBSOCKET LOGIC ===================
  
  // Inicializar sessão WebSocket
  useEffect(() => {
    if (!connected || !socket) return
    
    // PRIORIZAR sessionId da URL sempre - se existir, usar ele
    let currentSessionId;
    
    if (sessionId) {
      // URL tem sessionId: usar sempre
      currentSessionId = sessionId;
      setSessionId(currentSessionId); // Atualizar cache
      console.log('📍 Usando sessionId da URL:', sessionId);
    } else {
      // URL não tem sessionId: usar cache ou gerar novo  
      currentSessionId = getSessionId();
      if (!currentSessionId) {
        currentSessionId = generateSessionId();
        setSessionId(currentSessionId);
        console.log('🆕 Novo sessionId gerado:', currentSessionId);
      } else {
        console.log('💾 Usando sessionId do cache:', currentSessionId);
      }
    }
    
    setWsSessionId(currentSessionId)
    
    // Entrar na sessão
    socket.emit('join_session', { sessionId: currentSessionId })
    
    console.log('📡 Entrando na sessão WebSocket:', currentSessionId)
    
  }, [connected, socket, sessionId])
  
  // Configurar listeners WebSocket
  useEffect(() => {
    if (!socket) return
    
    // Sessão pronta
    socket.on('session_ready', (data) => {
      console.log('✅ Sessão WebSocket pronta:', data)
      setWsSessionId(data.sessionId)
      
      // O backend envia formState, mas o frontend espera data.data
      const formData = data.formState || {}
      setBriefingData(formData)
      setProgress(data.progress?.overall || 0)
      setMessages(data.messages || [])
      setSessionReady(true)
      
      console.log('📊 Dados carregados:', {
        fieldsCount: Object.keys(formData).length,
        progress: data.progress?.overall || 0,
        messagesCount: data.messages?.length || 0
      })
    })
    
    // Nova mensagem do assistente
    socket.on('assistant_message', (data) => {
      console.log('🤖 Mensagem do assistente:', data)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toISOString()
      }])
      setLoading(false)
    })
    
    // Atualização do formulário
    socket.on('form_update', (data) => {
      console.log('📝 Atualização do formulário via WebSocket:', data)
      
      if (data.fields) {
        setBriefingData(prev => {
          const updated = { ...prev, ...data.fields }
          console.log('📊 Briefing atualizado:', {
            fieldsUpdated: Object.keys(data.fields),
            totalFields: Object.keys(updated).length
          })
          return updated
        })
      }
      
      if (data.progress) {
        const newProgress = data.progress.overall || 0
        setProgress(newProgress)
        console.log('📈 Progresso atualizado:', newProgress + '%')
      }
      
      setLastUpdated(new Date().toISOString())
    })
    
    // Erro WebSocket - ativar fallback
    socket.on('error', (data) => {
      console.error('❌ Erro WebSocket, ativando fallback:', data)
      setLoading(false)
      setFallbackMode(true)
      
      // Adicionar mensagem de erro no chat
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Sistema temporariamente indisponível. Use o modo de edição manual no painel lateral.',
        timestamp: new Date().toISOString()
      }])
    })
    
    return () => {
      socket.off('session_ready')
      socket.off('assistant_message')
      socket.off('form_update')
      socket.off('error')
    }
  }, [socket])

  // =================== REST FALLBACK LOGIC (original) ===================
  
  // Carrega dados do briefing via REST (fallback) - DESABILITADO (usando apenas WebSocket + SQLite)
  const loadBriefingData = useCallback(async () => {
    const targetSessionId = wsSessionId || sessionId
    if (!targetSessionId) return

    try {
      // Modo SQLite: dados carregados via WebSocket, não via REST
      console.log('⚠️ loadBriefingData: usando apenas WebSocket + SQLite')
      return { data: briefingData, progress, is_completed: isCompleted }
    } catch (error) {
      console.error('Erro ao carregar briefing:', error)
      return null
    }
  }, [wsSessionId, sessionId, briefingData, progress, isCompleted])

  // Atualiza campo específico via REST (modo manual)
  const updateField = useCallback(async (fieldName, value) => {
    const targetSessionId = wsSessionId || sessionId
    if (!targetSessionId) return false

    try {
      // Atualizar estado local imediatamente
      setBriefingData(prev => ({
        ...prev,
        [fieldName]: value
      }))

      // Modo SQLite: dados salvos via WebSocket, não via REST
      console.log('⚠️ updateField: usando apenas WebSocket + SQLite')
      
      setLastUpdated(new Date().toISOString())
      return true
      
    } catch (error) {
      console.error('Erro ao atualizar campo:', error)
      
      // Reverter mudança local em caso de erro
      setBriefingData(prev => {
        const reverted = { ...prev }
        delete reverted[fieldName]
        return reverted
      })
      
      return false
    }
  }, [wsSessionId, sessionId])

  // Salva todos os dados via REST (modo batch) - DESABILITADO (usando apenas WebSocket + SQLite)
  const saveBriefingData = useCallback(async (data) => {
    const targetSessionId = wsSessionId || sessionId
    if (!targetSessionId) return false

    try {
      // Modo SQLite: salvamento via WebSocket, não via REST
      console.log('⚠️ saveBriefingData: usando apenas WebSocket + SQLite')
      
      setBriefingData(data)
      setLastUpdated(new Date().toISOString())
      return true
      setIsCompleted(responseData.is_completed || false)
      setLastUpdated(new Date().toISOString())
      
      return true
      
    } catch (error) {
      console.error('Erro ao salvar briefing:', error)
      return false
    }
  }, [wsSessionId, sessionId])

  // Finaliza via REST - DESABILITADO (usando apenas WebSocket + SQLite)
  const finalizeBriefing = useCallback(async (finalData) => {
    const targetSessionId = wsSessionId || sessionId
    if (!targetSessionId) return false

    try {
      // Modo SQLite: finalização via WebSocket, não via REST
      console.log('⚠️ finalizeBriefing: usando apenas WebSocket + SQLite')
      
      setIsCompleted(true)
      setProgress(100)
      setLastUpdated(new Date().toISOString())
      return true
      setLastUpdated(new Date().toISOString())
      
      return true
      
    } catch (error) {
      console.error('Erro ao finalizar briefing:', error)
      return false
    }
  }, [wsSessionId, sessionId, briefingData])

  // =================== WEBSOCKET CHAT ACTIONS ===================
  
  // Enviar mensagem via WebSocket
  const sendMessage = useCallback((text) => {
    if (!socket || !wsSessionId || !text.trim() || !connected) {
      // Fallback: mostrar mensagem de erro e ativar modo manual
      setFallbackMode(true)
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Chat indisponível. Use o modo de edição manual no painel lateral.',
        timestamp: new Date().toISOString()
      }])
      return false
    }
    
    setLoading(true)
    
    // Adicionar mensagem do usuário localmente
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }])
    
    // Enviar via WebSocket
    socket.emit('user_message', {
      sessionId: wsSessionId,
      text: text.trim()
    })
    
    console.log('📤 Enviando mensagem via WebSocket:', text)
    return true
    
  }, [socket, wsSessionId, connected])

  // =================== HELPERS (mantidos do original) ===================
  
  // Calcula se tem campos obrigatórios preenchidos
  const hasRequiredFields = useCallback(() => {
    return !!(
      briefingData.nome &&
      briefingData.email &&
      briefingData.sobre_empresa &&
      briefingData.cores_quer
    )
  }, [briefingData])

  // Calcular progresso por seção
  const getSectionProgress = useCallback((sectionName) => {
    const sectionFields = {
      contato: ['nome', 'email', 'empresa_slogan', 'website', 'telefone', 'cidade_estado'],
      info_basicas: ['tipo_projeto', 'prazo'],
      entrega: ['itens_padrao', 'itens_extra', 'info_extra_itens'],
      perfil: ['sobre_empresa', 'missao_visao_valores', 'produtos_servicos', 'objetivos_hoje', 'diferencial'],
      posicionamento: ['como_ser_percebida', 'diferencial_concorrencia', 'por_que_escolher'],
      personalidade: ['escala_sofisticada_descontraida', 'escala_tecnica_emocional', 'escala_formal_informal', 'escala_tradicional_moderna', 'escala_exclusiva_popular', 'tres_palavras'],
      concorrentes: ['concorrentes_locais', 'gosta_nessas_marcas', 'marcas_admira', 'info_extra_concorrentes'],
      visual: ['cores_nao_quer', 'cores_quer', 'fontes_gosta', 'tipos_logo', 'referencias_visuais'],
      final: ['algo_a_dizer']
    }

    const fields = sectionFields[sectionName] || []
    if (fields.length === 0) return 0

    const filledFields = fields.filter(field => briefingData[field])
    return Math.round((filledFields.length / fields.length) * 100)
  }, [briefingData])

  // Carregar dados iniciais se não via WebSocket - DESABILITADO (usando apenas WebSocket + SQLite)
  useEffect(() => {
    // Modo SQLite: dados carregados via WebSocket, não via REST
    console.log('⚠️ Carregamento automático desabilitado - usando apenas WebSocket + SQLite')
  }, [sessionReady, connected, wsSessionId, sessionId])

  return {
    // Estado original (mantém compatibilidade)
    briefingData,
    progress,
    currentSection,
    isCompleted,
    lastUpdated,
    
    // Ações originais (REST fallback)
    loadBriefingData,
    updateField,
    saveBriefingData,
    finalizeBriefing,
    
    // Helpers originais
    hasRequiredFields,
    getSectionProgress,
    
    // Novos: WebSocket chat
    messages,
    loading,
    connected,
    sessionReady,
    sendMessage,
    wsSessionId: wsSessionId || sessionId,
    fallbackMode
  }
}