import { useState } from 'react'
import '../pages/ChatPage.css'

export default {
  title: 'Componentes/Chat/Escalas de Personalidade',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

// Componente de Escalas
const PersonalityScales = ({ options, selectedOptions, onScaleChange }) => {
  return (
    <div className="options-panel">
      <p className="options-title">Marque de 1 a 5 para cada característica:</p>
      <div className="scales-container">
        {options.map((option, index) => {
          const currentValue = selectedOptions.find(v => v.startsWith(option.value))?.split(':')[1] || '3'
          return (
            <div key={index} className="scale-item">
              <div className="scale-labels">
                <span className="scale-label-left">{option.min_label}</span>
                <span className="scale-label-center">{option.label}</span>
                <span className="scale-label-right">{option.max_label}</span>
              </div>
              <div className="scale-control">
                {[1, 2, 3, 4, 5].map(rating => (
                  <label key={rating} className="scale-radio">
                    <input
                      type="radio"
                      name={option.value}
                      value={rating}
                      checked={currentValue === String(rating)}
                      onChange={() => onScaleChange(option.value, rating)}
                    />
                    <span className="scale-number">{rating}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <button 
        className="btn-submit-options"
        disabled={selectedOptions.length === 0}
      >
        Enviar Seleção
      </button>
    </div>
  )
}

// Opções das Escalas de Personalidade
const personalityScales = [
  {
    type: 'scale',
    label: 'Sofisticada vs Descontraída',
    value: 'scale_sophisticated',
    min_label: 'Descontraída',
    max_label: 'Sofisticada',
    min: 1,
    max: 5
  },
  {
    type: 'scale',
    label: 'Técnica vs Emocional',
    value: 'scale_technical',
    min_label: 'Emocional',
    max_label: 'Técnica',
    min: 1,
    max: 5
  },
  {
    type: 'scale',
    label: 'Formal vs Informal',
    value: 'scale_formal',
    min_label: 'Informal',
    max_label: 'Formal',
    min: 1,
    max: 5
  },
  {
    type: 'scale',
    label: 'Tradicional vs Moderna',
    value: 'scale_traditional',
    min_label: 'Moderna',
    max_label: 'Tradicional',
    min: 1,
    max: 5
  },
  {
    type: 'scale',
    label: 'Exclusiva vs Popular',
    value: 'scale_exclusive',
    min_label: 'Popular',
    max_label: 'Exclusiva',
    min: 1,
    max: 5
  }
]

// História 1: Escalas Interativas
export const EscalasInterativas = () => {
  const [selectedOptions, setSelectedOptions] = useState([
    'scale_sophisticated:3',
    'scale_technical:3',
    'scale_formal:3',
    'scale_traditional:3',
    'scale_exclusive:3'
  ])

  const handleScaleChange = (value, rating) => {
    setSelectedOptions(prev => {
      const filtered = prev.filter(v => !v.startsWith(value))
      return [...filtered, `${value}:${rating}`]
    })
  }

  return (
    <div className="chat-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <PersonalityScales
        options={personalityScales}
        selectedOptions={selectedOptions}
        onScaleChange={handleScaleChange}
      />
    </div>
  )
}

// História 2: Marca Sofisticada
export const MarcaSofisticada = () => {
  const [selectedOptions] = useState([
    'scale_sophisticated:5',
    'scale_technical:4',
    'scale_formal:5',
    'scale_traditional:4',
    'scale_exclusive:5'
  ])

  const handleScaleChange = () => {}

  return (
    <div className="chat-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <PersonalityScales
        options={personalityScales}
        selectedOptions={selectedOptions}
        onScaleChange={handleScaleChange}
      />
    </div>
  )
}

// História 3: Marca Descontraída
export const MarcaDescontraida = () => {
  const [selectedOptions] = useState([
    'scale_sophisticated:1',
    'scale_technical:2',
    'scale_formal:1',
    'scale_traditional:2',
    'scale_exclusive:1'
  ])

  const handleScaleChange = () => {}

  return (
    <div className="chat-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <PersonalityScales
        options={personalityScales}
        selectedOptions={selectedOptions}
        onScaleChange={handleScaleChange}
      />
    </div>
  )
}

// História 4: Marca Equilibrada
export const MarcaEquilibrada = () => {
  const [selectedOptions] = useState([
    'scale_sophisticated:3',
    'scale_technical:3',
    'scale_formal:3',
    'scale_traditional:3',
    'scale_exclusive:3'
  ])

  const handleScaleChange = () => {}

  return (
    <div className="chat-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <PersonalityScales
        options={personalityScales}
        selectedOptions={selectedOptions}
        onScaleChange={handleScaleChange}
      />
    </div>
  )
}

// História 5: Marca Moderna e Popular
export const MarcaModernaPopular = () => {
  const [selectedOptions] = useState([
    'scale_sophisticated:2',
    'scale_technical:2',
    'scale_formal:2',
    'scale_traditional:1',
    'scale_exclusive:1'
  ])

  const handleScaleChange = () => {}

  return (
    <div className="chat-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <PersonalityScales
        options={personalityScales}
        selectedOptions={selectedOptions}
        onScaleChange={handleScaleChange}
      />
    </div>
  )
}
