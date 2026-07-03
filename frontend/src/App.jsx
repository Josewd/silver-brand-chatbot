import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import ChatProtectedRoute from './components/ChatProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Chat só acessível com sessionId específico e válido */}
        <Route 
          path="/chat/:sessionId" 
          element={
            <ChatProtectedRoute>
              <ChatPage />
            </ChatProtectedRoute>
          } 
        />
        {/* Qualquer acesso a /chat sem sessionId redireciona para login */}
        <Route path="/chat" element={<Navigate to="/login" replace />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
