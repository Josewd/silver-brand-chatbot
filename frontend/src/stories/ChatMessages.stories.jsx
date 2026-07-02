import '../pages/ChatPage.css'

export default {
  title: 'Componentes/Chat/Mensagens',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

// Componente de Mensagem Isolado
const Message = ({ role, content, timestamp }) => {
  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        <div className="message-text">{content}</div>
        {timestamp && (
          <div className="message-time">
            {new Date(timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// História 1: Mensagem do Usuário
export const MensagemUsuario = () => (
  <div className="chat-container">
    <div className="messages-container">
      <Message
        role="user"
        content="Olá! Quero criar uma identidade visual para minha cafeteria."
        timestamp={new Date().toISOString()}
      />
    </div>
  </div>
)

// História 2: Mensagem do Assistente
export const MensagemAssistente = () => (
  <div className="chat-container">
    <div className="messages-container">
      <Message
        role="assistant"
        content="Que ótimo! Vamos criar algo especial. Qual o nome da sua cafeteria?"
        timestamp={new Date().toISOString()}
      />
    </div>
  </div>
)

// História 3: Conversa Completa
export const ConversaCompleta = () => (
  <div className="chat-container">
    <div className="messages-container">
      <Message
        role="assistant"
        content="Olá! Sou consultor de design da Silver Brand House. Vamos criar sua identidade visual?"
        timestamp="2024-01-01T10:00:00"
      />
      <Message
        role="user"
        content="Sim! É para uma cafeteria artesanal."
        timestamp="2024-01-01T10:00:30"
      />
      <Message
        role="assistant"
        content="Perfeito! Qual o nome da sua cafeteria?"
        timestamp="2024-01-01T10:00:45"
      />
      <Message
        role="user"
        content="Café Aroma"
        timestamp="2024-01-01T10:01:00"
      />
      <Message
        role="assistant"
        content="Lindo nome! Que cores você gosta para sua marca?"
        timestamp="2024-01-01T10:01:15"
      />
    </div>
  </div>
)

// História 4: Mensagem com Loading
export const MensagemLoading = () => (
  <div className="chat-container">
    <div className="messages-container">
      <Message
        role="user"
        content="Gosto de preto e dourado"
        timestamp={new Date().toISOString()}
      />
      <div className="message assistant loading">
        <div className="message-content">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
)
