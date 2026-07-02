import '../pages/ChatPage.css'

export default {
  title: 'Páginas/ChatCompleto',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

// História 1: Chat Vazio - Aguardando Primeira Mensagem
export const ChatVazio = () => (
  <div className="chat-page">
    <div className="chat-container">
      <div className="chat-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" />
        <h2>Briefing de Identidade Visual</h2>
      </div>

      <div className="progress-container">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: '0%' }}></div>
        </div>
        <div className="progress-percentage">0% concluído</div>
      </div>

      <div className="messages-container">
        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">
              Olá! Sou consultor de design da Silver Brand House. Vamos criar
              sua identidade visual juntos?
            </div>
          </div>
        </div>
      </div>

      <form className="input-container">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Enviar
        </button>
      </form>
    </div>
  </div>
)

// História 2: Chat com Conversa Ativa
export const ChatAtivo = () => (
  <div className="chat-page">
    <div className="chat-container">
      <div className="chat-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" />
        <h2>Briefing de Identidade Visual - João Silva</h2>
      </div>

      <div className="progress-container">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: '35%' }}></div>
        </div>
        <div className="progress-percentage">35% concluído</div>
      </div>

      <div className="messages-container" style={{ height: '400px', overflowY: 'auto' }}>
        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">
              Olá! Sou consultor de design da Silver Brand House. Qual seu
              nome?
            </div>
            <div className="message-time">10:00</div>
          </div>
        </div>

        <div className="message user">
          <div className="message-content">
            <div className="message-text">João Silva</div>
            <div className="message-time">10:01</div>
          </div>
        </div>

        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">Prazer, João! Qual seu email?</div>
            <div className="message-time">10:01</div>
          </div>
        </div>

        <div className="message user">
          <div className="message-content">
            <div className="message-text">joao@exemplo.com</div>
            <div className="message-time">10:02</div>
          </div>
        </div>

        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">
              Me conte sobre sua empresa. Do que ela trata?
            </div>
            <div className="message-time">10:02</div>
          </div>
        </div>

        <div className="message user">
          <div className="message-content">
            <div className="message-text">
              É uma cafeteria artesanal focada em grãos brasileiros
            </div>
            <div className="message-time">10:03</div>
          </div>
        </div>

        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">
              Que cores você gosta para sua marca?
            </div>
            <div className="message-time">10:03</div>
          </div>
        </div>
      </div>

      <form className="input-container">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Enviar
        </button>
      </form>
    </div>
  </div>
)

// História 3: Chat com Checkboxes
export const ChatComCheckboxes = () => (
  <div className="chat-page">
    <div className="chat-container">
      <div className="chat-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" />
        <h2>Briefing de Identidade Visual - Maria Santos</h2>
      </div>

      <div className="progress-container">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: '45%' }}></div>
        </div>
        <div className="progress-percentage">45% concluído</div>
      </div>

      <div className="messages-container" style={{ height: '300px', overflowY: 'auto' }}>
        <div className="message assistant">
          <div className="message-content">
            <div className="message-text">
              Todo projeto já inclui: Logo, Paleta de Cores, Manual de Marca.
              <br />
              <br />
              Precisa de algo mais além disso?
            </div>
          </div>
        </div>
      </div>

      <div className="options-panel">
        <p className="options-title">Selecione os itens que você precisa:</p>
        <div className="options-grid">
          <label className="option-checkbox">
            <input type="checkbox" />
            <span>Template PowerPoint</span>
          </label>
          <label className="option-checkbox">
            <input type="checkbox" defaultChecked />
            <span>Cartão de Visitas</span>
          </label>
          <label className="option-checkbox">
            <input type="checkbox" defaultChecked />
            <span>Capas para Instagram</span>
          </label>
          <label className="option-checkbox">
            <input type="checkbox" />
            <span>Artes para Impressão</span>
          </label>
          <label className="option-checkbox">
            <input type="checkbox" />
            <span>Não preciso de itens extras</span>
          </label>
        </div>
        <button className="btn-submit-options">Enviar Seleção</button>
      </div>
    </div>
  </div>
)

// História 4: Chat com Loading
export const ChatLoading = () => (
  <div className="chat-page">
    <div className="chat-container">
      <div className="chat-header">
        <img src="/logo-horizontal.png" alt="Silver Brand House" />
        <h2>Briefing de Identidade Visual</h2>
      </div>

      <div className="progress-container">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: '25%' }}></div>
        </div>
        <div className="progress-percentage">25% concluído</div>
      </div>

      <div className="messages-container">
        <div className="message user">
          <div className="message-content">
            <div className="message-text">
              Gosto de preto, dourado e marrom café
            </div>
            <div className="message-time">10:05</div>
          </div>
        </div>

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

      <form className="input-container">
        <input
          type="text"
          placeholder="Aguardando resposta..."
          className="message-input"
          disabled
        />
        <button type="submit" className="send-button" disabled>
          Enviar
        </button>
      </form>
    </div>
  </div>
)
