#!/bin/bash

echo "🚀 SILVER BRAND CHATBOT - Setup Completo"
echo "========================================"

# Verificar Node.js
echo ""
echo "📋 Verificando pré-requisitos..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado."
    exit 1
fi

echo "✅ npm: $(npm -v)"

# Backend
echo ""
echo "🔧 Configurando Backend..."
cd backend || exit 1

if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado no backend"
    exit 1
fi

echo "📦 Instalando dependências do backend..."
npm install

if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado no backend"
    echo "📝 Copie .env.example para .env e configure as variáveis"
    cp .env.example .env
    echo "🔧 Configure estas variáveis em backend/.env:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_KEY" 
    echo "   - GROQ_API_KEY"
else
    echo "✅ Arquivo .env encontrado"
fi

# Testar schema
echo ""
echo "🧪 Testando schema..."
node -e "
const schema = require('./src/schema/form-schema.json');
console.log('✅ Schema válido:', schema.sections.length, 'seções');
console.log('📊 Total de campos:', schema.sections.reduce((sum, s) => sum + s.fields.length, 0));
"

cd ..

# Frontend
echo ""
echo "🎨 Configurando Frontend..."
cd frontend || exit 1

if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado no frontend"
    exit 1
fi

echo "📦 Instalando dependências do frontend..."
npm install

if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado no frontend"
    echo "📝 Copie .env.example para .env e configure as variáveis"
    cp .env.example .env
    echo "✅ Arquivo .env criado com valores padrão"
else
    echo "✅ Arquivo .env encontrado"
fi

cd ..

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure Supabase:"
echo "   - Crie projeto em https://supabase.com"
echo "   - Execute SQL em: backend/setup-supabase.sql"
echo "   - Atualize SUPABASE_URL e SUPABASE_SERVICE_KEY em backend/.env"
echo ""
echo "2. Configure Groq API:"
echo "   - Obtenha chave em: https://console.groq.com/keys"
echo "   - Atualize GROQ_API_KEY em backend/.env"
echo ""
echo "3. Iniciar serviços:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "4. Acesse: http://localhost:3000"