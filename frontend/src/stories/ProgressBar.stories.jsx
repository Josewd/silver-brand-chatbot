import '../pages/ChatPage.css'

export default {
  title: 'Componentes/Chat/ProgressBar',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

// Componente de Barra de Progresso
const ProgressBar = ({ progress = 0, sections = [] }) => {
  const sectionSize = 100 / sections.length

  return (
    <div className="progress-container">
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${progress}%` }}
        ></div>
        <div className="progress-checkpoints">
          {sections.map((section, index) => {
            const position = (index / (sections.length - 1)) * 100
            const isPassed = progress >= position
            const isCurrent =
              progress >= position && progress < position + sectionSize

            return (
              <div
                key={index}
                className={`checkpoint ${isPassed ? 'completed' : ''} ${
                  isCurrent ? 'active' : ''
                }`}
                style={{ left: `${position}%` }}
                title={section.name}
              >
                <div className="checkpoint-circle"></div>
                <div className="checkpoint-label">{section.name}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="progress-percentage">{progress}% concluído</div>
    </div>
  )
}

const BRIEFING_SECTIONS = [
  { id: 'intro', name: 'Início' },
  { id: 'contato', name: 'Contato' },
  { id: 'basicas', name: 'Básicas' },
  { id: 'entrega', name: 'Entrega' },
  { id: 'perfil', name: 'Perfil' },
  { id: 'posicionamento', name: 'Posicionamento' },
  { id: 'concorrentes', name: 'Concorrentes' },
  { id: 'visuais', name: 'Visual' },
  { id: 'final', name: 'Final' },
]

// História 1: Início (0%)
export const Inicio = () => (
  <ProgressBar progress={0} sections={BRIEFING_SECTIONS} />
)

// História 2: Contato Preenchido (15%)
export const ContatoPreenchido = () => (
  <ProgressBar progress={15} sections={BRIEFING_SECTIONS} />
)

// História 3: Meio do Processo (35%)
export const MeioProcesso = () => (
  <ProgressBar progress={35} sections={BRIEFING_SECTIONS} />
)

// História 4: Mais da Metade (60%)
export const MaisDaMetade = () => (
  <ProgressBar progress={60} sections={BRIEFING_SECTIONS} />
)

// História 5: Quase Completo (85%)
export const QuaseCompleto = () => (
  <ProgressBar progress={85} sections={BRIEFING_SECTIONS} />
)

// História 6: Completo (100%)
export const Completo = () => (
  <ProgressBar progress={100} sections={BRIEFING_SECTIONS} />
)
