import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { getSessionId, setSessionId, generateSessionId } from '../lib/sessionId';

export function useFormState() {
  const { socket, connected } = useSocket();
  const [sessionId, setSessionIdState] = useState(null);
  const [formData, setFormData] = useState({});
  const [progress, setProgress] = useState({ sections: {}, overall: 0 });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  
  // Inicializar sessão
  useEffect(() => {
    if (!connected || !socket) return;
    
    let currentSessionId = getSessionId();
    
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      setSessionId(currentSessionId);
    }
    
    setSessionIdState(currentSessionId);
    
    // Entrar na sessão
    socket.emit('join_session', { sessionId: currentSessionId });
    
    console.log('📡 Entrando na sessão:', currentSessionId);
    
  }, [connected, socket]);
  
  // Configurar listeners de eventos do WebSocket
  useEffect(() => {
    if (!socket) return;
    
    // Sessão pronta
    socket.on('session_ready', (data) => {
      console.log('✅ Sessão pronta:', data);
      setSessionIdState(data.sessionId);
      setFormData(data.formState || {});
      setProgress(data.progress || { sections: {}, overall: 0 });
      setMessages(data.messages || []);
      setSessionReady(true);
    });
    
    // Nova mensagem do assistente
    socket.on('assistant_message', (data) => {
      console.log('🤖 Mensagem do assistente:', data);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toISOString()
      }]);
      setLoading(false);
    });
    
    // Atualização do formulário
    socket.on('form_update', (data) => {
      console.log('📝 Atualização do formulário:', data);
      
      if (data.fields) {
        setFormData(prev => ({ ...prev, ...data.fields }));
      }
      
      if (data.progress) {
        setProgress(data.progress);
      }
    });
    
    // Erro
    socket.on('error', (data) => {
      console.error('❌ Erro do servidor:', data);
      setLoading(false);
      // Poderia mostrar toast/notificação aqui
    });
    
    return () => {
      socket.off('session_ready');
      socket.off('assistant_message');
      socket.off('form_update');
      socket.off('error');
    };
  }, [socket]);
  
  // Enviar mensagem
  const sendMessage = useCallback((text) => {
    if (!socket || !sessionId || !text.trim()) return;
    
    setLoading(true);
    
    // Adicionar mensagem do usuário ao estado local imediatamente
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }]);
    
    // Enviar para o servidor
    socket.emit('user_message', {
      sessionId,
      text: text.trim()
    });
    
    console.log('📤 Enviando mensagem:', text);
    
  }, [socket, sessionId]);
  
  return {
    sessionId,
    formData,
    progress,
    messages,
    loading,
    sessionReady,
    sendMessage,
    connected
  };
}