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
  const hasContactData = editedData.nome || editedData.email || 
                         editedData.telefone || editedData.cidade_estado || 
                         editedData.website || editedData.empresa_slogan

  const hasBasicInfo = editedData.tipo_projeto || editedData.prazo

  const hasDeliverables = editedData.itens_padrao || editedData.itens_extra || editedData.info_extra_itens

  const hasCompanyProfile = editedData.sobre_empresa || 
                           editedData.produtos_servicos || 
                           editedData.missao_visao_valores || editedData.diferencial || 
                           editedData.objetivos_hoje

  const hasPositioning = editedData.como_ser_percebida || editedData.diferencial_concorrencia || 
                        editedData.por_que_escolher

  const hasPersonality = editedData.escala_sofisticada_descontraida || editedData.escala_tecnica_emocional ||
                        editedData.escala_formal_informal || editedData.escala_tradicional_moderna ||
                        editedData.escala_exclusiva_popular || editedData.tres_palavras

  const hasCompetitors = editedData.concorrentes_locais || editedData.gosta_nessas_marcas || 
                        editedData.marcas_admira || editedData.info_extra_concorrentes

  const hasVisualPrefs = editedData.cores_quer || editedData.cores_nao_quer || 
                        editedData.tipos_logo || editedData.fontes_gosta || editedData.referencias_visuais

  const hasFinalInfo = editedData.algo_a_dizer

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
          <strong>Cliente:</strong> {briefingData.nome || safeSessionData.client_name || 'Cliente'}
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
            currentSection={safeSessionData.current_section || 'contato'}
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
            {renderEditableField("Nome completo", "nome", briefingData.nome || safeSessionData.client_name)}
            {renderEditableField("E-mail", "email", briefingData.email || safeSessionData.client_email)}
            {renderEditableField("Nome da empresa e slogan", "empresa_slogan", briefingData.empresa_slogan)}
            {renderEditableField("Website/Instagram", "website", briefingData.website)}
            {renderEditableField("Telefone", "telefone", briefingData.telefone || safeSessionData.client_phone)}
            {renderEditableField("Cidade/Estado", "cidade_estado", briefingData.cidade_estado)}
          </>,
          hasContactData || safeSessionData.client_name
        )}

        {/* Seção 2: Informações Básicas */}
        {renderSection(
          "2. INFORMAÇÕES BÁSICAS",
          <>
            {renderEditableField("Projeto novo ou redesenho?", "tipo_projeto", briefingData.tipo_projeto)}
            {renderEditableField("Quando precisa do projeto pronto?", "prazo", briefingData.prazo)}
          </>,
          hasBasicInfo
        )}

        {/* Seção 3: Lista de Entrega */}
        {renderSection(
          "3. LISTA DE ENTREGA",
          <>
            {renderEditableField("Itens de identidade visual", "itens_padrao", briefingData.itens_padrao, true)}
            {renderEditableField("Itens adicionais", "itens_extra", briefingData.itens_extra, true)}
            {renderEditableField("Informações extras sobre os itens", "info_extra_itens", briefingData.info_extra_itens, true)}
          </>,
          hasDeliverables
        )}

        {/* Seção 4: Perfil da Empresa */}
        {renderSection(
          "4. PERFIL DA EMPRESA",
          <>
            {renderEditableField("Sobre a empresa (o que é, há quanto tempo existe)", "sobre_empresa", briefingData.sobre_empresa, true)}
            {renderEditableField("Missão, visão e valores", "missao_visao_valores", briefingData.missao_visao_valores, true)}
            {renderEditableField("Produtos/serviços oferecidos", "produtos_servicos", briefingData.produtos_servicos, true)}
            {renderEditableField("Principais objetivos hoje", "objetivos_hoje", briefingData.objetivos_hoje, true)}
            {renderEditableField("Principal diferencial do negócio", "diferencial", briefingData.diferencial, true)}
          </>,
          hasCompanyProfile
        )}

        {/* Seção 5: Posicionamento */}
        {renderSection(
          "5. POSICIONAMENTO",
          <>
            {renderEditableField("Como quer ser percebida", "como_ser_percebida", briefingData.como_ser_percebida, true)}
            {renderEditableField("O que diferencia da concorrência", "diferencial_concorrencia", briefingData.diferencial_concorrencia, true)}
            {renderEditableField("Por que alguém deveria escolher você", "por_que_escolher", briefingData.por_que_escolher, true)}
          </>,
          hasPositioning
        )}

        {/* Seção 6: Personalidade da Marca */}
        {renderSection(
          "6. PERSONALIDADE DA MARCA",
          <>
            {renderEditableField("Sofisticada — Descontraída (1-5)", "escala_sofisticada_descontraida", briefingData.escala_sofisticada_descontraida)}
            {renderEditableField("Técnica — Emocional (1-5)", "escala_tecnica_emocional", briefingData.escala_tecnica_emocional)}
            {renderEditableField("Formal — Informal (1-5)", "escala_formal_informal", briefingData.escala_formal_informal)}
            {renderEditableField("Tradicional — Moderna (1-5)", "escala_tradicional_moderna", briefingData.escala_tradicional_moderna)}
            {renderEditableField("Exclusiva — Popular (1-5)", "escala_exclusiva_popular", briefingData.escala_exclusiva_popular)}
            {renderEditableField("3 palavras que definem a marca", "tres_palavras", briefingData.tres_palavras)}
          </>,
          hasPersonality
        )}

        {/* Seção 7: Concorrentes e Referências */}
        {renderSection(
          "7. CONCORRENTES E REFERÊNCIAS",
          <>
            {renderEditableField("Concorrentes locais/regionais/mundiais", "concorrentes_locais", briefingData.concorrentes_locais, true)}
            {renderEditableField("O que gosta nessas marcas", "gosta_nessas_marcas", briefingData.gosta_nessas_marcas, true)}
            {renderEditableField("Marcas que admira (mesmo fora do nicho)", "marcas_admira", briefingData.marcas_admira, true)}
            {renderEditableField("Outras informações", "info_extra_concorrentes", briefingData.info_extra_concorrentes, true)}
          </>,
          hasCompetitors
        )}

        {/* Seção 8: Preferências Visuais */}
        {renderSection(
          "8. PREFERÊNCIAS VISUAIS",
          <>
            {renderEditableField("Cores que NÃO quer", "cores_nao_quer", briefingData.cores_nao_quer)}
            {renderEditableField("Cores que gosta e quer explorar", "cores_quer", briefingData.cores_quer)}
            {renderEditableField("Tipos de fontes que gosta (links)", "fontes_gosta", briefingData.fontes_gosta)}
            {renderEditableField("Tipos de logo que prefere", "tipos_logo", briefingData.tipos_logo, true)}
            {renderEditableField("Referências visuais (links)", "referencias_visuais", briefingData.referencias_visuais, true)}
          </>,
          hasVisualPrefs
        )}

        {/* Seção 9: Final */}
        {renderSection(
          "9. FINAL",
          <>
            {renderEditableField("Algo mais a dizer", "algo_a_dizer", briefingData.algo_a_dizer, true)}
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
