# 🚨 SOLUÇÃO URGENTE - Configurar VITE_BACKEND_URL no Vercel

## ⚠️ PROBLEMA ATUAL
```
Access to fetch at 'http://localhost:3002/api/admin/login' from origin 'https://silver-brand-chatbot.vercel.app' has been blocked by CORS policy
```

Isso acontece porque o Vercel ainda não tem a variável `VITE_BACKEND_URL` configurada.

## ✅ SOLUÇÃO IMEDIATA

### Opção 1: Via Dashboard Vercel (RECOMENDADO)

1. **Acesse:** https://vercel.com/dashboard
2. **Encontre:** o projeto `silver-brand-chatbot`
3. **Clique:** no projeto
4. **Vá:** Settings → Environment Variables
5. **Clique:** "Add New"
6. **Preencha:**
   ```
   Name: VITE_BACKEND_URL
   Value: https://silver-brand-chatbot.onrender.com
   ```
7. **Selecione:** Production, Preview, Development
8. **Clique:** Save
9. **Vá:** Deployments → último deploy → ⋯ → Redeploy

### Opção 2: Via CLI Vercel (MAIS RÁPIDO)

Se você tem o Vercel CLI instalado:

```bash
# Instalar CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Navegar para o projeto
cd /Users/josesilva/Downloads/silver-brand-chatbot

# Adicionar variável de ambiente
vercel env add VITE_BACKEND_URL production

# Quando perguntado, cole:
https://silver-brand-chatbot.onrender.com

# Deploy em produção
vercel --prod
```

## 🧪 Como Verificar se Funcionou

Após configurar, acesse:
- https://silver-brand-chatbot.vercel.app/login
- Abra Console (F12)
- Deve aparecer: `🔌 Conectando ao WebSocket: https://silver-brand-chatbot.onrender.com`
- **NÃO deve** aparecer: `localhost:3002`

## 📋 Troubleshooting

### Se ainda aparecer localhost:3002
1. Limpe o cache do browser (Ctrl+Shift+R)
2. Verifique se o redeploy foi feito
3. Aguarde alguns minutos para propagação

### Se der erro 404 no backend
1. Verifique se o backend está online: https://silver-brand-chatbot.onrender.com/health
2. Se não estiver, faça deploy do backend no Render

## 🎯 Status Atual
- ✅ Código frontend: CORRETO
- ✅ Código backend: CORRETO  
- ❌ Variável Vercel: **FALTANDO** ← PRECISA CONFIGURAR
- ❌ Backend deploy: VERIFICAR