# 🚀 Configuração Render + Supabase

## Problema: ENETUNREACH IPv6

O Render pode ter limitações de conectividade IPv6 com Supabase. Aqui estão as soluções:

## ✅ Solução 1: Variável de Ambiente (Recomendada)

No painel do Render, adicione a variável de ambiente:

```
RENDER_DATABASE_URL=postgresql://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres?sslmode=require
```

### Como adicionar no Render:
1. Acesse seu dashboard do Render
2. Vá em **Environment** 
3. Adicione a variável `RENDER_DATABASE_URL`
4. Cole o valor acima (com a senha real)
5. Salve e redeploy

## ✅ Solução 2: IPv4 Add-on Supabase (Paga)

Se o problema persistir, no Supabase:
1. Vá em **Settings > Database**
2. Ative **"Enable IPv4 add-on"** (custa ~$4/mês)
3. Use a configuração IPv4

## ✅ Solução 3: Banco Alternativo

Considere usar:
- **Neon** (PostgreSQL gratuito com melhor compatibilidade Render)
- **Railway** (PostgreSQL built-in)
- **PlanetScale** (MySQL compatível)

## 🔍 Debug

Para debugar a conectividade:

```bash
# No terminal do Render (se disponível)
ping6 db.dkuhctiznnwalyptlkhu.supabase.co
nslookup db.dkuhctiznnwalyptlkhu.supabase.co
```

## 📊 Status atual

- ✅ Código local funciona (IPv6 ok)
- ❌ Render produção falha (IPv6 connectivity issue)
- 🔄 Implementado fallback automático