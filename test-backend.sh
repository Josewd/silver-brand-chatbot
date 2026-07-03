#!/bin/bash

echo "🔧 Testando conectividade do backend..."

# Testar se o backend está respondendo
echo "1. Testando saúde do backend..."
curl -s https://silver-brand-backend.onrender.com/health || echo "❌ Backend não está respondendo"

echo -e "\n2. Testando endpoint principal..."
curl -s https://silver-brand-backend.onrender.com/ || echo "❌ Endpoint principal falhando"

echo -e "\n3. URLs do sistema:"
echo "Frontend: https://silver-brand-chatbot.vercel.app"
echo "Backend:  https://silver-brand-backend.onrender.com"

echo -e "\n4. Próximo passo:"
echo "Configure VITE_BACKEND_URL=https://silver-brand-backend.onrender.com no Vercel"