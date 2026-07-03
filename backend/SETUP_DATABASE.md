# Setup do Banco de Dados (Supabase)

## 1. Criar Tabelas

Execute estes comandos SQL no editor SQL do Supabase:

```sql
-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de estados do formulário
CREATE TABLE IF NOT EXISTS form_states (
  session_id UUID REFERENCES sessions(id) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  progress JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
```

## 2. Trigger para updated_at

```sql
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_states_updated_at 
    BEFORE UPDATE ON form_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 3. RLS (Row Level Security) - Opcional

Se quiser adicionar segurança extra:

```sql
-- Habilitar RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas (permitir tudo para service key)
CREATE POLICY "Service role can do anything" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do anything" ON form_states
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do anything" ON messages
  FOR ALL USING (auth.role() = 'service_role');
```

## 4. Configuração das Variáveis de Ambiente

No arquivo `.env` do backend:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**IMPORTANTE:** Use a SERVICE KEY, não a anon key, pois o backend precisa de acesso total.

## 5. Verificar Conexão

Após configurar, teste a conexão executando:

```bash
cd backend
npm install
npm run dev
```

O log deve mostrar: "✅ Database inicializado com sucesso"