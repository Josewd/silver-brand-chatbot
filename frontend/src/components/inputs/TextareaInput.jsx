import React, { useState, useEffect } from 'react'

const TextareaInput = ({ field, value, onChange, onBlur, disabled = false }) => {
  const [localValue, setLocalValue] = useState(value || '')

  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  const handleChange = (e) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const handleBlur = (e) => {
    const newValue = e.target.value
    onBlur?.(newValue)
  }

  return (
    <textarea
      className="field-textarea"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={field.placeholder || `Descreva ${field.label.toLowerCase()}`}
      required={field.required}
      disabled={disabled}
      rows={field.rows || 4}
    />
  )
}

export default TextareaInput