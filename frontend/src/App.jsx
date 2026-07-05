import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import FormPage from './pages/FormPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import ChatProtectedRoute from './components/ChatProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Chat antigo - mantido para compatibilidade */}
        <Route 
          path="/chat/:sessionId" 
          element={
            <ChatProtectedRoute>
              <ChatPage />
            </ChatProtectedRoute>
          } 
        />
        <Route path="/chat" element={<Navigate to="/login" replace />} />
        
        {/* Novo formulário com ajuda inteligente por campo */}
        <Route 
          path="/form/:clientToken" 
          element={<FormPage />} 
        />
        
        {/* Admin - agora gera links para /form/:clientToken */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Novo admin sem proteção (usando API key) */}
        <Route path="/admin/new" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
