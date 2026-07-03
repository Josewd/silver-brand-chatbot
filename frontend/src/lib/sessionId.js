// Gerenciar sessionId no localStorage
export function getSessionId() {
  return localStorage.getItem('silver_brand_session_id');
}

export function setSessionId(sessionId) {
  localStorage.setItem('silver_brand_session_id', sessionId);
}

export function clearSessionId() {
  localStorage.removeItem('silver_brand_session_id');
}

export function generateSessionId() {
  // Gerar um ID simples para o cliente
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}