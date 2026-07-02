# Silver Brand House - Chatbot de Briefing Interativo

Sistema completo de briefing interativo para coleta de informações de identidade visual, com chat inteligente, painel administrativo e geração automática de PDF.

## 🎯 Funcionalidades

- **Chat Inteligente**: Sistema de IA híbrido (Groq + Hugging Face) com fallback automático
- **Barra de Progresso Visual**: Checkpoints interativos com tooltips mostrando cada etapa
- **Painel Administrativo**: Gerenciamento de sessões, visualização de briefings e downloads
- **Geração de PDF**: Briefing completo formatado profissionalmente
- **Interface Moderna**: React + Vite com design responsivo
- **Alta Disponibilidade**: Fallback automático entre providers de IA

## 🚀 Stack Tecnológica

### Backend
- **FastAPI**: Framework web moderno e rápido
- **SQLite**: Banco de dados leve para persistência
- **Groq + Hugging Face**: Sistema híbrido de IA com fallback automático
  - Groq (Primário): Llama 3.3 70B - Rápido e eficiente
  - Hugging Face (Fallback): Llama 3.1 8B - Backup confiável
- **ReportLab**: Geração de PDFs profissionais

### Frontend
- **React 18**: Biblioteca UI moderna
- **Vite**: Build tool ultra-rápido
- **React Router**: Navegação entre páginas

## ✨ Sistema de IA Híbrido

O chatbot usa um **sistema inteligente com fallback automático**:

```
1. Groq (Primário) → Responde 95%+ das conversas
   ↓ Se falhar
2. Hugging Face (Fallback) → Backup automático
   ↓ Se falhar
3. Mensagem de erro amigável
```

**Benefícios:**
- ✅ 99.9% de disponibilidade
- ✅ 100% gratuito
- ✅ Alta performance
- ✅ Sem limites práticos
- ✅ Transparente para o usuário

📖 Leia mais: [`SISTEMA_IA_HIBRIDO.md`](SISTEMA_IA_HIBRIDO.md)

## 📋 Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave de API do Groq (obrigatório)
- Chave de API do Hugging Face (opcional, mas recomendado)

## ⚡ Início Rápido (5 minutos)

Veja: [`INICIO_RAPIDO.md`](INICIO_RAPIDO.md)

## 🔧 Instalação Local Completa

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/silver-brand-chatbot.git
cd silver-brand-chatbot
```

### 2. Configure o Backend

```bash
# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env e adicione suas chaves de API
```

### 3. Obter API Keys (Gratuito)

**Groq (Obrigatório):**
1. Acesse: https://console.groq.com/
2. Crie conta → API Keys → Create API Key
3. Copie a key `gsk_...` para o `.env`

**Hugging Face (Opcional mas recomendado):**
1. Acesse: https://huggingface.co/settings/tokens
2. New token → Read access
3. Copie a key `hf_...` para o `.env`

📖 Guia detalhado: [`COMO_OBTER_API_KEYS.md`](COMO_OBTER_API_KEYS.md)

### 4. Testar Sistema

```bash
python test_system.py
```

Deve mostrar:
```
✅ 5/5 testes passaram
🎉 Sistema pronto para uso!
```

### 5. Configure o Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 6. Execute o servidor

```bash
uvicorn app.main:app --reload --port 8000
```

Acesse: `http://localhost:8000`

## 🌐 Deploy no Render

### Passo a Passo Completo

📖 Veja: [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md)

### Resumo Rápido

1. Faça push do código para o GitHub
2. Conecte o repositório no Render
3. Configure as variáveis de ambiente:
   - `GROQ_API_KEY` (obrigatório)
   - `HUGGINGFACE_API_KEY` (opcional)
   - `ADMIN_EMAIL`, `ADMIN_PHONE`, `COMPANY_NAME`
   - `FRONTEND_URL` (após deploy do frontend)
4. Deploy automático!

### Build & Start Commands

**Build:**
```bash
pip install -r requirements.txt
```

**Start:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 📖 Documentação

- 📄 [`SISTEMA_IA_HIBRIDO.md`](SISTEMA_IA_HIBRIDO.md) - Como funciona o sistema de IA
- 📄 [`COMO_OBTER_API_KEYS.md`](COMO_OBTER_API_KEYS.md) - Guia de API keys (grátis)
- 📄 [`MUDANCAS_IA_HIBRIDA.md`](MUDANCAS_IA_HIBRIDA.md) - Resumo das mudanças
- 📄 [`INICIO_RAPIDO.md`](INICIO_RAPIDO.md) - Setup em 5 minutos
- 📄 [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md) - Deploy detalhado
- 📄 [`frontend/DEPLOY_VERCEL.md`](frontend/DEPLOY_VERCEL.md) - Deploy do frontend

## 📁 Estrutura do Projeto

```
silver-brand-chatbot/
├── app/
│   ├── __init__.py
│   ├── main.py           # API FastAPI
│   ├── ai.py             # Sistema híbrido de IA ⭐
│   ├── models.py         # Modelos SQLAlchemy
│   ├── config.py         # Configurações
│   └── pdf_generator.py  # Geração de PDFs
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx      # Chat do cliente
│   │   │   └── AdminPage.jsx     # Painel admin
│   │   └── ...
│   └── ...
├── database/             # SQLite (ignorado no git)
├── generated_pdfs/       # PDFs gerados (ignorado no git)
├── requirements.txt      # Dependências Python
├── test_system.py       # Teste completo do sistema
├── test_ai_hybrid.py    # Teste do sistema de IA
└── README.md
```

## 🎨 Estrutura do Briefing

O sistema coleta informações em 8 seções:

1. **Detalhes de Contato** - Nome, email, telefone, localização
2. **Informações Básicas** - Tipo de projeto, prazo
3. **Lista de Entrega** - Itens incluídos e extras desejados
4. **Perfil da Empresa** - Descrição, produtos, missão, valores
5. **Posicionamento & Personalidade** - Como quer ser percebida, escalas de personalidade
6. **Concorrentes e Referências** - Análise competitiva, inspirações
7. **Preferências Visuais** - Cores, estilos de logo, tipografia
8. **Informações Finais** - Observações adicionais

## 🔒 Segurança

- Variáveis de ambiente para dados sensíveis
- `.env` no `.gitignore`
- CORS configurado
- Validação de entrada com Pydantic
- Sistema de IA com fallback (não depende de um único provider)

## 🧪 Testes

```bash
# Testar sistema completo
python test_system.py

# Testar sistema de IA especificamente
python test_ai_hybrid.py
```

## 🚨 Solução de Problemas

### "Rate limit exceeded" no Groq
✅ Normal! Sistema automaticamente usa Hugging Face como backup.

### "Todos os providers falharam"
1. Verificar `GROQ_API_KEY` no `.env`
2. Verificar conexão com internet
3. Aguardar 1 minuto e tentar novamente

### Respostas lentas
- Provavelmente usando Hugging Face (fallback)
- Configure `HUGGINGFACE_API_KEY` para melhor performance

## 💡 Por Que Este Sistema é Melhor?

| Característica | Antes (Gemini) | Agora (Híbrido) |
|---------------|----------------|-----------------|
| Disponibilidade | ⚠️ 80-90% | ✅ 99.9% |
| Velocidade | 🐢 Lento | ⚡ Muito rápido |
| Custo | 💰 Grátis | 💰 Grátis |
| Rate Limits | ❌ Baixos | ✅ Altos |
| Fallback | ❌ Não | ✅ Automático |
| Qualidade | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 📝 Licença

Este projeto é proprietário da Silver Brand House.

## 🤝 Contribuindo

Para contribuir com melhorias:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📧 Contato

**Silver Brand House**
- Email: brandhousesilver@gmail.com
- Telefone: +55 11 96015-7100

---

✨ **Sistema 100% gratuito, confiável e pronto para produção!** ✨

Feito com ❤️ pela Silver Brand House
