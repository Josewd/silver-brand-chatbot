import React, { useState, useEffect } from 'react'

const ScaleInput = ({ field, value, onChange, onBlur, disabled = false }) => {
  const [selectedValue, setSelectedValue] = useState(value || '')

  useEffect(() => {
    setSelectedValue(value || '')
  }, [value])

  const handleChange = (newValue) => {
    if (disabled) return

    setSelectedValue(newValue)
    onChange?.(newValue)
    onBlur?.(newValue)
  }

  const min = field.min || 1
  const max = field.max || 5
  const scaleValues = []

  for (let i = min; i <= max; i++) {
    scaleValues.push(i)
  }

  // Extrair labels das escalas (formato "Label1 — Label2")
  const labels = field.label?.split(' — ') || ['Mínimo', 'Máximo']
  const leftLabel = labels[0] || 'Mínimo'
  const rightLabel = labels[1] || 'Máximo'

  return (
    <div className="scale-container">
      <div className="scale-labels">
        <span className="scale-label">{leftLabel}</span>
        <div className="scale-inputs">
          {scaleValues.map(scaleValue => (
            <label key={scaleValue} className="scale-radio">
              <input
                type="radio"
                name={`scale-${field.id}`}
                value={scaleValue}
                checked={selectedValue === scaleValue.toString()}
                onChange={() => handleChange(scaleValue.toString())}
                disabled={disabled}
              />
            </label>
          ))}
        </div>
        <span className="scale-label">{rightLabel}</span>
      </div>
    </div>
  )
}

export default ScaleInput