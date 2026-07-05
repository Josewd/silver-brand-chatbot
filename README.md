# Silver Brand Chatbot - Formulário com Ajuda Inteligente

Sistema de briefing de marca com IA integrada por campo, mantendo o chat existente e adicionando novo formulário interativo.

## 🏗️ Arquitetura

**Princípio central**: A IA só é chamada quando o usuário pede ajuda explicitamente, campo por campo. Isso elimina custo desnecessário e evita chamadas genéricas.

### Fluxo Principal
1. **Admin** cria sessão via `/admin/new` → gera link único `/form/:clientToken`
2. **Cliente** acessa o link → vê formulário com campos pré-preenchidos (se houver)
3. **Cliente** preenche campos simples diretamente no formulário
4. **Cliente** clica "✨ Ajuda Inteligente" nos campos complexos → abre chat focado apenas naquele campo
5. **IA** conversa sobre o campo específico → propõe rascunho → cliente aplica ou continua ajustando

### Tecnologias
- **Frontend**: React (mantendo estilos atuais)
- **Backend**: Node.js + Express + PostgreSQL
- **IA**: Groq API (gratuita) com fallback OpenAI
- **Deploy**: Render free tier + Supabase/Neon (Postgres)

## 🚀 Configuração

### 1. Backend

```bash
cd backend
npm install
```

**Variáveis de ambiente** (`.env`):
```env
# IA
GROQ_API_KEY=sua_chave_groq
OPENAI_API_KEY=sua_chave_openai  # opcional, fallback
AI_PROVIDER=groq

# Banco PostgreSQL (Supabase/Neon)
SUPABASE_URL=postgresql://user:pass@host:5432/db

# Admin
ADMIN_API_KEY=silver-admin-2026-key

# CORS
FRONTEND_URL=http://localhost:5173
```

**Configurar banco**:
```sql
-- Execute o arquivo database/schema.sql no seu PostgreSQL
psql -h host -U user -d database -f database/schema.sql
```

**Rodar servidor**:
```bash
npm run dev  # ou npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📋 Endpoints API

### Admin
- `POST /api/admin/sessions` - Criar nova sessão
- `GET /api/admin/sessions` - Listar todas as sessões
- `GET /api/admin/sessions/:id` - Obter sessão específica

### Clientes
- `GET /api/sessions/:id` - Carregar formulário e estado (requer clientToken)
- `PATCH /api/sessions/:id/fields/:fieldId` - Salvar campo (requer clientToken)
- `GET /api/sessions/:id/fields/:fieldId/help` - Carregar histórico de ajuda
- `POST /api/sessions/:id/fields/:fieldId/help` - Enviar mensagem para IA

### Autenticação
- Rotas `/admin/*`: Header `Authorization: Bearer ADMIN_API_KEY`
- Rotas `/sessions/*`: Header `x-client-token: TOKEN_DA_SESSAO`

## 🎯 Como Usar

### 1. Criar Sessão (Admin)
Acesse `/admin/new` ou use a API:

```bash
curl -X POST http://localhost:3001/api/admin/sessions \
  -H "Authorization: Bearer silver-admin-2026-key" \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "João Admin",
    "prefill": {
      "nome": "Cliente Teste",
      "empresa_slogan": "Empresa XYZ - Inovação em Café"
    }
  }'
```

Resposta:
```json
{
  "sessionId": "uuid-da-sessao",
  "clientToken": "token-unico",
  "clientLink": "http://localhost:5173/form/token-unico"
}
```

### 2. Cliente Preenche Formulário
1. Acessa o link recebido: `/form/:clientToken`
2. Vê formulário com 9 seções e campos pré-preenchidos
3. Preenche campos simples normalmente
4. Usa "✨ Ajuda Inteligente" nos campos complexos

### 3. Campos com Ajuda IA
Campos com `"ai_help": true` no schema:
- `sobre_empresa` - Sobre a empresa 
- `missao_visao_valores` - Missão, visão e valores
- `objetivos_hoje` - Principais objetivos hoje
- `diferencial` - Principal diferencial do negócio
- `como_ser_percebida` - Como quer ser percebida
- `diferencial_concorrencia` - O que diferencia da concorrência  
- `por_que_escolher` - Por que alguém deveria escolher você
- `tres_palavras` - 3 palavras que definem a marca

## 🔧 Estrutura de Arquivos

```
backend/
├── src/
│   ├── ai/
│   │   ├── aiClient.js      # Cliente AI principal
│   │   ├── groq.js          # Implementação Groq
│   │   └── openai.js        # Implementação OpenAI
│   ├── db/
│   │   └── postgres-client.js # Cliente PostgreSQL
│   ├── routes/
│   │   ├── admin.js         # Rotas admin
│   │   ├── sessions.js      # Rotas de sessões
│   │   └── fieldHelp.js     # Rotas de ajuda por campo
│   ├── schema/
│   │   └── form-schema.json # Schema do formulário
│   └── server.js            # Servidor principal
├── database/
│   └── schema.sql           # Esquema do banco
└── package.json

frontend/
├── src/
│   ├── components/
│   │   ├── FormPanel.jsx        # Formulário principal
│   │   ├── FieldHelpButton.jsx  # Botão ajuda IA
│   │   ├── FieldHelpPanel.jsx   # Chat por campo
│   │   └── inputs/              # Componentes de input
│   │       ├── TextInput.jsx
│   │       ├── SelectInput.jsx
│   │       ├── MultiSelectInput.jsx
│   │       ├── ScaleInput.jsx
│   │       └── TextareaInput.jsx
│   ├── pages/
│   │   ├── FormPage.jsx         # Página principal do formulário
│   │   ├── AdminPage.jsx        # Admin para criar sessões
│   │   └── ChatPage.jsx         # Chat antigo (mantido)
│   └── App.jsx                  # Roteamento
└── package.json
```

## 🎨 Schema do Formulário

O arquivo `form-schema.json` define:
- 9 seções: contato, info_basicas, entrega, perfil, posicionamento, personalidade, concorrentes, visual, final
- Tipos de campo: text, email, select, multiselect, textarea, scale
- Flag `ai_help: true/false` por campo
- Validações e opções

Exemplo:
```json
{
  "id": "missao_visao_valores",
  "label": "Missão, visão e valores", 
  "type": "textarea",
  "ai_help": true
}
```

## 🤖 Como a IA Funciona

### System Prompt
A IA recebe contexto específico:
- Campo atual sendo trabalhado
- Dados já preenchidos no formulário
- Histórico da conversa daquele campo específico
- Instruções para focar apenas no campo

### Tool Calling
Quando tem informação suficiente, a IA chama:
```javascript
propose_field_value({ value: "texto final proposto" })
```

### Fluxo da Conversa
1. Cliente clica "Ajuda Inteligente"
2. Abre com pergunta inicial sobre o campo
3. IA faz perguntas específicas e direcionadas
4. Quando satisfeita, propõe rascunho
5. Cliente pode aplicar ou continuar ajustando

## 🔄 Compatibilidade

Sistema mantém **100% compatibilidade** com chat existente:
- Rotas `/chat/:sessionId` continuam funcionando
- WebSocket e SQLite preservados
- Só adiciona novas funcionalidades

## 🌐 Deploy

### Render (Backend)
1. Conectar repo GitHub
2. Configurar variáveis de ambiente
3. Deploy automático

### Vercel (Frontend) 
1. Conectar repo GitHub
2. Configurar `REACT_APP_ADMIN_API_KEY`
3. Deploy automático

### PostgreSQL
- **Supabase**: Gratuito, fácil setup
- **Neon**: Alternativa gratuita
- Executar `database/schema.sql`

## 🐛 Troubleshooting

### Erro de CORS
Verifique `FRONTEND_URL` no backend e configuração CORS

### Erro de autenticação
- Admin: Verificar `ADMIN_API_KEY`  
- Cliente: Verificar se `clientToken` é válido

### Erro de IA
- Groq: Verificar `GROQ_API_KEY`
- OpenAI: Fallback automático se configurado

### Erro de banco
- Verificar `SUPABASE_URL`
- Executar migrations: `database/schema.sql`

## 📈 Métricas

Sistema calcula progresso automaticamente:
- Por seção: `(campos_preenchidos / total_campos) * 100`
- Geral: média das seções
- Salva a cada alteração de campo

## 🔐 Segurança

- **Admin**: API Key simples (pode evoluir para JWT)
- **Cliente**: Token único por sessão
- **Banco**: Row Level Security habilitado
- **CORS**: Configurado por ambiente