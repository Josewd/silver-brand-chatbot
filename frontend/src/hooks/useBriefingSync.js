import { useState, useCallback, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Hook para sincronizar dados do briefing entre chat e preview
 * Gerencia o estado centralizado e atualizações em tempo real
 */
export function useBriefingSync(sessionId) {
  const [briefingData, setBriefingData] = useState({})
  const [progress, setProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState('intro')
  const [isCompleted, setIsCompleted] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Carrega dados do briefing do backend
  const loadBriefingData = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`${API_URL}/api/briefing/${sessionId}`)
      if (!response.ok) throw new Error('Erro ao carregar briefing')
      
      const data = await response.json()
      
      setBriefingData(data.data || {})
      setProgress(data.progress || 0)
      setIsCompleted(data.is_completed || false)
      setLastUpdated(new Date().toISOString())
      
      return data
    } catch (error) {
      console.error('Erro ao carregar briefing:', error)
      return null
    }
  }, [sessionId])

  // Atualiza campo específico do briefing
  const updateField = useCallback(async (fieldName, value) => {
    if (!sessionId) return false

    try {
      // Atualizar estado local imediatamente (UX responsiva)
      setBriefingData(prev => ({
        ...prev,
        [fieldName]: value
      }))

      // Salvar no backend
      const response = await fetch(`${API_URL}/api/briefing/${sessionId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          briefing_data: { [fieldName]: value } 
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar campo')
      
      const data = await response.json()
      
      // Atualizar progresso com resposta do servidor
      if (data.progress !== undefined) {
        setProgress(data.progress)
      }
      if (data.is_completed !== undefined) {
        setIsCompleted(data.is_completed)
      }
      
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
  }, [sessionId])

  // Salva todos os dados do briefing (modo batch)
  const saveBriefingData = useCallback(async (data) => {
    if (!sessionId) return false

    try {
      const response = await fetch(`${API_URL}/api/briefing/${sessionId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing_data: data })
      })

      if (!response.ok) throw new Error('Erro ao salvar briefing')
      
      const responseData = await response.json()
      
      setBriefingData(data)
      setProgress(responseData.progress || 0)
      setIsCompleted(responseData.is_completed || false)
      setLastUpdated(new Date().toISOString())
      
      return true
      
    } catch (error) {
      console.error('Erro ao salvar briefing:', error)
      return false
    }
  }, [sessionId])

  // Finaliza e envia o briefing
  const finalizeBriefing = useCallback(async (finalData) => {
    if (!sessionId) return false

    try {
      const response = await fetch(`${API_URL}/api/briefing/${sessionId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing_data: finalData || briefingData,
          client_email: finalData?.client_email || briefingData.client_email
        })
      })

      if (!response.ok) throw new Error('Erro ao finalizar briefing')
      
      setIsCompleted(true)
      setProgress(100)
      setLastUpdated(new Date().toISOString())
      
      return true
      
    } catch (error) {
      console.error('Erro ao finalizar briefing:', error)
      return false
    }
  }, [sessionId, briefingData])

  // Calcula se tem campos obrigatórios preenchidos
  const hasRequiredFields = useCallback(() => {
    return !!(
      briefingData.client_name &&
      briefingData.client_email &&
      (briefingData.about_company || briefingData.company_description) &&
      briefingData.preferred_colors
    )
  }, [briefingData])

  // Calcular progresso por seção (para visual detalhado)
  const getSectionProgress = useCallback((sectionName) => {
    const sectionFields = {
      contato: ['client_name', 'client_email', 'client_phone', 'city_state'],
      basicas: ['project_type', 'deadline'],
      perfil: ['about_company', 'products_services', 'diferencial', 'mission_vision_values'],
      posicionamento: ['positioning', 'keywords', 'personality_scales'],
      concorrentes: ['competitors', 'references'],
      visuais: ['preferred_colors', 'excluded_colors', 'logo_types'],
      final: ['additional_info']
    }

    const fields = sectionFields[sectionName] || []
    if (fields.length === 0) return 0

    const filledFields = fields.filter(field => briefingData[field])
    return Math.round((filledFields.length / fields.length) * 100)
  }, [briefingData])

  // Carregar dados iniciais
  useEffect(() => {
    loadBriefingData()
  }, [loadBriefingData])

  return {
    // Estado
    briefingData,
    progress,
    currentSection,
    isCompleted,
    lastUpdated,
    
    // Ações
    loadBriefingData,
    updateField,
    saveBriefingData,
    finalizeBriefing,
    
    // Helpers
    hasRequiredFields,
    getSectionProgress
  }
}