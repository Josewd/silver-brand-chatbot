# Silver Brand House - Chatbot de Briefing Interativo

Sistema completo de briefing interativo para coleta de informações de identidade visual, com chat inteligente, painel administrativo e geração automática de PDF.

## 🎯 Funcionalidades

- **Chat Inteligente**: IA conversacional (Groq ou Gemini) que conduz o briefing de forma natural
- **Barra de Progresso Visual**: Checkpoints interativos com tooltips mostrando cada etapa
- **Painel Administrativo**: Gerenciamento de sessões, visualização de briefings e downloads
- **Geração de PDF**: Briefing completo formatado profissionalmente
- **Interface Moderna**: React + Vite com design responsivo

## 🚀 Stack Tecnológica

### Backend
- **FastAPI**: Framework web moderno e rápido
- **SQLite**: Banco de dados leve para persistência
- **Groq/Gemini**: APIs de IA para conversação natural
- **ReportLab**: Geração de PDFs profissionais

### Frontend
- **React 18**: Biblioteca UI moderna
- **Vite**: Build tool ultra-rápido
- **React Router**: Navegação entre páginas

## 📋 Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave de API do Groq ou Gemini

## 🔧 Instalação Local

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

### 3. Configure o Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Execute o servidor

```bash
uvicorn app.main:app --reload --port 8000
```

Acesse: `http://localhost:8000`

## 🌐 Deploy no Render

### Automático via GitHub

1. Faça push do código para o GitHub
2. Conecte o repositório no Render
3. Configure as variáveis de ambiente:
   - `GROQ_API_KEY` ou `GEMINI_API_KEY`
   - `AI_PROVIDER` (groq ou gemini)
   - `ADMIN_EMAIL`
   - `ADMIN_PHONE`
   - `COMPANY_NAME`
4. O Render usará automaticamente o `render.yaml`

### Variáveis de Ambiente

```env
# IA Provider (groq ou gemini)
AI_PROVIDER=groq
GROQ_API_KEY=sua_chave_groq
GEMINI_API_KEY=sua_chave_gemini

# Configurações da Empresa
COMPANY_NAME=Silver Brand House
ADMIN_EMAIL=brandhousesilver@gmail.com
ADMIN_PHONE=+5511960157100

# Frontend (será configurado após deploy)
FRONTEND_URL=https://seu-app.onrender.com
```

## 📖 Como Obter Chaves de API

### Groq (Recomendado - Rápido e Gratuito)
1. Acesse [console.groq.com](https://console.groq.com)
2. Crie uma conta
3. Vá em "API Keys"
4. Gere uma nova chave

### Gemini (Alternativa Google)
1. Acesse [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Faça login com Google
3. Crie uma chave de API

## 📁 Estrutura do Projeto

```
silver-brand-chatbot/
├── app/
│   ├── __init__.py
│   ├── main.py           # API FastAPI
│   ├── ai.py             # Lógica de IA
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
├── render.yaml          # Configuração Render
├── build.sh            # Script de build
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

Feito com ❤️ pela Silver Brand House
