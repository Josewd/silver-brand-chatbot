# Deploy Frontend na Vercel

## Passo a Passo

### 1. Instalar Vercel CLI (opcional, mas recomendado)

```bash
npm install -g vercel
```

### 2. Deploy via Dashboard Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New..." → "Project"
3. Importe o repositório do GitHub: `Josewd/silver-brand-chatbot`
4. Configure o projeto:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Variáveis de Ambiente:**
   - Adicione: `VITE_API_URL` = `https://silver-brand-chatbot.onrender.com`

6. Clique em "Deploy"

### 3. Deploy via CLI (Alternativo)

```bash
cd frontend
vercel
```

Siga as instruções:
- Set up and deploy? **Y**
- Which scope? (escolha sua conta)
- Link to existing project? **N**
- What's your project's name? **silver-brand-chatbot-frontend**
- In which directory is your code located? **./**
- Want to override the settings? **Y**
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Development Command: `npm run dev`

Adicione a variável de ambiente:
```bash
vercel env add VITE_API_URL production
# Cole: https://silver-brand-chatbot.onrender.com
```

Deploy em produção:
```bash
vercel --prod
```

## 4. Atualizar CORS no Backend

Após o deploy, pegue a URL da Vercel (ex: `https://silver-brand-chatbot-frontend.vercel.app`) e adicione no CORS do backend Render.

No arquivo `app/main.py`, adicione a URL da Vercel:

```python
allow_origins=[
    settings.frontend_url, 
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://silver-brand-chatbot-frontend.vercel.app",  # ← Adicionar
],
```

Depois faça commit e push para atualizar o backend.

## 5. Testar

Acesse a URL da Vercel e teste o sistema completo!
