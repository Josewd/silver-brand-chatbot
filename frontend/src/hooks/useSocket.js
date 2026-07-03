import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = useCallback(() => {
    if (socket?.connected) return;
    
    setConnecting(true);
    setError(null);
    
    console.log('🔌 Conectando ao WebSocket:', BACKEND_URL);
    
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: maxReconnectAttempts
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao WebSocket');
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado do WebSocket:', reason);
      setConnected(false);
      setConnecting(false);
      
      // Se foi desconexão do servidor, tentar reconectar
      if (reason === 'io server disconnect') {
        // Servidor desconectou intencionalmente, não tentar reconectar
        setError('Servidor desconectou a sessão');
      } else {
        // Desconexão de rede/cliente, tentar reconectar
        setConnecting(true);
      }
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('❌ Erro de conexão WebSocket:', err);
      setConnecting(false);
      setError('Erro ao conectar no servidor');
      
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError('Não foi possível conectar após várias tentativas');
        return;
      }
      
      // Tentar reconectar com delay exponencial
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Tentativa de reconexão ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts}`);
        connect();
      }, delay);
    });
    
    newSocket.on('error', (err) => {
      console.error('❌ Erro no WebSocket:', err);
      setError(err.message || 'Erro de comunicação');
    });
    
    setSocket(newSocket);
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setConnecting(false);
    }
  }, [socket]);
  
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);
  
  // Limpar timeout na desmontagem
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    socket,
    connected,
    connecting,
    error,
    connect,
    disconnect
  };
}