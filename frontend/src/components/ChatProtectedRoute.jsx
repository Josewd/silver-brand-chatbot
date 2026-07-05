import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function ChatProtectedRoute({ children }) {
  const { sessionId } = useParams()
  const [isValidSession, setIsValidSession] = useState(null) // null = verificando
  
  useEffect(() => {
    if (!sessionId) {
      setIsValidSession(false)
      return
    }

    // Verificar se a sessão existe e é válida
    fetch(`${BACKEND_URL}/sessions/${sessionId}`)
      .then(response => {
        if (response.ok) {
          setIsValidSession(true)
        } else {
          setIsValidSession(false)
        }
      })
      .catch(() => {
        setIsValidSession(false)
      })
  }, [sessionId])
  
  // Ainda verificando
  if (isValidSession === null) {
    return (
      <div style={{
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        Verificando sessão...
      </div>
    )
  }
  
  // Sessão inválida
  if (!isValidSession) {
    return <Navigate to="/login" replace />
  }
  
  // Sessão válida
  return children
}

export default ChatProtectedRoute