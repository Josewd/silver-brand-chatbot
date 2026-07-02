# 🚀 Deploy no Render - Sistema de IA Híbrido

## ✅ Configuração no Render

### 1. Criar Web Service

1. Acesse: https://dashboard.render.com/
2. New + → Web Service
3. Conectar repositório GitHub
4. Selecionar branch: `main`

### 2. Configurações Básicas

```
Name: silver-brand-chatbot
Region: Oregon (US West) ou Frankfurt (EU)
Branch: main
Root Directory: (vazio)
Runtime: Python 3
```

### 3. Build & Start Commands

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4. Plano

Selecione: **Free** (suficiente para o sistema híbrido)

### 5. Variáveis de Ambiente (IMPORTANTE!)

Adicione todas estas variáveis:

```bash
# IA - Sistema Híbrido (OBRIGATÓRIO)
GROQ_API_KEY=gsk_sua_key_aqui

# IA - Fallback (OPCIONAL mas RECOMENDADO)
HUGGINGFACE_API_KEY=hf_sua_key_aqui

# Banco de Dados
DATABASE_URL=sqlite:///./database/sessions.db

# Empresa
ADMIN_EMAIL=brandhousesilver@gmail.com
ADMIN_PHONE=+5511960157100
COMPANY_NAME=Silver Brand House

# Frontend (Vercel URL após deploy do frontend)
FRONTEND_URL=https://seu-frontend.vercel.app

# Segurança
SESSION_SECRET=seu-secret-aleatorio-aqui-use-um-gerador
ADMIN_PASSWORD=sua-senha-admin-aqui
```

### 6. Deploy

Clique em **Create Web Service** e aguarde!

O Render irá:
1. ✅ Clonar repositório
2. ✅ Instalar dependências (incluindo huggingface-hub)
3. ✅ Iniciar aplicação
4. ✅ Fornecer URL pública

## 🔍 Verificar Deploy

Após deploy, abra os logs e procure por:

```
INFO:app.ai:✅ Cliente Groq inicializado
INFO:app.ai:✅ Cliente Hugging Face inicializado
INFO:     Uvicorn running on http://0.0.0.0:10000
```

## ✅ Testar API

Acesse: `https://seu-backend.onrender.com/docs`

Deve abrir a documentação FastAPI interativa.

## 🎯 Por Que Funciona no Render Free?

### Render Free Tier:
- 512MB RAM
- CPU Compartilhada
- Sleep após inatividade

### Sistema Híbrido:
- **Sem processamento local de IA** → APIs externas
- **Leve** → Apenas HTTP requests
- **Rápido** → Groq tem latência baixíssima
- **Confiável** → Fallback automático

### Resultado:
✅ **Perfeito para Render Free!** Nenhum overhead no servidor.

## 📊 Monitoramento

### Ver Logs em Tempo Real

No dashboard do Render:
- Aba "Logs"
- Procure por:
  - `🚀 Tentando Groq...`
  - `✅ Resposta gerada com Groq`
  - `⚠️ Groq falhou:` (se atingir rate limit)
  - `✅ Resposta gerada com Hugging Face` (fallback)

### Verificar Status

```bash
curl https://seu-backend.onrender.com/health
```

Deve retornar:
```json
{"status": "ok"}
```

## 🚨 Problemas Comuns

### 1. "Build Failed"

**Causa:** Erro nas dependências

**Solução:**
- Verificar `requirements.txt` está correto
- Logs mostrarão qual dependência falhou

### 2. "Application Failed to Start"

**Causa:** Variáveis de ambiente faltando

**Solução:**
- Verificar todas variáveis estão configuradas
- Especialmente `GROQ_API_KEY` (obrigatório)

### 3. "Service Sleeping"

**Causa:** Render Free dorme após 15min inatividade

**Solução:**
- ✅ Normal! Primeiro request após sleep demora ~30s
- ✅ Considere: UptimeRobot (pingar a cada 5min para manter ativo)

### 4. Rate Limit no Groq

**Causa:** Muitas requisições (30/min no free)

**Solução:**
- ✅ Sistema automaticamente usa Hugging Face
- ✅ Configure HUGGINGFACE_API_KEY para melhor performance

## 🎯 Otimizações Opcionais

### 1. UptimeRobot (Manter Acordado)

1. Acesse: https://uptimerobot.com/
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: `https://seu-backend.onrender.com/health`
   - Interval: 5 minutes
3. Pronto! Seu backend nunca dormirá

### 2. Health Check Endpoint

Já está incluído no código:

```python
@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

Use para monitoramento externo.

### 3. CORS para Frontend

Já configurado! Só atualizar `FRONTEND_URL`:

```bash
FRONTEND_URL=https://seu-frontend.vercel.app
```

## 📈 Escalabilidade

### Render Free Limits:
- **Requests:** Ilimitados (mas pode ser lento sob carga)
- **Bandwidth:** 100GB/mês (mais que suficiente)
- **Concurrent Connections:** ~10-20

### Se precisar escalar:
- **Render Starter ($7/mês):** Mesma RAM, sem sleep
- **Render Standard ($25/mês):** 2GB RAM, mais CPU
- Sistema híbrido funciona perfeitamente em todos os planos

## 🎉 Deploy do Frontend (Vercel)

Veja: `frontend/DEPLOY_VERCEL.md`

Depois de deploy do frontend:
1. Copiar URL do Vercel
2. Atualizar `FRONTEND_URL` no Render
3. Redeploy do backend

## ✅ Checklist Final

Antes de fazer deploy, verificar:

- [ ] GROQ_API_KEY configurada
- [ ] HUGGINGFACE_API_KEY configurada (opcional)
- [ ] Todas variáveis de ambiente configuradas
- [ ] requirements.txt atualizado
- [ ] Build command correto
- [ ] Start command correto
- [ ] Runtime: Python 3

## 🚀 Pronto para Deploy!

Sistema testado e funcionando:
- ✅ Híbrido com fallback automático
- ✅ Gratuito e sem limites práticos
- ✅ Rápido (Groq)
- ✅ Confiável (HF como backup)
- ✅ Perfeito para Render Free

**Bom deploy! 🎉**

---

**Dúvidas?** Consulte os logs do Render ou a documentação em `SISTEMA_IA_HIBRIDO.md`
