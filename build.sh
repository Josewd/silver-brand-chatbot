#!/bin/bash

# Script de build para deployment
echo "🔨 Building Silver Brand Chatbot..."

# Instalar dependências Python
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Criar diretórios necessários
mkdir -p database
mkdir -p generated_pdfs

echo "✅ Build complete!"
