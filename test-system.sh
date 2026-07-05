#!/bin/bash

echo "🚀 Testando sistema completo Silver Brand Chatbot"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status)${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU ($status)${NC}"
        return 1
    fi
}

# Testa os serviços
echo -e "${BLUE}=== Testando Backend (porta 3001) ===${NC}"
test_endpoint "http://localhost:3001/api/health" "Health Check"

echo ""
echo -e "${BLUE}=== Testando criação de sessão ===${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/admin/sessions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer silver-admin-2026-key" \
    -d '{"created_by": "teste_automatico"}')

if echo "$RESPONSE" | grep -q "sessionId"; then
    echo -e "${GREEN}✅ Sessão criada com sucesso${NC}"
    
    # Extrai o token
    CLIENT_TOKEN=$(echo "$RESPONSE" | grep -o '"clientToken":"[^"]*"' | cut -d'"' -f4)
    echo "Token gerado: $CLIENT_TOKEN"
    
    # Testa carregar a sessão
    echo ""
    echo -e "${BLUE}=== Testando carregamento de sessão ===${NC}"
    
    SESSION_DATA=$(curl -s "http://localhost:3001/api/sessions/$CLIENT_TOKEN" \
        -H "x-client-token: $CLIENT_TOKEN")
    
    if echo "$SESSION_DATA" | grep -q "schema"; then
        echo -e "${GREEN}✅ Dados da sessão carregados com sucesso${NC}"
    else
        echo -e "${RED}❌ Falha ao carregar dados da sessão${NC}"
    fi
    
else
    echo -e "${RED}❌ Falha ao criar sessão${NC}"
fi

echo ""
echo -e "${BLUE}=== Testando Frontend (porta 5180) ===${NC}"
test_endpoint "http://localhost:5180/" "Página principal do frontend"

echo ""
echo -e "${BLUE}=== Testando PostgreSQL ===${NC}"
if docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${GREEN}✅ PostgreSQL rodando no Docker${NC}"
else
    echo -e "${RED}❌ PostgreSQL não está rodando${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Teste completo finalizado!${NC}"
echo ""
echo -e "${BLUE}=== Como usar o sistema ===${NC}"
echo "1. 📝 Admin: http://localhost:5180/admin"
echo "2. 📋 Formulário: http://localhost:5180/form/[token]"
echo "3. 💬 Chat Antigo: http://localhost:5180/chat/[sessionId]"
echo "4. 🔧 Backend API: http://localhost:3001/api/health"
echo ""
echo "Admin API Key: silver-admin-2026-key"