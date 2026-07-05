import React, { useState, useEffect } from 'react'

const MultiSelectInput = ({ field, value, onChange, onBlur, disabled = false }) => {
  const [selectedOptions, setSelectedOptions] = useState([])

  useEffect(() => {
    if (Array.isArray(value)) {
      setSelectedOptions(value)
    } else if (value && typeof value === 'string') {
      // Se valor vier como string, tentar fazer parse
      try {
        const parsed = JSON.parse(value)
        setSelectedOptions(Array.isArray(parsed) ? parsed : [value])
      } catch {
        setSelectedOptions([value])
      }
    } else {
      setSelectedOptions([])
    }
  }, [value])

  const handleOptionToggle = (option) => {
    if (disabled) return

    const newSelection = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option]

    setSelectedOptions(newSelection)
    onChange?.(newSelection)
    onBlur?.(newSelection)
  }

  return (
    <div className="multiselect-container">
      {field.options?.map((option, index) => {
        const isSelected = selectedOptions.includes(option)
        
        return (
          <div
            key={index}
            className={`multiselect-option ${isSelected ? 'selected' : ''}`}
            onClick={() => handleOptionToggle(option)}
          >
            <input
              type="checkbox"
              className="multiselect-checkbox"
              checked={isSelected}
              onChange={() => {}} // Controlled by parent click
              disabled={disabled}
            />
            <span className="multiselect-label">{option}</span>
          </div>
        )
      })}
    </div>
  )
}

export default MultiSelectInput