import React from 'react'
import './BriefingPreview.css'

function BriefingPreview({ sessionData, briefingData }) {
  const renderField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return null
    }
    
    return (
      <div className="preview-field">
        <div className="field-label">{label}:</div>
        <div className="field-value">
          {Array.isArray(value) ? (
            <ul>
              {value.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : (
            value
          )}
        </div>
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
  const hasContactData = briefingData.client_name || briefingData.client_email || 
                         briefingData.client_phone || briefingData.city_state || 
                         briefingData.website

  const hasBasicInfo = briefingData.project_type || briefingData.deadline

  const hasDeliverables = briefingData.deliverables && briefingData.deliverables.length > 0

  const hasCompanyProfile = briefingData.company_description || briefingData.products_services || 
                           briefingData.mission_vision_values || briefingData.diferencial || 
                           briefingData.objectives

  const hasPositioning = briefingData.positioning || briefingData.differentiation || 
                        briefingData.why_choose || briefingData.keywords || 
                        briefingData.personality_scales

  const hasCompetitors = briefingData.competitors || briefingData.references || 
                        briefingData.what_you_like

  const hasVisualPrefs = briefingData.preferred_colors || briefingData.excluded_colors || 
                        briefingData.logo_types || briefingData.font_preferences || 
                        briefingData.visual_references

  const hasFinalInfo = briefingData.additional_info

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
        {/* Lista de Entrega Inicial (sempre visível) */}
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
            {renderField("Nome completo", briefingData.client_name || sessionData.client_name)}
            {renderField("E-mail", briefingData.client_email || sessionData.client_email)}
            {renderField("Telefone", briefingData.client_phone || sessionData.client_phone)}
            {renderField("Cidade/Estado", briefingData.city_state)}
            {renderField("Website/Instagram", briefingData.website)}
          </>,
          hasContactData || sessionData.client_name
        )}

        {/* Seção 2: Informações Básicas */}
        {renderSection(
          "2. INFORMAÇÕES BÁSICAS",
          <>
            {renderField("Tipo de projeto", briefingData.project_type)}
            {renderField("Prazo desejado", briefingData.deadline)}
          </>,
          hasBasicInfo
        )}

        {/* Seção 3: Lista de Entrega */}
        {renderSection(
          "3. ITENS EXTRAS SOLICITADOS",
          <>
            {renderField("Itens adicionais", briefingData.deliverables)}
            {renderField("Informações extras", briefingData.extra_items)}
          </>,
          hasDeliverables || briefingData.extra_items
        )}

        {/* Seção 4: Perfil da Empresa */}
        {renderSection(
          "4. PERFIL DA EMPRESA",
          <>
            {renderField("Sobre a empresa", briefingData.company_description)}
            {renderField("Produtos/Serviços", briefingData.products_services)}
            {renderField("Missão/Visão/Valores", briefingData.mission_vision_values)}
            {renderField("Principal diferencial", briefingData.diferencial)}
            {renderField("Objetivos principais", briefingData.objectives)}
          </>,
          hasCompanyProfile
        )}

        {/* Seção 5: Posicionamento & Personalidade */}
        {renderSection(
          "5. POSICIONAMENTO & PERSONALIDADE",
          <>
            {renderField("Como quer ser percebida", briefingData.positioning)}
            {renderField("O que diferencia da concorrência", briefingData.differentiation)}
            {renderField("Por que escolher você", briefingData.why_choose)}
            {renderField("3 palavras que definem a marca", briefingData.keywords)}
            {briefingData.personality_scales && Object.keys(briefingData.personality_scales).length > 0 && (
              <div className="preview-field">
                <div className="field-label">Escalas de Personalidade (1-5):</div>
                <div className="field-value">
                  <ul>
                    {Object.entries(briefingData.personality_scales).map(([scale, value]) => (
                      <li key={scale}>{scale}: {value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>,
          hasPositioning
        )}

        {/* Seção 6: Concorrentes e Referências */}
        {renderSection(
          "6. CONCORRENTES E REFERÊNCIAS",
          <>
            {renderField("Concorrentes", briefingData.competitors)}
            {renderField("Marcas que admira", briefingData.references)}
            {renderField("O que gosta nessas marcas", briefingData.what_you_like)}
          </>,
          hasCompetitors
        )}

        {/* Seção 7: Preferências Visuais */}
        {renderSection(
          "7. PREFERÊNCIAS VISUAIS",
          <>
            {renderField("Cores que GOSTA", briefingData.preferred_colors)}
            {renderField("Cores que NÃO quer", briefingData.excluded_colors)}
            {renderField("Tipos de logo preferidos", briefingData.logo_types)}
            {renderField("Tipos de fontes", briefingData.font_preferences)}
            {renderField("Referências visuais (links)", briefingData.visual_references)}
          </>,
          hasVisualPrefs
        )}

        {/* Seção 8: Informações Finais */}
        {renderSection(
          "8. INFORMAÇÕES FINAIS",
          <>
            {renderField("Observações adicionais", briefingData.additional_info)}
          </>,
          hasFinalInfo
        )}
      </div>

      <div className="preview-footer">
        <p>SILVER BRAND HOUSE</p>
        <p>brandhousesilver@gmail.com | +55 11 96015 7100</p>
      </div>
    </div>
  )
}

export default BriefingPreview
