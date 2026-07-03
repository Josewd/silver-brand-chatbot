# Silver Brand Chatbot - Sistema Atualizado (WebSocket + REST Hybrid)

## 📋 Visão Geral

O sistema foi migrado para uma arquitetura híbrida que combina:
- **WebSocket** para comunicação em tempo real do chat
- **REST API** como fallback quando o WebSocket falha
- **Formulário dinâmico** que se atualiza automaticamente conforme a conversa
- **Persistência robusta** no Postgres com recuperação de sessão

## 🏗️ Arquitetura

```
Frontend (React + Socket.io-client)
    ↕ WebSocket (primary) / HTTP (fallback)
Backend (Node.js + Express + Socket.io)
    ↕ HTTP
Groq API (tool calling)
    ↕ 
Postgres (Supabase/Neon) - persistência
```

## 🚀 Setup Rápido

### 1. Backend (Node.js)

```bash
cd backend
npm install
```

Configurar `.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:3000
PORT=3001
```

Configurar banco (executar SQL no Supabase):
```sql
-- Ver arquivo backend/SETUP_DATABASE.md
```

Iniciar:
```bash
npm run dev
```

### 2. Frontend (React)

```bash
cd frontend
npm install
```

Configurar `.env`:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_API_URL=http://localhost:8000  # REST fallback (opcional)
```

Iniciar:
```bash
npm run dev
```

## 📡 Como Funciona

### Fluxo Principal (WebSocket)
1. Cliente conecta via Socket.io
2. Emite `join_session` com sessionId
3. Servidor responde com `session_ready` + dados existentes
4. Cliente envia `user_message`
5. Servidor chama Groq API com tool calling
6. Servidor emite `assistant_message` + `form_update`
7. Formulário se atualiza automaticamente

### Fluxo Fallback (REST)
- Se WebSocket falha, usa API REST existente
- Mantém funcionalidade completa do sistema atual
- Interface indica o modo ativo (WebSocket/REST)

### Persistência e Reconexão
- Cada campo extraído é salvo imediatamente no Postgres
- SessionId persistente no localStorage
- Reconexão automática recupera estado completo
- Resiliente a restarts do servidor (Render free tier)

## 🔧 Principais Mudanças

### Backend
- **Novo servidor Node.js** (`backend/src/server.js`)
- **Schema unificado** (`backend/src/schema/form-schema.json`)
- **Integração Groq** com tool calling (`backend/src/ai/extractFields.js`)
- **Queries Postgres** otimizadas (`backend/src/db/queries.js`)

### Frontend
- **Hook híbrido** (`useBriefingSync.js`) - WebSocket + REST
- **Componentes reutilizados** - ChatPage e BriefingPreview existentes
- **Indicador de conexão** no cabeçalho
- **Reconexão transparente**

## 📝 Schema do Formulário

O arquivo `backend/src/schema/form-schema.json` define:
- **9 seções** (contato → info_basicas → entrega → perfil → posicionamento → personalidade → concorrentes → visual → final)
- **35 campos totais** com diferentes tipos (text, textarea, select, multiselect, scale)
- **2 campos obrigatórios**: nome e email
- **Validação e progresso automático** baseados no preenchimento

Principais seções:
```json
{
  "sections": [
    {
      "id": "contato", 
      "label": "Detalhes de Contato",
      "fields": [
        { "id": "nome", "label": "Seu nome", "type": "text", "required": true },
        { "id": "email", "label": "Seu e-mail", "type": "text", "required": true },
        { "id": "empresa_slogan", "label": "Nome da empresa e slogan", "type": "text" }
      ]
    },
    {
      "id": "visual",
      "label": "Preferências Visuais", 
      "fields": [
        { "id": "cores_quer", "label": "Cores que gosta e quer explorar", "type": "text" },
        { "id": "tipos_logo", "label": "Tipos de logo que prefere", "type": "multiselect", 
          "options": ["Com símbolo", "Só a tipografia", "Minimalista", "Clássico", "Moderno"] }
      ]
    }
  ]
}
```

## 🔄 Modos de Operação

### 1. Modo WebSocket (Primário)
- ✅ Tempo real
- ✅ Formulário sincronizado
- ✅ Reconexão automática
- Indicador: 🟢 WebSocket

### 2. Modo REST Fallback
- ✅ Funcionalidade completa
- ✅ Modo manual no formulário  
- ⚠️ Sem tempo real
- Indicador: 🔴 REST Fallback

### 3. Modo Manual
- ✅ Edição direta dos campos
- ✅ Salvamento em lote
- ✅ Finalização sem chat
- Toggle no painel direito

## 🧪 Testes de Resiliência

### Teste 1: Desconexão de Rede
1. Abrir aplicação
2. Desconectar internet
3. Tentar enviar mensagem
4. Verificar ativação do fallback
5. Reconectar e verificar recuperação

### Teste 2: Restart do Servidor
1. Iniciar conversa
2. Preencher alguns campos
3. Parar servidor backend
4. Verificar transição para REST
5. Reiniciar servidor
6. Verificar recuperação do estado

### Teste 3: Cold Start (Render)
1. Aguardar servidor "dormir" (15 min)
2. Tentar acessar aplicação
3. Verificar loading durante cold start
4. Confirmar recuperação completa

## 📱 Rotas Disponíveis

### Frontend
- `/chat` - Nova sessão WebSocket
- `/chat/:sessionId` - Continuar sessão existente
- `/admin` - Painel administrativo
- `/login` - Login do designer

### Backend WebSocket
- `join_session` - Entrar/criar sessão
- `user_message` - Enviar mensagem do usuário

### Backend REST (Fallback)
- `GET /api/session/:id` - Dados da sessão
- `POST /api/chat/:id` - Enviar mensagem
- `PUT /api/briefing/:id/update` - Atualizar campos
- `POST /api/briefing/:id/finalize` - Finalizar briefing

## 🔐 Variáveis de Ambiente

### Backend
```env
SUPABASE_URL=                 # URL do projeto Supabase
SUPABASE_SERVICE_KEY=         # Chave de serviço (não anon)  
GROQ_API_KEY=                # API key do Groq
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Frontend  
```env
VITE_BACKEND_URL=http://localhost:3001   # WebSocket server
VITE_API_URL=http://localhost:8000       # REST fallback (opcional)
```

## 🚀 Deploy (Render + Supabase)

### 1. Configurar Supabase
- Criar projeto no Supabase
- Executar SQL do arquivo `SETUP_DATABASE.md`
- Copiar URL e Service Key

### 2. Deploy Backend no Render
- Conectar repositório GitHub
- Definir build command: `cd backend && npm install`
- Definir start command: `cd backend && npm start`
- Configurar env vars do backend

### 3. Deploy Frontend (Vercel/Netlify)
- Build command: `cd frontend && npm run build`
- Configurar env vars do frontend
- Apontar VITE_BACKEND_URL para URL do Render

## 🔍 Monitoramento

### Logs Importantes
```bash
# Backend
✅ Database inicializado com sucesso
🔌 Cliente conectado: socket-id
📡 Cliente entrou na sessão: session-id
📤 Enviando mensagem via WebSocket
🤖 Chamando Groq API...

# Frontend
✅ Sessão WebSocket pronta
📝 Atualização do formulário via WebSocket
⚠️ Sistema temporariamente indisponível (fallback ativo)
```

### Health Checks
- `GET /health` - Status do backend
- Indicador de conexão no frontend
- Progresso do formulário em tempo real

## 🐛 Troubleshooting

### WebSocket não conecta
- Verificar CORS no backend
- Confirmar URL no frontend (.env)
- Checar logs do browser (Network tab)

### Groq API falha
- Verificar API key válida
- Confirmar modelo disponível
- Checar rate limits

### Postgres erros
- Verificar service key (não anon)
- Confirmar tabelas criadas
- Checar permissões RLS

### Estado perdido
- Verificar localStorage (sessionId)
- Confirmar persistência no banco
- Testar recuperação manual

## 📈 Próximos Passos

1. **Testes automatizados** para resiliência
2. **Métricas de performance** (latência, reconexões)
3. **Cache inteligente** para cold starts
4. **Notificações push** para updates
5. **Modo offline** com sync posterior

---

🎉 **Sistema híbrido implementado com sucesso!** 

Mantém compatibilidade total com o sistema existente enquanto adiciona capacidades WebSocket em tempo real com fallback robusto.