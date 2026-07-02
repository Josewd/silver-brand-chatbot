# ⚡ Início Rápido - Sistema de IA Híbrido

## 1️⃣ Obter API Keys (5 minutos)

### Groq (Obrigatório)
1. Acesse: https://console.groq.com/
2. Login (Google/GitHub)
3. API Keys → Create API Key
4. Copie a key `gsk_...`

### Hugging Face (Opcional)
1. Acesse: https://huggingface.co/settings/tokens
2. New token → Read access
3. Copie a key `hf_...`

## 2️⃣ Configurar .env

```bash
GROQ_API_KEY=gsk_sua_key_aqui
HUGGINGFACE_API_KEY=hf_sua_key_aqui  # opcional
```

## 3️⃣ Instalar Dependências

```bash
source venv/bin/activate
pip install -r requirements.txt
```

## 4️⃣ Testar Sistema

```bash
python test_system.py
```

Deve mostrar:
```
✅ 5/5 testes passaram
🎉 Sistema pronto para uso!
```

## 5️⃣ Rodar Backend

```bash
uvicorn app.main:app --reload
```

Acesse: http://localhost:8000

## 🎯 Como Funciona

- **Groq responde** → 95% das conversas (rápido!)
- **Groq falhar** → Hugging Face assume automaticamente
- **Tudo transparente** → Usuário não nota diferença

## 🔍 Ver Logs

Os logs mostram qual provider está sendo usado:

```
🚀 Tentando Groq...
✅ Resposta gerada com Groq
```

## 📚 Documentação Completa

- `SISTEMA_IA_HIBRIDO.md` - Como funciona o sistema
- `COMO_OBTER_API_KEYS.md` - Guia detalhado de API keys
- `MUDANCAS_IA_HIBRIDA.md` - Resumo das mudanças

## ❓ Problemas Comuns

### "Rate limit exceeded"
✅ Normal! Sistema automaticamente usa Hugging Face como backup.

### "Todos os providers falharam"
1. Verificar GROQ_API_KEY no .env
2. Verificar conexão com internet
3. Aguardar 1 minuto e tentar novamente

### Respostas lentas
- Provavelmente usando Hugging Face (fallback)
- Groq volta em 1 minuto quando rate limit resetar
- Configure HUGGINGFACE_API_KEY para melhor performance no fallback

## 🚀 Deploy Render

1. Conectar repositório no Render
2. Configurar variáveis de ambiente (incluir GROQ_API_KEY)
3. Deploy!

Pronto! Sistema 100% funcional e gratuito! 🎉
