#!/bin/bash

# Script de inicialização para desenvolvimento local
echo "🚀 Starting Silver Brand Chatbot..."

# Verificar se venv existe
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Ativar venv
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Instalar dependências se necessário
if [ ! -f "venv/.installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Criar diretórios necessários
mkdir -p database generated_pdfs

# Iniciar servidor
echo "✅ Starting server on http://localhost:8000"
echo "📊 Admin panel: http://localhost:8000/admin"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
