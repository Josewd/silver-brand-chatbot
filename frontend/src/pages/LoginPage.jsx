import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/logo-horizontal.png" alt="Silver Brand House" className="login-logo" />
          <div className="brand-line"></div>
        </div>
        
        <div className="login-content">
          <h1>Painel Administrativo</h1>
          <p className="login-subtitle">Sistema de Briefing Inteligente</p>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="password">Senha de Acesso</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha do administrador"
                autoFocus
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Verificando...' : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage