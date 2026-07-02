import React, { useState, useEffect } from 'react'
import './BriefingPreview.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function BriefingPreview({ sessionData, briefingData, onUpdate }) {
  const [editedData, setEditedData] = useState({})
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Sincronizar com briefingData quando mudar
  useEffect(() => {
    setEditedData({ ...briefingData })
  }, [briefingData])

  const handleFieldChange = (fieldName, value) => {
    setEditedData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Atualizar no backend em tempo real
    if (onUpdate) {
      onUpdate(fieldName, value)
    }
  }

  const handleFinalizeSend = async () => {
    if (!window.confirm('Tem certeza que deseja finalizar e enviar o briefing? Um email será enviado para você e para a Silver Brand House.')) {
      return
    }

    setIsSending(true)
    
    try {
      const response = await fetch(`${API_URL}/api/briefing/${sessionData.session_id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefing_data: editedData,
          client_email: editedData.client_email || sessionData.client_email
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar briefing')
      }

      setSendSuccess(true)
      alert('✅ Briefing enviado com sucesso! Você receberá um email de confirmação em breve.')
      
    } catch (error) {
      console.error('Erro:', error)
      alert('❌ Erro ao enviar briefing. Por favor, tente novamente.')
    } finally {
      setIsSending(false)
    }
  }

  const renderEditableField = (label, fieldName, value, multiline = false) => {
    if (!value && !editedData[fieldName]) {
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
          />
        ) : (
          <input
            type="text"
            className="field-input"
            value={currentValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          />
        )}
      </div>
    )
  }

  const renderSection = (title, content, hasData) => {
    if (!hasData) return null
    
    return (
      <div className="preview-section">
        <h3 className="section-title">{title}</h3>
        <div className="section-content">
          {content}
        </div>
      </div>
    )
  }

  // Verificar quais seções têm dados
  const hasContactData = editedData.client_name || editedData.client_email || 
                         editedData.client_phone || editedData.city_state || 
                         editedData.website

  const hasBasicInfo = editedData.project_type || editedData.deadline

  const hasDeliverables = editedData.deliverables && editedData.deliverables.length > 0

  const hasCompanyProfile = editedData.company_description || editedData.products_services || 
                           editedData.mission_vision_values || editedData.diferencial || 
                           editedData.objectives

  const hasPositioning = editedData.positioning || editedData.differentiation || 
                        editedData.why_choose || editedData.keywords

  const hasCompetitors = editedData.competitors || editedData.references || 
                        editedData.what_you_like

  const hasVisualPrefs = editedData.preferred_colors || editedData.excluded_colors || 
                        editedData.logo_types || editedData.font_preferences

  const hasFinalInfo = editedData.additional_info

  const isComplete = sessionData.is_completed || sessionData.progress >= 95

  return (
    <div className="briefing-preview">
      <div className="preview-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" className="preview-logo" />
        <h1 className="preview-title">BRIEFING DE IDENTIDADE VISUAL</h1>
        <div className="preview-client">
          <strong>Cliente:</strong> {sessionData.client_name}
        </div>
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
            {renderEditableField("Nome completo", "client_name", briefingData.client_name || sessionData.client_name)}
            {renderEditableField("E-mail", "client_email", briefingData.client_email || sessionData.client_email)}
            {renderEditableField("Telefone", "client_phone", briefingData.client_phone || sessionData.client_phone)}
            {renderEditableField("Cidade/Estado", "city_state", briefingData.city_state)}
            {renderEditableField("Website/Instagram", "website", briefingData.website)}
          </>,
          hasContactData || sessionData.client_name
        )}

        {/* Seção 2: Informações Básicas */}
        {renderSection(
          "2. INFORMAÇÕES BÁSICAS",
          <>
            {renderEditableField("Tipo de projeto", "project_type", briefingData.project_type)}
            {renderEditableField("Prazo desejado", "deadline", briefingData.deadline)}
          </>,
          hasBasicInfo
        )}

        {/* Seção 4: Perfil da Empresa */}
        {renderSection(
          "4. PERFIL DA EMPRESA",
          <>
            {renderEditableField("Sobre a empresa", "company_description", briefingData.company_description, true)}
            {renderEditableField("Produtos/Serviços", "products_services", briefingData.products_services, true)}
            {renderEditableField("Missão/Visão/Valores", "mission_vision_values", briefingData.mission_vision_values, true)}
            {renderEditableField("Principal diferencial", "diferencial", briefingData.diferencial, true)}
            {renderEditableField("Objetivos principais", "objectives", briefingData.objectives, true)}
          </>,
          hasCompanyProfile
        )}

        {/* Seção 5: Posicionamento & Personalidade */}
        {renderSection(
          "5. POSICIONAMENTO & PERSONALIDADE",
          <>
            {renderEditableField("Como quer ser percebida", "positioning", briefingData.positioning, true)}
            {renderEditableField("O que diferencia da concorrência", "differentiation", briefingData.differentiation, true)}
            {renderEditableField("Por que escolher você", "why_choose", briefingData.why_choose, true)}
            {renderEditableField("3 palavras que definem a marca", "keywords", briefingData.keywords)}
          </>,
          hasPositioning
        )}

        {/* Seção 6: Concorrentes e Referências */}
        {renderSection(
          "6. CONCORRENTES E REFERÊNCIAS",
          <>
            {renderEditableField("Concorrentes", "competitors", briefingData.competitors, true)}
            {renderEditableField("Marcas que admira", "references", briefingData.references, true)}
            {renderEditableField("O que gosta nessas marcas", "what_you_like", briefingData.what_you_like, true)}
          </>,
          hasCompetitors
        )}

        {/* Seção 7: Preferências Visuais */}
        {renderSection(
          "7. PREFERÊNCIAS VISUAIS",
          <>
            {renderEditableField("Cores que GOSTA", "preferred_colors", briefingData.preferred_colors)}
            {renderEditableField("Cores que NÃO quer", "excluded_colors", briefingData.excluded_colors)}
            {renderEditableField("Tipos de logo preferidos", "logo_types", briefingData.logo_types)}
            {renderEditableField("Tipos de fontes", "font_preferences", briefingData.font_preferences)}
            {renderEditableField("Referências visuais (links)", "visual_references", briefingData.visual_references, true)}
          </>,
          hasVisualPrefs
        )}

        {/* Seção 8: Informações Finais */}
        {renderSection(
          "8. INFORMAÇÕES FINAIS",
          <>
            {renderEditableField("Observações adicionais", "additional_info", briefingData.additional_info, true)}
          </>,
          hasFinalInfo
        )}
      </div>

      {/* Botão de Finalizar e Enviar */}
      {isComplete && !sendSuccess && (
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
