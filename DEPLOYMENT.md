# 🚀 Silver Brand Chatbot - Deployment Guide

## Deploy do Sistema Completo

### 📋 Pré-requisitos
- Conta no [Render](https://render.com) (para o backend)
- Conta no [Vercel](https://vercel.com) (para o frontend)  
- Conta no [Supabase](https://supabase.com) (para o banco de dados)
- Chave da OpenAI e/ou Groq

### 🗄️ 1. Setup do Banco de Dados (Supabase)

1. Acesse o [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings → Database
4. Copie a string de conexão PostgreSQL
5. Execute o SQL do arquivo `database/schema.sql` no SQL Editor

### 🖥️ 2. Deploy do Backend (Render)

1. Faça push do código para GitHub/GitLab
2. Acesse [Render](https://render.com) 
3. Clique em "New Web Service"
4. Conecte seu repositório
5. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18.19.0

6. **Variáveis de Ambiente**:
   ```
   OPENAI_API_KEY=sk-proj-...
   GROQ_API_KEY=gsk_...
   AI_PROVIDER=openai
   SUPABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ADMIN_API_KEY=secure-random-key-here
   ADMIN_PASSWORD=secure-password-here
   FRONTEND_URL=https://seu-frontend.vercel.app
   SESSION_SECRET=secure-session-secret
   ```

7. Deploy! Anote a URL do backend (ex: `https://app-name.onrender.com`)

### 🌐 3. Deploy do Frontend (Vercel)

1. Acesse [Vercel](https://vercel.com)
2. Importe seu repositório
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Variáveis de Ambiente**:
   ```
   VITE_BACKEND_URL=https://sua-app.onrender.com
   ```

5. Deploy! Anote a URL do frontend

### 🔧 4. Configuração Final

1. **Atualize FRONTEND_URL no backend** com a URL real do Vercel
2. **Teste o sistema completo**:
   - Acesse a página admin: `https://seu-frontend.vercel.app/admin`
   - Crie uma nova sessão
   - Teste o formulário
   - Teste a IA

### 📊 5. Monitoramento

- **Backend logs**: Render Dashboard → Service → Logs
- **Frontend logs**: Vercel Dashboard → Project → Functions
- **Database**: Supabase Dashboard → SQL Editor

### 🛠️ Troubleshooting

**Erro de CORS**: Verifique se FRONTEND_URL está correto no backend
**Erro de IA**: Verifique as chaves de API (OpenAI/Groq)
**Erro de DB**: Verifique SUPABASE_URL e se as tabelas existem

### 🔗 URLs Úteis

- **Admin**: `https://seu-frontend.vercel.app/admin` 
- **API Health**: `https://seu-backend.onrender.com/api/health`
- **Supabase Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)

---

## 🎯 Próximos Passos

1. **Domínio personalizado** (opcional)
2. **SSL/HTTPS** (automático no Vercel/Render)
3. **Monitoring** com Sentry (opcional)
4. **Backup automático** do banco (Supabase Pro)