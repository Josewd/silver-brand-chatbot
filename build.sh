#!/bin/bash

# Script de build para deployment
echo "🔨 Building Silver Brand Chatbot..."

# Upgrade pip primeiro
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Instalar wheel para garantir binários pré-compilados
echo "🛞 Installing wheel..."
pip install wheel

# Instalar dependências Python com wheels pré-compilados
echo "📦 Installing Python dependencies..."
pip install --only-binary :all: -r requirements.txt || pip install -r requirements.txt

# Criar diretórios necessários
mkdir -p database
mkdir -p generated_pdfs

echo "✅ Build complete!"
