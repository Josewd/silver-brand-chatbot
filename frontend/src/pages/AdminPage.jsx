import React, { useState, useEffect } from 'react'
import './AdminPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function AdminPage() {
  const [sessions, setSessions] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    initial_context: ''
  })
  const [createdSession, setCreatedSession] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/sessions`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Erro ao carregar sessões:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const createSession = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sessão')
      }

      const data = await response.json()
      setCreatedSession(data)
      setFormData({
        client_name: '',
        client_email: '',
        client_phone: '',
        initial_context: ''
      })
      loadSessions()
      
    } catch (err) {
      alert('Erro ao criar sessão: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Link copiado para a área de transferência!')
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🎨 Silver Brand House</h1>
        <p>Painel de Controle — Sessões de Briefing</p>
      </header>

      <div className="admin-content">
        <div className="actions-bar">
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-create"
          >
            {showCreateForm ? '❌ Cancelar' : '➕ Nova Sessão'}
          </button>
        </div>

        {showCreateForm && (
          <div className="create-form-card">
            <h2>Criar Nova Sessão de Cliente</h2>
            <form onSubmit={createSession}>
              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleInputChange}
                  placeholder="Ex: Pradella Coffee"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  name="client_email"
                  value={formData.client_email}
                  onChange={handleInputChange}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="form-group">
                <label>Telefone (opcional)</label>
                <input
                  type="tel"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleInputChange}
                  placeholder="+55 11 99999-9999"
                />
              </div>

              <div className="form-group">
                <label>Contexto Inicial (opcional)</label>
                <textarea
                  name="initial_context"
                  value={formData.initial_context}
                  onChange={handleInputChange}
                  placeholder="Ex: Cliente quer identidade visual para cafeteria artesanal em Navan, Irlanda. Público-alvo são brasileiros expatriados."
                  rows="4"
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Sessão'}
              </button>
            </form>

            {createdSession && (
              <div className="success-card">
                <h3>✅ Sessão Criada com Sucesso!</h3>
                <div className="session-link">
                  <strong>Link do Chat:</strong>
                  <div className="link-container">
                    <input 
                      type="text" 
                      value={createdSession.chat_url} 
                      readOnly 
                    />
                    <button onClick={() => copyToClipboard(createdSession.chat_url)}>
                      📋 Copiar
                    </button>
                  </div>
                </div>
                <p className="info-text">
                  Envie este link para o cliente iniciar o briefing interativo.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="sessions-list">
          <h2>Sessões Recentes</h2>
          {sessions.length === 0 ? (
            <p className="empty-state">Nenhuma sessão criada ainda.</p>
          ) : (
            <div className="sessions-grid">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <h3>{session.client_name}</h3>
                    <span className={`status-badge ${session.is_completed ? 'completed' : 'pending'}`}>
                      {session.is_completed ? '✓ Completo' : '⏳ Em andamento'}
                    </span>
                  </div>
                  
                  <div className="session-info">
                    <div className="info-row">
                      <span className="label">Progresso:</span>
                      <span className="value">{session.progress}%</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Criado em:</span>
                      <span className="value">
                        {new Date(session.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="session-actions">
                    <button 
                      onClick={() => window.open(`/chat/${session.id}`, '_blank')}
                      className="btn-view"
                    >
                      👁️ Ver Chat
                    </button>
                    {session.is_completed && (
                      <button 
                        onClick={() => window.open(`${API_URL}/api/briefing/${session.id}/download`, '_blank')}
                        className="btn-download"
                      >
                        📄 Baixar PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
