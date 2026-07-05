import React, { useState, useEffect } from 'react'
import './FormPanel.css'

// Componentes de input específicos
import TextInput from './inputs/TextInput'
import SelectInput from './inputs/SelectInput'
import MultiSelectInput from './inputs/MultiSelectInput'
import ScaleInput from './inputs/ScaleInput'
import TextareaInput from './inputs/TextareaInput'
import IncludedListInput from './inputs/IncludedListInput'
import FieldHelpButton from './FieldHelpButton'

const FormPanel = ({ 
  schema, 
  formState = {}, 
  onFieldChange, 
  onFieldBlur, 
  progress = {},
  readOnly = false,
  sessionData = null
}) => {
  const [localState, setLocalState] = useState(formState)

  // Sincronizar com formState externo
  useEffect(() => {
    setLocalState(formState)
  }, [formState])

  const handleFieldChange = (fieldId, value) => {
    const newState = { ...localState, [fieldId]: value }
    setLocalState(newState)
    onFieldChange?.(fieldId, value)
  }

  const handleFieldBlur = (fieldId, value) => {
    onFieldBlur?.(fieldId, value)
  }

  // Função para determinar o layout específico da seção
  const getSectionFieldsClass = (sectionId) => {
    if (sectionId === 'contato') return 'section-fields contact-layout'
    if (sectionId === 'info_basicas') return 'section-fields basic-layout'
    if (sectionId === 'personalidade') return 'section-fields personality-grid'
    return 'section-fields'
  }

  // Função para gerar placeholders automáticos
  const getFieldPlaceholder = (fieldId, label) => {
    const customPlaceholders = {
      'nome': 'Digite seu nome completo',
      'email': 'exemplo@email.com',
      'empresa_slogan': 'Nome da Empresa - Slogan opcional',
      'website': 'https://www.site.com ou @instagram',
      'telefone': '(11) 99999-9999',
      'cidade_estado': 'São Paulo/SP'
    }
    return customPlaceholders[fieldId] || `Digite ${label.toLowerCase()}`
  }

  const renderField = (field, sectionId) => {
    const fieldValue = localState[field.id] || ''
    const fieldKey = `${sectionId}-${field.id}`

    const commonProps = {
      key: fieldKey,
      field: {
        ...field,
        placeholder: field.placeholder || getFieldPlaceholder(field.id, field.label)
      },
      value: fieldValue,
      onChange: (value) => handleFieldChange(field.id, value),
      onBlur: (value) => handleFieldBlur(field.id, value),
      disabled: readOnly
    }

    let inputComponent
    switch (field.type) {
      case 'text':
      case 'email':
        inputComponent = <TextInput {...commonProps} />
        break
      case 'select':
        inputComponent = <SelectInput {...commonProps} />
        break
      case 'multiselect':
        inputComponent = <MultiSelectInput {...commonProps} />
        break
      case 'scale':
        inputComponent = <ScaleInput {...commonProps} />
        break
      case 'textarea':
        inputComponent = <TextareaInput {...commonProps} />
        break
      case 'included_list':
        inputComponent = <IncludedListInput {...commonProps} />
        break
      default:
        inputComponent = <TextInput {...commonProps} />
    }

    // Adicionar exemplos específicos baseados no PDF
    const getFieldExample = (fieldId) => {
      const examples = {
        'como_ser_percebida': 'Exemplo: Como referência, premium, acolhedora, moderna...',
        'tres_palavras': 'Exemplo: Informação, Respeito e Humanidade',
        'info_extra_itens': 'Exemplo: Também preciso de letreiro (2m x 0,5m) e um uniforme.',
        'gosta_nessas_marcas': 'O que você gosta nessas marcas?'
      }
      return examples[fieldId] || null
    }

    const example = getFieldExample(field.id)

    return (
      <div key={fieldKey} className="form-field">
        <div className="field-header">
          <label className="field-label">
            {field.label}
            {field.required && <span className="field-required"> *</span>}
          </label>
          {field.ai_help && (
            <FieldHelpButton 
              fieldId={field.id}
              fieldLabel={field.label}
              currentFormState={localState}
              sessionId={sessionData?.id}
              onApplyValue={(value) => handleFieldChange(field.id, value)}
            />
          )}
        </div>
        {inputComponent}
        {example && <div className="field-example">{example}</div>}
      </div>
    )
  }

  // Renderização especial para seção de personalidade
  const renderPersonalitySection = (section) => {
    const scaleFields = section.fields.filter(field => field.type === 'scale')
    const wordsField = section.fields.find(field => field.id === 'tres_palavras')

    // Função para renderizar campo de escala sem label
    const renderScaleField = (field) => {
      const fieldValue = localState[field.id] || ''
      const fieldKey = `${section.id}-${field.id}`

      const commonProps = {
        key: fieldKey,
        field: {
          ...field,
          placeholder: field.placeholder || getFieldPlaceholder(field.id, field.label)
        },
        value: fieldValue,
        onChange: (value) => handleFieldChange(field.id, value),
        onBlur: (value) => handleFieldBlur(field.id, value),
        disabled: readOnly
      }

      return (
        <div key={fieldKey} className="form-field scale-field-no-label">
          <ScaleInput {...commonProps} />
        </div>
      )
    }

    return (
      <div key={section.id} className="form-section">
        <div className="section-header">
          <h3 className="section-title">{section.label}</h3>
        </div>
        <div className="personality-grid">
          <div className="personality-scales">
            <div className="field-label" style={{ marginBottom: '15px' }}>Marque de 1 a 5:</div>
            {scaleFields.map(field => renderScaleField(field))}
          </div>
          {wordsField && (
            <div className="personality-words">
              {renderField(wordsField, section.id)}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSection = (section) => {
    // Renderização especial para personalidade
    if (section.id === 'personalidade') {
      return renderPersonalitySection(section)
    }

    const sectionProgress = progress[section.id] || 0
    const isCompleted = sectionProgress === 100
    const hasFields = sectionProgress > 0

    return (
      <div key={section.id} className={`form-section ${isCompleted ? 'completed' : hasFields ? 'in-progress' : 'pending'}`}>
        <div className="section-header">
          <h3 className="section-title">{section.label}</h3>
          <div className="section-progress">
            <span className="progress-text">{sectionProgress}%</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${sectionProgress}%` }}
              />
            </div>
          </div>
        </div>
        <div className={getSectionFieldsClass(section.id)}>
          {section.fields.map(field => renderField(field, section.id))}
        </div>
      </div>
    )
  }

  if (!schema || !schema.sections) {
    return (
      <div className="form-panel loading">
        <div className="loading-message">Carregando formulário...</div>
      </div>
    )
  }

  // Obter o nome do cliente do formState
  const clientName = localState.empresa_slogan || localState.nome || 'Cliente'

  return (
    <div className="form-panel">
      <div className="form-header">
        <div className="urgency-note">
          * Caso você tenha urgência<br/>
          é possível que eu consiga<br/>
          ajudá-lo a realizar o projeto<br/>
          em menos de um mês. Neste<br/>
          caso, uma taxa de urgência<br/>
          será aplicada sobre o valor<br/>
          total do projeto.
        </div>
        
        <div className="brand-contact">
          SILVER BRAND HOUSE<br/>
          brandhousesilver@gmail.com<br/>
          +55 11 96015 7100
        </div>
        
        <h1 className="form-title">BRIEFING.</h1>
        <h2 className="form-subtitle">PROJETO DE<br/>IDENTIDADE VISUAL</h2>
        
        <div className="form-description">
          Preencha este formulário com o máximo de informações que puder sobre seu
          projeto. Caso tenha dúvidas ou precise de orientações antes de preencher fique
          à vontade para entrar em contato através do e-mail abaixo:<br/>
          brandhousesilver@gmail.com.
        </div>
        
        <div className="client-info">
          <div className="client-label">Cliente:</div>
          <div className="client-name">{clientName}</div>
        </div>
        
        <div className="section-number">2</div>
      </div>

      <div className="form-content">
        <div className="form-sections">
          {schema.sections.map(renderSection)}
        </div>

        {readOnly && (
          <div className="readonly-notice">
            Modo somente leitura
          </div>
        )}
      </div>
    </div>
  )
}

export default FormPanel