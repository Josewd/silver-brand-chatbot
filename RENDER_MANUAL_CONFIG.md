# 🚨 CONFIGURAÇÃO MANUAL DO RENDER (NECESSÁRIA)

## ❌ PROBLEMA
O Render está ignorando o `render.yaml` e tentando fazer deploy como Python.

**Erro:** `ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'`

## ✅ SOLUÇÃO: Configurar Manualmente no Dashboard

### 1. Acessar Dashboard Render
1. Vá para: https://dashboard.render.com
2. Encontre o serviço `silver-brand-backend`
3. Clique no serviço

### 2. Configurar Runtime e Build
**Vá em Settings → Environment:**

**Runtime:** `Node`
**Build Command:** `cd backend && npm install`
**Start Command:** `cd backend && npm start`

### 3. Configurar Variáveis de Ambiente
Adicione estas variáveis em **Environment Variables:**

```
NODE_VERSION=18
PORT=3002
FRONTEND_URL=https://silver-brand-chatbot.vercel.app
AI_PROVIDER=groq
ADMIN_EMAIL=brandhousesilver@gmail.com
ADMIN_PHONE=+5511960157100
COMPANY_NAME=Silver Brand House
```

**E adicione as privadas (sync: false):**
- `ADMIN_PASSWORD` 
- `GROQ_API_KEY`
- `CORS_ORIGIN`

### 4. Forçar Redeploy
1. **Vá para** Deployments
2. **Clique** Manual Deploy → Deploy Latest Commit
3. **Aguarde** 5-10 minutos

## 🧪 Verificação
Após redeploy manual:
```bash
curl https://silver-brand-chatbot.onrender.com/api/admin/verify
```

**Deve retornar:**
```json
{"error":"Token não fornecido"}
```

## ⚠️ ALTERNATIVA: Criar Novo Serviço
Se a configuração manual não funcionar:

1. **Delete** o serviço atual
2. **Create New** → Web Service
3. **Connect** o repositório GitHub
4. **Configure:**
   - Name: `silver-brand-backend`
   - Runtime: `Node`
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
   - Port: `3002`

## 📁 Arquivos Criados
- `package.json` (raiz) - Força detecção Node.js
- `Dockerfile` - Alternativa para container
- `render.yaml` atualizado - Configuração explícita