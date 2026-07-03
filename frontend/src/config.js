// Arquivo de configuração para garantir que a URL correta seja usada
// Se a variável de ambiente não funcionar, este arquivo força o valor correto

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://silver-brand-chatbot.onrender.com';

export { BACKEND_URL };