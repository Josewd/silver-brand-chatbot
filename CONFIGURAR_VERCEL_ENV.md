# 🔧 Configuração de Variáveis de Ambiente no Vercel

## ⚠️ PROBLEMA ATUAL
O frontend está tentando acessar `localhost:3002` em produção, causando erro de CORS.

## ✅ SOLUÇÃO
Configurar a variável `VITE_BACKEND_URL` no Vercel.

## 📝 Passos para Configurar

### 1. Acessar o Dashboard do Vercel
1. Vá para https://vercel.com/dashboard
2. Clique no projeto `silver-brand-chatbot`
3. Clique na aba "Settings"
4. Clique em "Environment Variables"

### 2. Adicionar Variável de Ambiente
Adicione a seguinte variável:

**Nome:** `VITE_BACKEND_URL`
**Valor:** `https://silver-brand-backend.onrender.com`
**Ambientes:** Production, Preview, Development

### 3. Redeploy
Após adicionar a variável:
1. Vá para a aba "Deployments"
2. Clique nos três pontinhos do último deployment
3. Clique em "Redeploy"

## 🧪 Teste
Após o redeploy, acesse:
- https://silver-brand-chatbot.vercel.app
- O console não deve mais mostrar erros de `localhost:3002`
- As requisições devem ir para `https://silver-brand-backend.onrender.com`

## 📋 Verificação
No console do navegador, você deve ver:
```
🔌 Conectando ao WebSocket: https://silver-brand-backend.onrender.com
```

## ⚡ Alternativa Rápida
Se você tem acesso via CLI do Vercel:
```bash
vercel env add VITE_BACKEND_URL production
# Cole: https://silver-brand-backend.onrender.com

vercel --prod
```