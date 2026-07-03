#!/bin/bash

echo "🧪 TESTE RÁPIDO - Silver Brand Chatbot"
echo "====================================="

# Verificar estrutura
echo ""
echo "📁 Verificando estrutura de arquivos..."

# Backend
echo "🔧 Backend:"
[ -f "backend/package.json" ] && echo "  ✅ package.json" || echo "  ❌ package.json"
[ -f "backend/src/server.js" ] && echo "  ✅ server.js" || echo "  ❌ server.js"
[ -f "backend/src/schema/form-schema.json" ] && echo "  ✅ form-schema.json" || echo "  ❌ form-schema.json"
[ -f "backend/src/ai/extractFields.js" ] && echo "  ✅ extractFields.js" || echo "  ❌ extractFields.js"
[ -f "backend/.env" ] && echo "  ✅ .env" || echo "  ❌ .env"

# Frontend  
echo "🎨 Frontend:"
[ -f "frontend/package.json" ] && echo "  ✅ package.json" || echo "  ❌ package.json"
[ -f "frontend/src/hooks/useBriefingSync.js" ] && echo "  ✅ useBriefingSync.js" || echo "  ❌ useBriefingSync.js"
[ -f "frontend/src/hooks/useSocket.js" ] && echo "  ✅ useSocket.js" || echo "  ❌ useSocket.js"
[ -f "frontend/src/components/BriefingPreview.jsx" ] && echo "  ✅ BriefingPreview.jsx" || echo "  ❌ BriefingPreview.jsx"
[ -f "frontend/.env" ] && echo "  ✅ .env" || echo "  ❌ .env"

# Testar sintaxe dos arquivos principais
echo ""
echo "🔍 Testando sintaxe..."

# Backend
echo "🔧 Backend:"
cd backend
if node -c src/server.js 2>/dev/null; then
    echo "  ✅ server.js - sintaxe válida"
else
    echo "  ❌ server.js - erro de sintaxe"
fi

if node -c src/ai/extractFields.js 2>/dev/null; then
    echo "  ✅ extractFields.js - sintaxe válida"
else
    echo "  ❌ extractFields.js - erro de sintaxe"
fi

# Testar schema JSON
if node -e "JSON.parse(require('fs').readFileSync('src/schema/form-schema.json', 'utf8'))" 2>/dev/null; then
    echo "  ✅ form-schema.json - JSON válido"
else
    echo "  ❌ form-schema.json - JSON inválido"
fi

cd ..

# Frontend
echo "🎨 Frontend:"
cd frontend
if [ -f "node_modules/react/package.json" ]; then
    echo "  ✅ Dependencies instaladas"
else
    echo "  ❌ Dependencies não instaladas"
fi

cd ..

# Verificar configuração
echo ""
echo "⚙️  Verificando configuração..."

# Backend env
if grep -q "SUPABASE_URL=https://your-project" backend/.env 2>/dev/null; then
    echo "  ⚠️  Backend: SUPABASE_URL precisa ser configurada"
else
    echo "  ✅ Backend: SUPABASE_URL configurada"
fi

if grep -q "GROQ_API_KEY=gsk_" backend/.env 2>/dev/null; then
    echo "  ⚠️  Backend: GROQ_API_KEY precisa ser configurada"
else
    echo "  ✅ Backend: GROQ_API_KEY configurada"
fi

# Frontend env
if grep -q "VITE_BACKEND_URL=http://localhost:3001" frontend/.env 2>/dev/null; then
    echo "  ✅ Frontend: URLs configuradas"
else
    echo "  ⚠️  Frontend: URLs precisam ser configuradas"
fi

echo ""
echo "📊 Estatísticas do Schema:"
node -e "
const schema = require('./backend/src/schema/form-schema.json');
console.log('  📋 Seções:', schema.sections.length);
console.log('  📝 Total de campos:', schema.sections.reduce((sum, s) => sum + s.fields.length, 0));
const required = [];
schema.sections.forEach(s => s.fields.forEach(f => f.required && required.push(f.id)));
console.log('  🔒 Campos obrigatórios:', required.length, '(' + required.join(', ') + ')');
"

echo ""
echo "🎯 Próximos passos para teste completo:"
echo ""
echo "1. 📁 Configure Supabase:"
echo "   - Crie projeto em https://supabase.com"
echo "   - Execute SQL: backend/setup-supabase.sql"
echo "   - Atualize backend/.env com URLs reais"
echo ""
echo "2. 🔑 Configure Groq API:"
echo "   - Obtenha chave em https://console.groq.com/keys"
echo "   - Atualize GROQ_API_KEY em backend/.env"
echo ""
echo "3. 🚀 Iniciar serviços (2 terminais):"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "4. 🌐 Testar:"
echo "   - Abra http://localhost:3000"
echo "   - Vá para /chat para nova sessão"
echo "   - Teste conversa + preenchimento automático"