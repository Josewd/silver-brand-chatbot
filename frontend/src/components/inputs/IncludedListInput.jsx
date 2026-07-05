import React from 'react'

const IncludedListInput = ({ field }) => {
  return (
    <div className="included-list-container">
      <div className="included-items-grid">
        {field.options.map((item, index) => (
          <div key={index} className="included-item">
            <span className="bullet">•</span>
            <span className="item-text">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IncludedListInput