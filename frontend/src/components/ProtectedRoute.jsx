import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = verificando
  const token = localStorage.getItem('admin_token')
  
  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false)
      return
    }

    // Verificar se o token é válido
    fetch(`${BACKEND_URL}/api/admin/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('admin_token')
        setIsAuthenticated(false)
      }
    })
    .catch(() => {
      localStorage.removeItem('admin_token')
      setIsAuthenticated(false)
    })
  }, [token])
  
  // Ainda verificando
  if (isAuthenticated === null) {
    return <div style={{padding: '20px', textAlign: 'center'}}>Verificando autenticação...</div>
  }
  
  // Não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Autenticado
  return children
}

export default ProtectedRoute
