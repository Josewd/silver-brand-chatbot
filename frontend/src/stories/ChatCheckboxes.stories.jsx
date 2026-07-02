import { useState } from 'react'
import '../pages/ChatPage.css'

export default {
  title: 'Componentes/Chat/Checkboxes',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

// Componente de Checkbox Options
const CheckboxOptions = ({ options: initialOptions, onSubmit }) => {
  const [selectedOptions, setSelectedOptions] = useState([])

  const handleToggle = (value) => {
    if (value === 'none') {
      setSelectedOptions(['none'])
    } else {
      setSelectedOptions((prev) => {
        const newSelected = prev.filter((v) => v !== 'none')
        if (newSelected.includes(value)) {
          return newSelected.filter((v) => v !== value)
        } else {
          return [...newSelected, value]
        }
      })
    }
  }

  return (
    <div className="options-panel">
      <p className="options-title">Selecione os itens que você precisa:</p>
      <div className="options-grid">
        {initialOptions.map((option, index) => (
          <label key={index} className="option-checkbox">
            <input
              type="checkbox"
              checked={selectedOptions.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSubmit(selectedOptions)}
        className="btn-submit-options"
        disabled={selectedOptions.length === 0}
      >
        Enviar Seleção
      </button>
    </div>
  )
}

// Opções da Seção de Entrega
const deliveryOptions = [
  {
    type: 'checkbox',
    label: 'Template PowerPoint',
    value: 'template_ppt',
  },
  {
    type: 'checkbox',
    label: 'Cartão de Visitas',
    value: 'cartao_visitas',
  },
  {
    type: 'checkbox',
    label: 'Capas para Destaques do Instagram',
    value: 'capas_instagram',
  },
  {
    type: 'checkbox',
    label: 'Artes para Impressão',
    value: 'artes_impressao',
  },
  {
    type: 'checkbox',
    label: 'Não preciso de itens extras',
    value: 'none',
  },
]

// História 1: Checkboxes de Entrega
export const CheckboxesEntrega = () => (
  <div className="chat-container">
    <CheckboxOptions
      options={deliveryOptions}
      onSubmit={(selected) => {
        console.log('Selecionados:', selected)
        alert(`Você selecionou: ${selected.join(', ')}`)
      }}
    />
  </div>
)

// História 2: Checkboxes com 1 Item Selecionado
export const UmItemSelecionado = () => {
  const [selected, setSelected] = useState(['cartao_visitas'])

  return (
    <div className="chat-container">
      <div className="options-panel">
        <p className="options-title">Selecione os itens que você precisa:</p>
        <div className="options-grid">
          {deliveryOptions.map((option, index) => (
            <label key={index} className="option-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => {
                  if (selected.includes(option.value)) {
                    setSelected(selected.filter((v) => v !== option.value))
                  } else {
                    setSelected([...selected, option.value])
                  }
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button
          className="btn-submit-options"
          disabled={selected.length === 0}
        >
          Enviar Seleção
        </button>
      </div>
    </div>
  )
}

// História 3: Checkboxes com Vários Itens
export const VariosItensSelecionados = () => {
  const [selected, setSelected] = useState([
    'template_ppt',
    'cartao_visitas',
    'capas_instagram',
  ])

  return (
    <div className="chat-container">
      <div className="options-panel">
        <p className="options-title">Selecione os itens que você precisa:</p>
        <div className="options-grid">
          {deliveryOptions.map((option, index) => (
            <label key={index} className="option-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                readOnly
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button className="btn-submit-options" disabled={false}>
          Enviar Seleção
        </button>
      </div>
    </div>
  )
}

// História 4: Nenhum Item Selecionado
export const NenhumItemSelecionado = () => {
  const [selected, setSelected] = useState(['none'])

  return (
    <div className="chat-container">
      <div className="options-panel">
        <p className="options-title">Selecione os itens que você precisa:</p>
        <div className="options-grid">
          {deliveryOptions.map((option, index) => (
            <label key={index} className="option-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                readOnly
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button className="btn-submit-options" disabled={false}>
          Enviar Seleção
        </button>
      </div>
    </div>
  )
}
