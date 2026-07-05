import React, { useState, useEffect } from 'react'

const TextInput = ({ field, value, onChange, onBlur, disabled = false }) => {
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

  const inputType = field.type === 'email' ? 'email' : 'text'

  return (
    <input
      type={inputType}
      className="field-input"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
      required={field.required}
      disabled={disabled}
    />
  )
}

export default TextInput