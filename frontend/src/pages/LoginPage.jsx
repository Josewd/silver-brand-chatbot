import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBackendURL } from '../lib/backendConfig'
import './LoginPage.css'

const BACKEND_URL = getBackendURL()

function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Verificar se já está logado ao carregar a página
  React.useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Verificar se o token ainda é válido fazendo uma requisição
      fetch(`${BACKEND_URL}/api/admin/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          // Token válido, redirecionar para admin
          navigate('/admin')
        } else {
          // Token inválido, remover do localStorage
          localStorage.removeItem('admin_token')
        }
      })
      .catch(() => {
        // Erro na verificação, remover token
        localStorage.removeItem('admin_token')
      })
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Hash da senha antes de enviar (SHA-256)
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      const response = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: hashedPassword })
      })

      if (!response.ok) {
        throw new Error('Senha incorreta')
      }

      const data = await response.json()
      
      // Salvar token no localStorage
      localStorage.setItem('admin_token', data.token)
      
      // Redirecionar para admin
      navigate('/admin')
      
    } catch (err) {
      setError('Senha incorreta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para limpar token e começar do zero
  const clearSession = () => {
    localStorage.removeItem('admin_token')
    setError('')
    alert('Sessão limpa! Agora você pode fazer login novamente.')
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="/logo-horizontal.png" alt="Silver Brand House" className="login-logo" />
        <h1>Painel Administrativo</h1>
        <p className="login-subtitle">Sistema de Briefing Inteligente</p>
        
        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Senha do Admin:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha (silveradmin2024)"
              autoFocus
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Verificando...' : 'Entrar no Admin'}
          </button>
        </form>

        {/* Opções de desenvolvimento */}
        <div className="dev-options">
          <p className="dev-hint">💡 <strong>Opções de Desenvolvimento:</strong></p>
          
          <button 
            onClick={clearSession}
            className="dev-button clear"
          >
            🗑️ Limpar Sessão (Reset)
          </button>
          
          <p className="dev-note">
            Senha padrão: <code>silveradmin2024</code><br/>
            <small>💡 Chat só acessível via Admin com sessão válida</small>
          </p>
        </div>
        
        <div className="debug-info">
          <p><strong>🔍 Debug Info:</strong></p>
          <ul>
            <li>URL atual: {window.location.pathname}</li>
            <li>Backend: {BACKEND_URL}</li>
            <li>Token salvo: {localStorage.getItem('admin_token') ? 'SIM' : 'NÃO'}</li>
          </ul>
          {localStorage.getItem('admin_token') && (
            <button onClick={clearSession} className="dev-button clear">
              🗑️ Limpar Token
            </button>
          )}
        </div>
        <div className="system-info">
          <p><strong>📋 Sistema WebSocket + REST:</strong></p>
          <ul>
            <li>🟢 Backend: {BACKEND_URL}</li>
            <li>📝 35 campos automáticos</li>
            <li>💾 Persistência Supabase</li>
            <li>🤖 IA Groq integrada</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LoginPage