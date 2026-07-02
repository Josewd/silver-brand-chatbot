# 🚀 Como Obter API Keys Gratuitas

## 1. Groq (Obrigatório)

**Groq é o provedor primário - RÁPIDO e GRATUITO!**

### Passo a Passo:

1. Acesse: https://console.groq.com/
2. Clique em "Sign Up" (pode usar conta Google/GitHub)
3. Após login, vá em "API Keys" no menu lateral
4. Clique em "Create API Key"
5. Dê um nome (ex: "silver-brand-chatbot")
6. Copie a key que começa com `gsk_...`

### Cole no .env:

```bash
GROQ_API_KEY=gsk_sua_key_aqui
```

✅ **Limite Gratuito**: 30 requisições/minuto (mais que suficiente!)

---

## 2. Hugging Face (Opcional, mas Recomendado)

**Hugging Face é o backup automático quando Groq atinge limite**

### Passo a Passo:

1. Acesse: https://huggingface.co/join
2. Crie uma conta (pode usar Google/GitHub)
3. Após login, vá em: https://huggingface.co/settings/tokens
4. Clique em "New token"
5. Configure:
   - **Nome**: silver-brand-chatbot
   - **Tipo**: Read (não precisa Write)
6. Clique em "Generate a token"
7. Copie o token que começa com `hf_...`

### Cole no .env:

```bash
HUGGINGFACE_API_KEY=hf_sua_key_aqui
```

✅ **Limite Gratuito**: Praticamente ilimitado!

---

## 3. Configurar .env

Abra o arquivo `.env` e adicione suas keys:

```bash
# IA Providers (Sistema híbrido com fallback automático)
GROQ_API_KEY=gsk_sua_key_groq_aqui
HUGGINGFACE_API_KEY=hf_sua_key_huggingface_aqui  # Opcional mas recomendado

# Banco de dados
DATABASE_URL=sqlite:///./database/sessions.db

# Configurações da empresa
ADMIN_EMAIL=brandhousesilver@gmail.com
ADMIN_PHONE=+5511960157100
COMPANY_NAME=Silver Brand House

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173

# Secret para sessões
SESSION_SECRET=silver-brand-2026-secret

# Senha do painel administrativo
ADMIN_PASSWORD=silveradmin2024
```

---

## Testar Sistema

```bash
# Ativar ambiente virtual
source venv/bin/activate

# Rodar testes
python test_system.py
```

Você deve ver:

```
✅ PASS - Imports
✅ PASS - Banco de Dados
✅ PASS - API
✅ PASS - Geração de PDF
✅ PASS - Provedor de IA

🎉 Sistema pronto para uso!
```

---

## Como Funciona o Sistema Híbrido?

### Groq (Primário) 🚀
- Responde 95%+ das conversas
- Extremamente rápido (1-2 segundos)
- Llama 3.3 70B (qualidade excelente)

### Hugging Face (Fallback) 🛡️
- Ativa automaticamente se:
  - Groq atingir rate limit (30 req/min)
  - Groq estiver offline (raro)
- Llama 3.1 8B (qualidade muito boa)
- Praticamente sem limite

### Resultado:
✅ **99.9% de disponibilidade**  
✅ **100% gratuito**  
✅ **Alta performance**  
✅ **Fallback automático e transparente**

---

## Perguntas Frequentes

### Preciso pagar algo?
Não! Ambos os provedores são 100% gratuitos.

### E se eu não configurar Hugging Face?
O sistema funciona, mas se Groq atingir o limite (30 req/min), você verá mensagens de erro temporárias.

### Qual a qualidade das respostas?
Groq usa Llama 3.3 70B, um dos melhores modelos open-source disponíveis. A qualidade é excelente, comparável ao GPT-3.5.

### Funciona no Render Free?
Sim! Perfeitamente. Ambos são APIs externas, então não consomem recursos do servidor.

---

## Links Úteis

- **Groq Console**: https://console.groq.com/
- **Hugging Face Tokens**: https://huggingface.co/settings/tokens
- **Documentação Sistema**: `SISTEMA_IA_HIBRIDO.md`
- **Status Groq**: https://status.groq.com/

---

**Dúvidas?** Abra uma issue ou envie email para brandhousesilver@gmail.com
