# 🎨 Silver Brand Design — Chatbot Inteligente para Briefing

Chatbot com IA para capturar informações de clientes e preencher automaticamente o formulário de briefing de identidade visual da Silver Brand House.

## O que faz

- Designer virtual recebe clientes via link único com contexto pré-carregado
- Conduz conversa natural para coletar informações do briefing
- Auxilia na criação de descrições, missão/visão/valores, slogans
- Preenche automaticamente o formulário PDF de briefing
- Gera PDF preenchido ao final da conversa

## Stack

- **Python + FastAPI** — Backend async
- **Google Gemini 2.0 Flash** ou **Groq (LLaMA 3.3)** — IA conversacional
- **SQLite** — Banco de dados para sessões
- **React + Vite** — Frontend moderno
- **ReportLab/PyPDF** — Geração de PDFs

## Estrutura do Fluxo

### 1. Designer cria sessão
```
POST /api/session/create
{
  "client_name": "Pradella Coffee",
  "client_email": "contato@pradellacoffee.com",
  "initial_context": "Cliente quer identidade visual para cafeteria artesanal"
}

Retorna: { "session_id": "abc123", "chat_url": "https://chat.silverbrand.com/abc123" }
```

### 2. Cliente acessa o link
- Chat carrega com contexto inicial
- Bot se apresenta como consultor de design da Silver Brand
- Conversa flui naturalmente

### 3. Bot coleta informações
O bot segue o formulário de briefing em 8 seções:
1. **Detalhes de Contato** — Nome, email, telefone, cidade
2. **Informações Básicas** — Projeto novo/redesenho, prazo
3. **Lista de Entrega** — Itens necessários (logo, manual, cartões, etc.)
4. **Perfil da Empresa** — Sobre, produtos/serviços, diferencial
5. **Posicionamento** — Como quer ser percebida, 3 palavras-chave
6. **Personalidade** — Escala sofisticada/descontraída, técnica/emocional, etc.
7. **Concorrentes e Referências** — Marcas admiradas, concorrentes
8. **Preferências Visuais** — Cores, tipos de logo, fontes

### 4. IA auxilia criativamente
- **Descrições**: "Precisa de ajuda para descrever sua empresa? Me conte mais sobre o negócio..."
- **Slogans**: "Vamos criar um slogan? Qual o sentimento que você quer transmitir?"
- **Valores**: "Me fale 3 coisas que são inegociáveis no seu negócio..."

### 5. Geração do PDF
- Ao completar todas as informações, gera PDF preenchido
- Designer recebe notificação
- Cliente pode baixar cópia

## Diretrizes do Bot

O bot age como um **designer consultor** da Silver Brand:

- Tom amigável mas profissional
- Faz perguntas abertas para entender o cliente
- Oferece exemplos e referências
- Não avança sem ter informação clara
- Sempre pede contexto antes de sugerir descrições/slogans
- Valida informações importantes ("Entendi que... está correto?")
- Mostra progresso ("Já coletamos X de 8 seções")

## Setup Rápido

### 1. Instalar
```bash
cd silver-brand-chatbot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configurar
```bash
cp .env.example .env
```

Edite o `.env`:
```
GEMINI_API_KEY=sua-chave-aqui
# ou
GROQ_API_KEY=sua-chave-aqui

DATABASE_URL=sqlite:///./database/sessions.db
ADMIN_EMAIL=brandhousesilver@gmail.com
```

### 3. Rodar backend
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Rodar frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Sessões
- `POST /api/session/create` — Criar nova sessão de cliente
- `GET /api/session/{session_id}` — Obter dados da sessão
- `GET /api/session/{session_id}/status` — Verificar progresso

### Chat
- `POST /api/chat/{session_id}` — Enviar mensagem
- `GET /api/chat/{session_id}/history` — Histórico da conversa

### Briefing
- `GET /api/briefing/{session_id}` — Ver dados coletados
- `POST /api/briefing/{session_id}/generate-pdf` — Gerar PDF
- `GET /api/briefing/{session_id}/download` — Download do PDF

## Deploy

### Render.com
1. Conecte repositório
2. Configure variáveis de ambiente
3. Deploy automático

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

---

**Silver Brand House** — brandhousesilver@gmail.com — +55 11 96015 7100
