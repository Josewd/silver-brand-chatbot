-- Tabelas para o sistema de formulário com ajuda inteligente por campo
-- Para ser executado no Postgres (Supabase/Neon)

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela principal de sessões
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_by TEXT, -- ID ou nome do admin que criou a sessão
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para armazenar o estado do formulário
CREATE TABLE form_states (
  session_id UUID REFERENCES sessions(id) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}', -- Valores dos campos do formulário
  progress JSONB NOT NULL DEFAULT '{}', -- Progresso por seção (percentuais)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para histórico de mensagens da ajuda inteligente por campo
CREATE TABLE field_help_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  field_id TEXT NOT NULL, -- ID do campo (ex: "missao_visao_valores")
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_call_data JSONB, -- Para armazenar dados de tool calls quando necessário
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_sessions_client_token ON sessions(client_token);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_field_help_messages_session_field ON field_help_messages(session_id, field_id);
CREATE INDEX idx_field_help_messages_created_at ON field_help_messages(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_states_updated_at 
    BEFORE UPDATE ON form_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Política de segurança básica (RLS - Row Level Security)
-- Pode ser ajustado conforme necessidades específicas de autenticação
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_help_messages ENABLE ROW LEVEL SECURITY;

-- Comentários para documentar as tabelas
COMMENT ON TABLE sessions IS 'Sessões de formulário criadas pelo admin';
COMMENT ON TABLE form_states IS 'Estado atual do preenchimento do formulário por sessão';
COMMENT ON TABLE field_help_messages IS 'Histórico de conversas da ajuda inteligente por campo';
COMMENT ON COLUMN sessions.client_token IS 'Token único para acesso do cliente à sessão';
COMMENT ON COLUMN form_states.data IS 'Dados do formulário em formato JSON (field_id: value)';
COMMENT ON COLUMN form_states.progress IS 'Progresso por seção em formato JSON (section_id: percentage)';
COMMENT ON COLUMN field_help_messages.field_id IS 'ID do campo específico do formulário';
COMMENT ON COLUMN field_help_messages.tool_call_data IS 'Dados de tool calls para propose_field_value';