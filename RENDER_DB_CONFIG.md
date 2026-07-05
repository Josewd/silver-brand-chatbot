# Configuração de Banco de Dados - Opções para Render

## Problema atual
O erro `ENOTFOUND base` indica que a connection string está sendo mal interpretada no Render.

## Soluções disponíveis

### Opção 1: Connection String (atual)
```
SUPABASE_URL=postgresql://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:6543/postgres
```

### Opção 2: Variáveis individuais (RECOMENDADA)
Configure no Render estas variáveis separadas:

```
DB_HOST=db.dkuhctiznnwalyptlkhu.supabase.co
DB_USER=postgres
DB_PASSWORD=ezivL8MIDMpHA6aQ
DB_PORT=6543
DB_NAME=postgres
```

## Como configurar no Render

### Para usar variáveis individuais:
1. Vá em Environment Variables no Render
2. Adicione cada variável separadamente:
   - **DB_HOST**: `db.dkuhctiznnwalyptlkhu.supabase.co`
   - **DB_USER**: `postgres`
   - **DB_PASSWORD**: `ezivL8MIDMpHA6aQ`
   - **DB_PORT**: `6543`
   - **DB_NAME**: `postgres`
3. Salve e redeploy

### Vantagens das variáveis individuais:
- ✅ Não há problema com parsing de URL
- ✅ Mais fácil de debugar
- ✅ Render manuseia melhor
- ✅ Mais seguro (pode ocultar senha separadamente)

## Resultado esperado
O código atual detecta automaticamente se as variáveis individuais estão disponíveis e usa elas ao invés da connection string, evitando completamente o problema de parsing da URL.