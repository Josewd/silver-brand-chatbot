import React, { useState, useEffect } from 'react'

const SelectInput = ({ field, value, onChange, onBlur, disabled = false }) => {
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
    <select
      className="field-select"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      required={field.required}
      disabled={disabled}
    >
      <option value="">Selecione uma opção</option>
      {field.options?.map((option, index) => (
        <option key={index} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

export default SelectInput