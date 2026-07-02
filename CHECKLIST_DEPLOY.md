# ✅ Checklist de Deploy - Silver Brand Chatbot

## 📋 Antes de Fazer Deploy

### Backend (Render)
- [ ] Criar conta no Render.com
- [ ] Obter GROQ_API_KEY (obrigatório)
- [ ] Obter HUGGINGFACE_API_KEY (recomendado)
- [ ] Gerar SESSION_SECRET aleatório
- [ ] Definir ADMIN_PASSWORD

### Frontend (Vercel)
- [ ] Criar conta no Vercel.com
- [ ] Conectar repositório GitHub

---

## 🚀 Ordem de Deploy

### 1️⃣ Deploy do Frontend PRIMEIRO

**Por quê?** Você precisa da URL do Vercel para configurar o backend.

1. Deploy no Vercel
2. Anote a URL: `https://seu-app.vercel.app`
3. Configure variável de ambiente no Vercel:
   - `VITE_API_URL` = URL do Render (será obtida no passo 2)

### 2️⃣ Deploy do Backend DEPOIS

1. Deploy no Render
2. Configure a variável **FRONTEND_URL** com a URL do Vercel:
   ```
   FRONTEND_URL=https://seu-app.vercel.app
   ```
3. Anote a URL do Render: `https://seu-backend.onrender.com`

### 3️⃣ Atualizar Frontend com URL do Backend

1. Volte ao Vercel
2. Atualize a variável `VITE_API_URL`:
   ```
   VITE_API_URL=https://seu-backend.onrender.com
   ```
3. Redeploy automático será feito

---

## ⚠️ Problema Comum: Links com localhost

**Sintoma:** Links de chat gerados aparecem com `http://localhost:5173`

**Causa:** A variável `FRONTEND_URL` não foi configurada no Render

**Solução:**
1. Vá em Render Dashboard → Seu Web Service
2. Environment → Add Environment Variable
3. Nome: `FRONTEND_URL`
4. Valor: `https://seu-app.vercel.app` (URL do Vercel)
5. Salvar e aguardar redeploy

---

## 🔍 Como Verificar se Está Funcionando

### Backend (Render)
Acesse: `https://seu-backend.onrender.com/health`

Deve retornar:
```json
{
  "status": "ok",
  "ai_provider": "groq"
}
```

### Frontend (Vercel)
Acesse: `https://seu-app.vercel.app`

Deve mostrar a tela de login do admin.

### Teste Completo
1. Faça login no admin
2. Crie uma sessão de teste
3. Verifique se o link gerado tem a URL do Vercel (não localhost)
4. Clique no link e teste o chat

---

## 📝 Variáveis de Ambiente - Resumo

### Backend (Render)
```bash
GROQ_API_KEY=gsk_...                    # Obrigatório
HUGGINGFACE_API_KEY=hf_...              # Recomendado
DATABASE_URL=sqlite:///./database/sessions.db
ADMIN_EMAIL=brandhousesilver@gmail.com
ADMIN_PHONE=+5511960157100
COMPANY_NAME=Silver Brand House
FRONTEND_URL=https://seu-app.vercel.app # ⚠️ CRÍTICO
SESSION_SECRET=seu-secret-aleatorio
ADMIN_PASSWORD=sua-senha-segura
```

### Frontend (Vercel)
```bash
VITE_API_URL=https://seu-backend.onrender.com  # ⚠️ CRÍTICO
```

---

## 🆘 Troubleshooting

### Links ainda aparecem com localhost
- Verifique se `FRONTEND_URL` está configurado no Render
- Force um redeploy no Render após adicionar a variável
- Limpe cache do navegador

### Chat não conecta com backend
- Verifique se `VITE_API_URL` está configurado no Vercel
- Abra o console do navegador e veja se há erros de CORS
- Verifique se o Render está rodando (logs)

### Erro de IA / Rate Limit
- Verifique se `GROQ_API_KEY` é válida
- Sistema fará fallback para Hugging Face automaticamente
- Se tiver muitos erros, adicione `HUGGINGFACE_API_KEY`

---

## ✨ Deploy Bem-Sucedido

Quando tudo estiver funcionando:
- ✅ Backend responde em `/health`
- ✅ Frontend carrega corretamente
- ✅ Login funciona
- ✅ Links gerados têm URL de produção (Vercel)
- ✅ Chat responde às mensagens
- ✅ Preview do briefing funciona
- ✅ PDF pode ser gerado

**Parabéns! Seu sistema está no ar! 🎉**
