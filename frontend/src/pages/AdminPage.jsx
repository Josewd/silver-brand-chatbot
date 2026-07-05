import React, { useState, useEffect } from 'react'
import './AdminPage.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const AdminPage = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [createSessionForm, setCreateSessionForm] = useState({
    createdBy: 'admin',
    prefill: {}
  })
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Carregar sessões ao montar o componente
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/api/admin/sessions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'silver-admin-2026-key'}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar sessões')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Erro ao carregar sessões:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${BACKEND_URL}/api/admin/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'silver-admin-2026-key'}`
        },
        body: JSON.stringify({
          createdBy: createSessionForm.createdBy,
          prefill: createSessionForm.prefill
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sessão')
      }

      const newSession = await response.json()
      
      // Adicionar nova sessão à lista
      setSessions(prev => [newSession, ...prev])
      
      // Limpar formulário
      setCreateSessionForm({
        createdBy: 'admin',
        prefill: {}
      })
      setShowCreateForm(false)

      // Copiar link para clipboard
      navigator.clipboard.writeText(newSession.clientLink)
      alert(`✅ Sessão criada com sucesso!\nLink copiado para clipboard:\n${newSession.clientLink}`)

    } catch (err) {
      console.error('Erro ao criar sessão:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Link copiado para clipboard!')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'in_progress': return '#3b82f6'
      case 'draft': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completo'
      case 'in_progress': return 'Em Progresso'
      case 'draft': return 'Rascunho'
      default: return status
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="header-content">
            <img src="/logo-horizontal.png" alt="Silver Brand Design" className="admin-logo" />
            <h1 className="admin-title">Painel Administrativo</h1>
            <p className="admin-subtitle">Gerenciar sessões de briefing de marca</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            {error}
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        {/* Create Session Button */}
        <div className="admin-actions">
          <button 
            className="btn-create-session"
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={loading}
          >
            + Nova Sessão de Cliente
          </button>
        </div>

        {/* Create Session Form */}
        {showCreateForm && (
          <div className="create-session-form">
            <h3>Criar Nova Sessão</h3>
            <form onSubmit={createNewSession}>
              <div className="form-group">
                <label>Criado por:</label>
                <input
                  type="text"
                  value={createSessionForm.createdBy}
                  onChange={(e) => setCreateSessionForm({
                    ...createSessionForm,
                    createdBy: e.target.value
                  })}
                  placeholder="Nome do admin"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Pré-preenchimento (opcional):</label>
                <div className="prefill-inputs">
                  <div className="input-row">
                    <label>Nome do cliente:</label>
                    <input
                      type="text"
                      value={createSessionForm.prefill.nome || ''}
                      onChange={(e) => setCreateSessionForm({
                        ...createSessionForm,
                        prefill: {
                          ...createSessionForm.prefill,
                          nome: e.target.value
                        }
                      })}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  
                  <div className="input-row">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={createSessionForm.prefill.email || ''}
                      onChange={(e) => setCreateSessionForm({
                        ...createSessionForm,
                        prefill: {
                          ...createSessionForm.prefill,
                          email: e.target.value
                        }
                      })}
                      placeholder="Ex: joao@empresa.com"
                    />
                  </div>
                  
                  <div className="input-row">
                    <label>Telefone:</label>
                    <input
                      type="tel"
                      value={createSessionForm.prefill.telefone || ''}
                      onChange={(e) => setCreateSessionForm({
                        ...createSessionForm,
                        prefill: {
                          ...createSessionForm.prefill,
                          telefone: e.target.value
                        }
                      })}
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>
                  
                  <div className="input-row">
                    <label>Nome da empresa:</label>
                    <input
                      type="text"
                      value={createSessionForm.prefill.empresa_slogan || ''}
                      onChange={(e) => setCreateSessionForm({
                        ...createSessionForm,
                        prefill: {
                          ...createSessionForm.prefill,
                          empresa_slogan: e.target.value
                        }
                      })}
                      placeholder="Ex: Empresa XYZ - Inovação em Design"
                    />
                  </div>
                </div>
                <small>Deixe em branco os campos que o cliente preencherá</small>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Sessão'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions List */}
        <div className="sessions-section">
          <div className="section-header">
            <h2>Sessões Criadas ({sessions.length})</h2>
            <button onClick={loadSessions} disabled={loading} className="btn-refresh">
              {loading ? '⏳' : '🔄'} Atualizar
            </button>
          </div>

          {loading && sessions.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando sessões...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma sessão criada ainda.</p>
              <p>Clique em "Nova Sessão de Cliente" para começar.</p>
            </div>
          ) : (
            <div className="sessions-grid">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <div className="session-id">#{session.id?.substring(0, 8) || 'N/A'}</div>
                    <div 
                      className="session-status"
                      style={{ backgroundColor: getStatusColor(session.status) }}
                    >
                      {getStatusLabel(session.status)}
                    </div>
                  </div>

                  <div className="session-info">
                    <div className="info-row">
                      <span className="info-label">Criado por:</span>
                      <span className="info-value">{session.createdBy || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Data:</span>
                      <span className="info-value">{session.createdAt ? formatDate(session.createdAt) : 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Progresso geral:</span>
                      <span className="info-value">
                        {session.progress && Object.keys(session.progress).length > 0 ? 
                          Math.round(Object.values(session.progress).reduce((a, b) => a + b, 0) / Object.values(session.progress).length) || 0
                          : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="session-actions">
                    <button 
                      className="btn-copy-link"
                      onClick={() => copyToClipboard(`${window.location.origin}/form/${session.clientToken || 'N/A'}`)}
                      disabled={!session.clientToken}
                    >
                      📋 Copiar Link
                    </button>
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