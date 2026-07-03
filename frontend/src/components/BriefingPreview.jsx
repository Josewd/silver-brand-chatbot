import React, { useState, useEffect } from 'react'
import SectionProgressIndicator from './SectionProgressIndicator'
import './BriefingPreview.css'

// Sistema usando apenas WebSocket + SQLite (Node.js porta 3002)
// API Python (porta 8000) removida completamente

function BriefingPreview({ 
  sessionData, 
  briefingData, 
  progress, 
  isCompleted, 
  fallbackMode, 
  hasRequiredFields, 
  getSectionProgress,
  onFieldUpdate, 
  onSave, 
  onFinalize,
  onClose 
}) {
  const [editedData, setEditedData] = useState({})
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [manualMode, setManualMode] = useState(fallbackMode || false)

  // Verificação de segurança - não renderizar se não há dados essenciais
  if (!sessionData && !briefingData) {
    return (
      <div className="briefing-preview">
        <div className="preview-header">
          {onClose && (
            <button onClick={onClose} className="close-button">×</button>
          )}
          <p>Carregando dados do briefing...</p>
        </div>
      </div>
    )
  }

  // Garantir que sessionData nunca seja null
  const safeSessionData = sessionData || {
    id: 'temp-session',
    client_name: 'Cliente',
    created_at: new Date().toISOString()
  }

  // Sincronizar com briefingData quando mudar
  useEffect(() => {
    setEditedData({ ...briefingData })
  }, [briefingData])

  // Ativar modo manual automaticamente quando fallbackMode ativar
  useEffect(() => {
    if (fallbackMode) {
      setManualMode(true)
    }
  }, [fallbackMode])

  const handleFieldChange = (fieldName, value) => {
    setEditedData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Atualizar no backend em tempo real usando o hook
    if (onFieldUpdate && !fallbackMode && !manualMode) {
      onFieldUpdate(fieldName, value)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      await onSave(editedData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFinalizeSend = async () => {
    if (!window.confirm('Tem certeza que deseja finalizar e enviar o briefing? Um email será enviado para você e para a Silver Brand House.')) {
      return
    }

    setIsSending(true)
    
    try {
      const success = await onFinalize(editedData)
      
      if (success) {
        setSendSuccess(true)
        alert('✅ Briefing enviado com sucesso! Você receberá um email de confirmação em breve.')
      } else {
        alert('❌ Erro ao enviar briefing. Por favor, tente novamente.')
      }
      
    } catch (error) {
      console.error('Erro:', error)
      alert('❌ Erro ao enviar briefing. Por favor, tente novamente.')
    } finally {
      setIsSending(false)
    }
  }

  const renderEditableField = (label, fieldName, value, multiline = false) => {
    // No modo manual ou fallback, sempre mostrar campo (mesmo vazio)
    if (!manualMode && !fallbackMode && !value && !editedData[fieldName]) {
      return null
    }

    const currentValue = editedData[fieldName] || value || ''

    return (
      <div className="preview-field editable">
        <div className="field-label">{label}:</div>
        {multiline ? (
          <textarea
            className="field-input"
            value={currentValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            rows={4}
            placeholder={(fallbackMode || manualMode) ? `Digite ${label.toLowerCase()}...` : ''}
          />
        ) : (
          <input
            type="text"
            className="field-input"
            value={currentValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={(fallbackMode || manualMode) ? `Digite ${label.toLowerCase()}...` : ''}
          />
        )}
      </div>
    )
  }

  const renderPersonalityScales = () => {
    const scales = editedData.personality_scales
    if (!scales) return null

    let scalesData
    try {
      scalesData = typeof scales === 'string' ? JSON.parse(scales) : scales
    } catch {
      return null
    }

    const scaleNames = {
      scale_sophisticated: { min: 'Descontraída', max: 'Sofisticada' },
      scale_technical: { min: 'Emocional', max: 'Técnica' },
      scale_formal: { min: 'Informal', max: 'Formal' },
      scale_traditional: { min: 'Moderna', max: 'Tradicional' },
      scale_exclusive: { min: 'Popular', max: 'Exclusiva' }
    }

    return (
      <div className="personality-scales-preview">
        <div className="field-label">Personalidade da Marca (1 a 5):</div>
        {Object.entries(scalesData).map(([key, value]) => {
          const scale = scaleNames[key]
          if (!scale) return null
          
          return (
            <div key={key} className="scale-preview-item">
              <div className="scale-preview-labels">
                <span className="scale-preview-min">{scale.min}</span>
                <div className="scale-preview-dots">
                  {[1, 2, 3, 4, 5].map(num => (
                    <div 
                      key={num} 
                      className={`scale-preview-dot ${parseInt(value) === num ? 'active' : ''}`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
                <span className="scale-preview-max">{scale.max}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderLogoTypes = () => {
    const logoTypes = editedData.logo_types
    if (!logoTypes) return null

    // Converter string para array de valores selecionados
    let selectedTypes = []
    if (typeof logoTypes === 'string') {
      selectedTypes = logoTypes.split(',').map(t => t.trim().toLowerCase())
    }

    const logoOptions = [
      { label: 'Com símbolo', value: 'com símbolo' },
      { label: 'Só a tipografia', value: 'só a tipografia' },
      { label: 'Minimalista', value: 'minimalista' },
      { label: 'Clássico', value: 'clássico' },
      { label: 'Moderno', value: 'moderno' }
    ]

    return (
      <div className="logo-types-preview">
        <div className="field-label">Tipos de logo que prefere:</div>
        <div className="logo-types-grid">
          {logoOptions.map((option, index) => {
            const isSelected = selectedTypes.some(t => 
              option.value.includes(t) || t.includes(option.value.toLowerCase())
            )
            return (
              <div key={index} className={`logo-type-item ${isSelected ? 'selected' : ''}`}>
                <span className="checkbox-icon">{isSelected ? '☑' : '☐'}</span>
                <span>{option.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderSection = (title, content, hasData) => {
    // No modo fallback, sempre mostrar seções (mesmo vazias)
    if (!fallbackMode && !hasData) return null
    
    return (
      <div className="preview-section">
        <h3 className="section-title">{title}</h3>
        <div className="section-content">
          {content}
        </div>
      </div>
    )
  }

  // Verificar quais seções têm dados (usando novos nomes de campos)
  const hasContactData = editedData.name || editedData.email || 
                         editedData.phone || editedData.city_state || 
                         editedData.website || editedData.company_slogan

  const hasBasicInfo = editedData.project_type || editedData.deadline

  const hasDeliverables = editedData.standard_items || editedData.extra_items || editedData.extra_items_info

  const hasCompanyProfile = editedData.about_company || 
                           editedData.products_services || 
                           editedData.mission_vision_values || editedData.differentiator || 
                           editedData.current_objectives

  const hasPositioning = editedData.how_to_be_perceived || editedData.competitive_differentiator || 
                        editedData.why_choose_you

  const hasPersonality = editedData.sophisticated_relaxed_scale || editedData.technical_emotional_scale ||
                        editedData.formal_informal_scale || editedData.traditional_modern_scale ||
                        editedData.exclusive_popular_scale || editedData.three_words

  const hasCompetitors = editedData.local_competitors || editedData.likes_in_brands || 
                        editedData.admired_brands || editedData.extra_competitors_info

  const hasVisualPrefs = editedData.colors_want || editedData.colors_not_want || 
                        editedData.logo_types || editedData.fonts_like || editedData.visual_references

  const hasFinalInfo = editedData.anything_to_say

  const isComplete = isCompleted || progress >= 95
  
  // Usar hasRequiredFields do hook ou calcular localmente como fallback
  const requiredFieldsFilled = hasRequiredFields ? hasRequiredFields() : 
    editedData.nome &&
    editedData.email &&
    editedData.sobre_empresa &&
    editedData.cores_quer

  return (
    <div className="briefing-preview">
      {onClose && (
        <button 
          onClick={onClose}
          className="preview-close-button"
          aria-label="Fechar preview"
        >
          ×
        </button>
      )}
      
      {/* Aviso de modo fallback */}
      {fallbackMode && (
        <div className="fallback-banner">
          ⚠️ Modo Manual Ativo - O chatbot está offline. Continue preenchendo abaixo.
        </div>
      )}
      
      <div className="preview-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" className="preview-logo" />
        {onClose && (
          <button 
            onClick={onClose}
            className="preview-close-button"
            aria-label="Fechar preview"
          >
            ×
          </button>
        )}
        <h1 className="preview-title">BRIEFING DE IDENTIDADE VISUAL</h1>
        <div className="preview-client">
          <strong>Cliente:</strong> {briefingData.name || safeSessionData.client_name || 'Cliente'}
        </div>
        
        {/* Switch para modo manual */}
        <div className="mode-switch">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
              className="switch-checkbox"
            />
            <span className="switch-slider"></span>
            <span className="switch-text">
              {manualMode ? '✏️ Modo Edição Manual' : '💬 Modo Chat (Somente Leitura)'}
            </span>
          </label>
          {manualMode && (
            <div className="mode-hint">
              💡 Você pode preencher todos os campos diretamente
            </div>
          )}
        </div>
        
        {/* Progresso detalhado das seções */}
        {getSectionProgress && (
          <SectionProgressIndicator
            currentSection={safeSessionData.current_section || 'contact'}
            overallProgress={progress || 0}
            getSectionProgress={getSectionProgress}
            showDetailed={true}
          />
        )}
      </div>

      <div className="preview-content">
        {/* Lista de Entrega Inicial */}
        <div className="preview-section deliverables-section">
          <h3 className="section-title">ITENS INCLUÍDOS NO PROJETO</h3>
          <div className="section-content">
            <ul className="deliverables-list">
              <li>✓ Logotipo principal (versões horizontal e vertical)</li>
              <li>✓ Variações de cor (colorida, P&B, monocromática)</li>
              <li>✓ Manual de identidade visual (PDF)</li>
              <li>✓ Arquivos editáveis (.AI, .EPS, .SVG)</li>
              <li>✓ Arquivos para web (.PNG transparente)</li>
              <li>✓ Paleta de cores (códigos RGB, CMYK, HEX)</li>
              <li>✓ Tipografia recomendada</li>
            </ul>
          </div>
        </div>

        {/* Seção 1: Detalhes de Contato */}
        {renderSection(
          "1. DETALHES DE CONTATO",
          <>
            {renderEditableField("Nome completo", "name", briefingData.name || safeSessionData.client_name)}
            {renderEditableField("E-mail", "email", briefingData.email || safeSessionData.client_email)}
            {renderEditableField("Nome da empresa e slogan", "company_slogan", briefingData.company_slogan)}
            {renderEditableField("Website/Instagram", "website", briefingData.website)}
            {renderEditableField("Telefone", "phone", briefingData.phone || safeSessionData.client_phone)}
            {renderEditableField("Cidade/Estado", "city_state", briefingData.city_state)}
          </>,
          hasContactData || safeSessionData.client_name
        )}

        {/* Seção 2: Informações Básicas */}
        {renderSection(
          "2. INFORMAÇÕES BÁSICAS",
          <>
            {renderEditableField("Projeto novo ou redesenho?", "project_type", briefingData.project_type)}
            {renderEditableField("Quando precisa do projeto pronto?", "deadline", briefingData.deadline)}
          </>,
          hasBasicInfo
        )}

        {/* Seção 3: Lista de Entrega */}
        {renderSection(
          "3. LISTA DE ENTREGA",
          <>
            {renderEditableField("Itens de identidade visual", "standard_items", briefingData.standard_items, true)}
            {renderEditableField("Itens adicionais", "extra_items", briefingData.extra_items, true)}
            {renderEditableField("Informações extras sobre os itens", "extra_items_info", briefingData.extra_items_info, true)}
          </>,
          hasDeliverables
        )}

        {/* Seção 4: Perfil da Empresa */}
        {renderSection(
          "4. PERFIL DA EMPRESA",
          <>
            {renderEditableField("Sobre a empresa (o que é, há quanto tempo existe)", "about_company", briefingData.about_company, true)}
            {renderEditableField("Missão, visão e valores", "mission_vision_values", briefingData.mission_vision_values, true)}
            {renderEditableField("Produtos/serviços oferecidos", "products_services", briefingData.products_services, true)}
            {renderEditableField("Principais objetivos hoje", "current_objectives", briefingData.current_objectives, true)}
            {renderEditableField("Principal diferencial do negócio", "differentiator", briefingData.differentiator, true)}
          </>,
          hasCompanyProfile
        )}

        {/* Seção 5: Posicionamento */}
        {renderSection(
          "5. POSICIONAMENTO",
          <>
            {renderEditableField("Como quer ser percebida", "how_to_be_perceived", briefingData.how_to_be_perceived, true)}
            {renderEditableField("O que diferencia da concorrência", "competitive_differentiator", briefingData.competitive_differentiator, true)}
            {renderEditableField("Por que alguém deveria escolher você", "why_choose_you", briefingData.why_choose_you, true)}
          </>,
          hasPositioning
        )}

        {/* Seção 6: Personalidade da Marca */}
        {renderSection(
          "6. PERSONALIDADE DA MARCA",
          <>
            {renderEditableField("Sofisticada — Descontraída (1-5)", "sophisticated_relaxed_scale", briefingData.sophisticated_relaxed_scale)}
            {renderEditableField("Técnica — Emocional (1-5)", "technical_emotional_scale", briefingData.technical_emotional_scale)}
            {renderEditableField("Formal — Informal (1-5)", "formal_informal_scale", briefingData.formal_informal_scale)}
            {renderEditableField("Tradicional — Moderna (1-5)", "traditional_modern_scale", briefingData.traditional_modern_scale)}
            {renderEditableField("Exclusiva — Popular (1-5)", "exclusive_popular_scale", briefingData.exclusive_popular_scale)}
            {renderEditableField("3 palavras que definem a marca", "three_words", briefingData.three_words)}
          </>,
          hasPersonality
        )}

        {/* Seção 7: Concorrentes e Referências */}
        {renderSection(
          "7. CONCORRENTES E REFERÊNCIAS",
          <>
            {renderEditableField("Concorrentes locais/regionais/mundiais", "local_competitors", briefingData.local_competitors, true)}
            {renderEditableField("O que gosta nessas marcas", "likes_in_brands", briefingData.likes_in_brands, true)}
            {renderEditableField("Marcas que admira (mesmo fora do nicho)", "admired_brands", briefingData.admired_brands, true)}
            {renderEditableField("Outras informações", "extra_competitors_info", briefingData.extra_competitors_info, true)}
          </>,
          hasCompetitors
        )}

        {/* Seção 8: Preferências Visuais */}
        {renderSection(
          "8. PREFERÊNCIAS VISUAIS",
          <>
            {renderEditableField("Cores que NÃO quer", "colors_not_want", briefingData.colors_not_want)}
            {renderEditableField("Cores que gosta e quer explorar", "colors_want", briefingData.colors_want)}
            {renderEditableField("Tipos de fontes que gosta (links)", "fonts_like", briefingData.fonts_like)}
            {renderEditableField("Tipos de logo que prefere", "logo_types", briefingData.logo_types, true)}
            {renderEditableField("Referências visuais (links)", "visual_references", briefingData.visual_references, true)}
          </>,
          hasVisualPrefs
        )}

        {/* Seção 9: Final */}
        {renderSection(
          "9. FINAL",
          <>
            {renderEditableField("Algo mais a dizer", "anything_to_say", briefingData.anything_to_say, true)}
          </>,
          hasFinalInfo
        )}
      </div>

      {/* Botões de ação - Modo Manual ou Fallback */}
      {(manualMode || fallbackMode) && !sendSuccess && (
        <div className="preview-actions fallback-actions">
          <div className="action-message">
            {requiredFieldsFilled ? (
              <p>✅ Campos obrigatórios preenchidos! Você pode salvar ou enviar o briefing.</p>
            ) : (
              <p>⚠️ Preencha pelo menos: Nome, Email, Sobre a Empresa e Cores que Gosta</p>
            )}
          </div>
          <div className="action-buttons">
            <button 
              className="btn-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : '💾 Salvar Progresso'}
            </button>
            {requiredFieldsFilled && (
              <button 
                className="btn-finalize"
                onClick={handleFinalizeSend}
                disabled={isSending}
              >
                {isSending ? 'Enviando...' : '✓ Finalizar e Enviar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botão de Finalizar e Enviar - Modo Normal (apenas leitura) */}
      {!manualMode && !fallbackMode && isComplete && !sendSuccess && (
        <div className="preview-actions">
          <div className="action-message">
            <p>✨ Seu briefing está completo! Revise as informações acima e, se estiver tudo correto, finalize e envie.</p>
            <p className="action-note">Você e a Silver Brand House receberão um email de confirmação.</p>
          </div>
          <button 
            className="btn-finalize"
            onClick={handleFinalizeSend}
            disabled={isSending}
          >
            {isSending ? 'Enviando...' : '✓ Finalizar e Enviar Briefing'}
          </button>
        </div>
      )}

      {sendSuccess && (
        <div className="success-message">
          <h3>✅ Briefing Enviado com Sucesso!</h3>
          <p>Você receberá um email de confirmação em breve.</p>
          <p>A equipe da Silver Brand House entrará em contato.</p>
        </div>
      )}

      <div className="preview-footer">
        <p>SILVER BRAND HOUSE</p>
        <p>brandhousesilver@gmail.com | +55 11 96015 7100</p>
      </div>
    </div>
  )
}

export default BriefingPreview
