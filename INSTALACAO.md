# 🎨 GUIA DE INSTALAÇÃO — Silver Brand Chatbot

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- Conta no Google AI Studio (Gemini) ou Groq

## Setup Passo a Passo

### 1. Backend (Python/FastAPI)

```bash
# Clonar repositório
cd silver-brand-chatbot

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas chaves de API
```

#### Configurar .env

```env
# Escolha UM provedor de IA:

# Opção 1: Google Gemini (Recomendado - Gratuito)
GEMINI_API_KEY=sua-chave-aqui
AI_PROVIDER=gemini

# Opção 2: Groq (Alternativa)
GROQ_API_KEY=sua-chave-aqui
AI_PROVIDER=groq

# Outras configs
DATABASE_URL=sqlite:///./database/sessions.db
ADMIN_EMAIL=brandhousesilver@gmail.com
FRONTEND_URL=http://localhost:5173
```

#### Obter chave do Gemini

1. Acesse [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Faça login com conta Google
3. Clique em "Create API Key"
4. Copie a chave e cole no `.env`

#### Iniciar backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend estará rodando em `http://localhost:8000`

Teste: `http://localhost:8000/health`

---

### 2. Frontend (React/Vite)

```bash
cd frontend

# Instalar dependências
npm install

# Criar arquivo de configuração
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Iniciar servidor de desenvolvimento
npm run dev
```

Frontend estará rodando em `http://localhost:5173`

---

## Uso do Sistema

### Para o Designer (Admin)

1. Acesse `http://localhost:5173/admin`
2. Clique em "➕ Nova Sessão"
3. Preencha:
   - **Nome do Cliente**: Ex: "Pradella Coffee"
   - **Email** (opcional): contato@cliente.com
   - **Telefone** (opcional): +55 11 99999-9999
   - **Contexto Inicial**: "Cliente quer identidade visual para cafeteria artesanal"
4. Clique em "Criar Sessão"
5. Copie o link gerado
6. Envie para o cliente via WhatsApp/Email

### Para o Cliente

1. Cliente recebe link único: `http://localhost:5173/chat/abc123`
2. Acessa o link
3. Conversa com o chatbot que age como designer
4. Bot coleta informações do briefing naturalmente
5. Ao completar, pode baixar PDF preenchido

---

## Estrutura de Pastas

```
silver-brand-chatbot/
├── app/                      # Backend Python
│   ├── main.py              # API FastAPI
│   ├── ai.py                # Sistema de IA (Gemini/Groq)
│   ├── models.py            # Modelos do banco de dados
│   ├── config.py            # Configurações
│   └── pdf_generator.py     # Gerador de PDFs
├── frontend/                 # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx    # Interface do chat
│   │   │   └── AdminPage.jsx   # Painel do designer
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── database/                 # SQLite (criado automaticamente)
├── generated_pdfs/          # PDFs gerados (criado automaticamente)
├── requirements.txt         # Dependências Python
└── README.md
```

---

## Testando Localmente

### Teste 1: Criar Sessão

```bash
curl -X POST http://localhost:8000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Teste Cliente",
    "initial_context": "Cliente teste"
  }'
```

### Teste 2: Enviar Mensagem

```bash
curl -X POST http://localhost:8000/api/chat/{SESSION_ID} \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá!"}'
```

---

## Deploy em Produção

### Backend (Render.com)

1. Crie conta em [render.com](https://render.com)
2. Conecte repositório GitHub
3. Configure variáveis de ambiente:
   - `GEMINI_API_KEY`
   - `AI_PROVIDER=gemini`
   - `FRONTEND_URL=https://seu-frontend.vercel.app`
4. Deploy automático!

### Frontend (Vercel)

```bash
cd frontend

# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configurar variável de ambiente:
- `VITE_API_URL=https://sua-api.render.com`

---

## Troubleshooting

### Erro: "Nenhum provedor de IA configurado"

✅ Solução: Configure `GEMINI_API_KEY` ou `GROQ_API_KEY` no `.env`

### Erro: "Sessão não encontrada"

✅ Solução: Verifique se o backend está rodando e o banco foi criado

### Frontend não conecta ao backend

✅ Solução: Verifique se `VITE_API_URL` está configurado corretamente

### PDFs não são gerados

✅ Solução: Verifique se o diretório `generated_pdfs/` existe e tem permissões de escrita

---

## Suporte

**Silver Brand House**  
Email: brandhousesilver@gmail.com  
WhatsApp: +55 11 96015 7100
