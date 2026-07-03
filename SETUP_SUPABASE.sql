-- ========================================
-- SUPABASE DATABASE SETUP
-- Execute este SQL no painel do Supabase
-- (SQL Editor > New Query)
-- ========================================

-- 1. Criar tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de estados do formulário
CREATE TABLE IF NOT EXISTS form_states (
  session_id UUID REFERENCES sessions(id) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  progress JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_states_updated_at ON form_states(updated_at);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Triggers para updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_states_updated_at ON form_states;
CREATE TRIGGER update_form_states_updated_at 
    BEFORE UPDATE ON form_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Inserir dados de teste
INSERT INTO sessions (id, client_name) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Cliente Teste') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_states (session_id, data) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '{"nome": "João Teste", "email": "joao@teste.com"}'
) ON CONFLICT (session_id) DO UPDATE SET data = EXCLUDED.data;

-- 8. Verificar instalação
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT COUNT(*) as total_sessions FROM sessions;
SELECT COUNT(*) as total_form_states FROM form_states;
SELECT COUNT(*) as total_messages FROM messages;

-- 9. Mostrar estrutura das tabelas
\d sessions;
\d form_states;
\d messages;