import React, { useState } from 'react'
import FieldHelpPanel from './FieldHelpPanel'
import './FieldHelpButton.css'

const FieldHelpButton = ({ fieldId, fieldLabel, currentFormState, sessionId, onApplyValue }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  console.log('FieldHelpButton renderizado:', { fieldId, fieldLabel, sessionId, hasAiHelp: !!sessionId })

  const handleClick = () => {
    console.log('FieldHelpButton clicado:', { fieldId, fieldLabel, sessionId })
    setIsHelpOpen(true)
  }

  const handleClose = () => {
    setIsHelpOpen(false)
  }

  const handleApplyValue = (value) => {
    onApplyValue?.(value)
    setIsHelpOpen(false)
  }

  return (
    <>
      <button 
        type="button"
        className="field-help-button"
        onClick={handleClick}
        title={`Ajuda inteligente para ${fieldLabel}`}
      >
        ✨ Ajuda Inteligente
      </button>

      {isHelpOpen && (
        <FieldHelpPanel
          fieldId={fieldId}
          fieldLabel={fieldLabel}
          currentFormState={currentFormState}
          sessionId={sessionId}
          onClose={handleClose}
          onApplyValue={handleApplyValue}
        />
      )}
    </>
  )
}

export default FieldHelpButton