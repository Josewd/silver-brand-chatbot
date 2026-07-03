# 🔧 Checklist de Troubleshooting - VITE_BACKEND_URL no Vercel

## ✅ Variável Configurada
Pelo screenshot, vejo que você já configurou `VITE_BACKEND_URL` no Vercel.

## 🚨 Ainda Assim o Erro Persiste
O erro ainda mostra `localhost:3002`, indicando que:

### 1. ⚠️ VERIFICAR O VALOR DA VARIÁVEL

**Clique** no ⋯ (três pontos) da variável `VITE_BACKEND_URL` → **Edit**

**O valor deve ser EXATAMENTE:**
```
https://silver-brand-chatbot.onrender.com
```

**NÃO deve ter:**
- Espaços em branco
- Barras no final (/)
- http:// (deve ser https://)
- URLs antigas como silver-brand-backend

### 2. 🔄 FORÇAR REDEPLOY

Após verificar/corrigir o valor:

1. **Vá para** Deployments (aba ao lado de Settings)
2. **Clique** no último deployment 
3. **Clique** nos três pontos ⋯ → **Redeploy**
4. **Aguarde** o deploy terminar (pode levar 2-3 minutos)

### 3. 🧹 LIMPAR CACHE DO BROWSER

Após o redeploy:
1. **Abra** https://silver-brand-chatbot.vercel.app
2. **Pressione** `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
3. **Ou** F12 → Network → Disable Cache ✅ → F5

### 4. ⚡ ALTERNATIVA: CLI (SE NÃO FUNCIONAR)

```bash
# Verificar valor atual
vercel env ls

# Remover e recriar se necessário
vercel env rm VITE_BACKEND_URL production
vercel env add VITE_BACKEND_URL production
# Cole: https://silver-brand-chatbot.onrender.com

# Redeploy
vercel --prod
```

## 🎯 COMO SABER SE FUNCIONOU

Após redeploy + cache limpo:

**Console deve mostrar:**
```
🔌 Conectando ao WebSocket: https://silver-brand-chatbot.onrender.com
```

**NÃO deve mostrar:**
- `localhost:3002`
- Erros de CORS

## 📞 SE AINDA NÃO FUNCIONAR

Me mande um screenshot do valor da variável (quando clicar em Edit) para eu verificar se está correto.