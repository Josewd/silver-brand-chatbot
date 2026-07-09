import React, { useState, useEffect } from 'react'
import './FormPanel.css'

// Componentes de input específicos
import TextInput from './inputs/TextInput'
import SelectInput from './inputs/SelectInput'
import MultiSelectInput from './inputs/MultiSelectInput'
import ScaleInput from './inputs/ScaleInput'
import TextareaInput from './inputs/TextareaInput'
import IncludedListInput from './inputs/IncludedListInput'
import FileUploadInput from './inputs/FileUploadInput'
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

  // Função para verificar se um campo deve ser exibido (campos condicionais)
  const shouldShowField = (field) => {
    if (!field.conditional) return true
    
    const { dependsOn, showWhen, value } = field.conditional
    const dependentValue = localState[dependsOn]
    
    if (!dependentValue) return false
    
    switch (showWhen) {
      case 'contains':
        return Array.isArray(dependentValue) 
          ? dependentValue.includes(value)
          : dependentValue === value
      case 'equals':
        return dependentValue === value
      default:
        return true
    }
  }

  const renderField = (field, sectionId) => {
    // Verificar se o campo deve ser exibido
    if (!shouldShowField(field)) return null
    
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

    // Usar FileUploadInput para o campo de referências visuais
    if (field.id === 'referencias_visuais') {
      inputComponent = (
        <FileUploadInput
          {...commonProps}
          field={{
            ...field,
            accept: 'image/*',
            multiple: true
          }}
        />
      )
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
    const scaleFields = section.fields.filter(field => field.type === 'scale' && shouldShowField(field))
    const wordsField = section.fields.find(field => field.id === 'tres_palavras' && shouldShowField(field))

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
          {section.fields.filter(shouldShowField).map(field => renderField(field, section.id))}
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
        <div className="header-logo-container">
          <img 
            src="/Logo.svg" 
            alt="Silver Brand Design" 
            className="header-logo"
          />
        </div>
        
        <div className="header-divider"></div>
        
        <div className="header-content">
          <div className="form-title-container">
            <div className="form-title">BRIEFING</div>
            <div className="form-subtitle">PROJETO DE<br/>IDENTIDADE VISUAL</div>
          <div className="form-description">
            Preencha este formulário com o máximo de informações sobre o seu projeto.<br/>
            Caso tenha dúvidas ou precise de orientações antes de preencher fique à vontade para
            entrar em contato através do e-mail: <strong>brandhousesilver@gmail.com</strong>
          
          <div className="client-info" style={{ border: 'none' }}>
            <span className="client-label">Cliente:</span>
            <span className="client-name" >{clientName}</span>
          </div>
          </div>
          </div>
        </div>
        
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