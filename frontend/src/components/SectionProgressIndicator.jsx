import React from 'react'
import './SectionProgressIndicator.css'

const SECTIONS = [
  { id: 'contato', name: 'Contato', icon: '👤' },
  { id: 'basicas', name: 'Info. Básicas', icon: '📋' },
  { id: 'entrega', name: 'Entrega', icon: '📦' },
  { id: 'perfil', name: 'Perfil', icon: '🏢' },
  { id: 'posicionamento', name: 'Posicionamento', icon: '🎯' },
  { id: 'concorrentes', name: 'Concorrentes', icon: '🔍' },
  { id: 'visuais', name: 'Visual', icon: '🎨' },
  { id: 'final', name: 'Final', icon: '✨' }
]

function SectionProgressIndicator({ 
  currentSection, 
  overallProgress, 
  getSectionProgress, 
  showDetailed = false 
}) {
  const currentSectionIndex = SECTIONS.findIndex(s => s.id === currentSection)

  return (
    <div className="section-progress-indicator">
      <div className="progress-header">
        <span className="progress-text">{overallProgress}% concluído</span>
        <div className="overall-progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {showDetailed && (
        <div className="sections-grid">
          {SECTIONS.map((section, index) => {
            const sectionProgress = getSectionProgress ? getSectionProgress(section.id) : 0
            const isCurrentSection = section.id === currentSection
            const isCompleted = index < currentSectionIndex
            const isUpcoming = index > currentSectionIndex

            return (
              <div 
                key={section.id}
                className={`section-card ${
                  isCurrentSection ? 'current' :
                  isCompleted ? 'completed' :
                  isUpcoming ? 'upcoming' : ''
                }`}
              >
                <div className="section-icon">{section.icon}</div>
                <div className="section-info">
                  <div className="section-name">{section.name}</div>
                  <div className="section-progress">
                    <div className="section-progress-bar">
                      <div 
                        className="section-progress-fill"
                        style={{ width: `${sectionProgress}%` }}
                      />
                    </div>
                    <span className="section-progress-text">{sectionProgress}%</span>
                  </div>
                </div>
                {isCurrentSection && (
                  <div className="current-indicator">
                    <div className="pulse-dot"></div>
                  </div>
                )}
                {isCompleted && (
                  <div className="completed-indicator">✓</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!showDetailed && (
        <div className="sections-timeline">
          {SECTIONS.map((section, index) => {
            const isCurrentSection = section.id === currentSection
            const isCompleted = index < currentSectionIndex
            const position = (index / (SECTIONS.length - 1)) * 100

            return (
              <div
                key={section.id}
                className={`timeline-checkpoint ${
                  isCompleted ? 'completed' : 
                  isCurrentSection ? 'current' : 'upcoming'
                }`}
                style={{ left: `${position}%` }}
                title={section.name}
              >
                <div className="checkpoint-dot">
                  {isCompleted ? '✓' : section.icon}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SectionProgressIndicator