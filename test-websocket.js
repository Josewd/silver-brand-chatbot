#!/usr/bin/env node

const io = require('socket.io-client');

const BACKEND_URL = 'https://silver-brand-chatbot.onrender.com';
const SESSION_ID = '7ea3af33-919c-4230-b206-95efe26395ce';

console.log('🔌 Conectando ao WebSocket:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

socket.on('connect', () => {
  console.log('✅ Conectado ao WebSocket!');
  
  // Entrar na sessão
  console.log('📡 Entrando na sessão:', SESSION_ID);
  socket.emit('join_session', { sessionId: SESSION_ID });
});

socket.on('session_ready', (data) => {
  console.log('✅ Sessão pronta:', data);
  
  // Enviar mensagem de teste
  console.log('📤 Enviando mensagem de teste...');
  socket.emit('user_message', {
    sessionId: SESSION_ID,
    text: 'Olá, meu nome é Teste'
  });
});

socket.on('assistant_message', (data) => {
  console.log('🤖 Resposta do assistente:', data);
});

socket.on('form_update', (data) => {
  console.log('📝 Atualização do formulário:', data);
});

socket.on('error', (error) => {
  console.log('❌ Erro WebSocket:', error);
});

socket.on('connect_error', (error) => {
  console.log('❌ Erro de conexão:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Desconectado:', reason);
  process.exit(0);
});

// Timeout para encerrar teste
setTimeout(() => {
  console.log('⏰ Timeout - encerrando teste');
  socket.disconnect();
  process.exit(0);
}, 15000);

console.log('🧪 Teste WebSocket iniciado - aguarde 15s...');