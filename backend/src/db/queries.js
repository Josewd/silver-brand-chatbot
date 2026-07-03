const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket
  }
});

// === INICIALIZAÇÃO ===

async function initDatabase() {
  try {
    // Criar tabelas se não existirem
    const { error: sessionsError } = await supabase.rpc('create_sessions_table_if_not_exists');
    if (sessionsError) console.log('Sessions table:', sessionsError.message);

    const { error: formStatesError } = await supabase.rpc('create_form_states_table_if_not_exists');
    if (formStatesError) console.log('Form states table:', formStatesError.message);

    const { error: messagesError } = await supabase.rpc('create_messages_table_if_not_exists');
    if (messagesError) console.log('Messages table:', messagesError.message);

    console.log('✅ Database inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar database:', error);
    throw error;
  }
}

// === SESSÕES ===

async function createSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .insert([{ id: sessionId }])
    .select()
    .single();
  
  if (error) {
    console.error('❌ Erro ao criar sessão:', error);
    throw error;
  }
  
  // Criar estado inicial do formulário
  await supabase
    .from('form_states')
    .insert([{
      session_id: sessionId,
      data: {},
      progress: {}
    }]);
  
  return data;
}

async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      form_state:form_states(*)
    `)
    .eq('id', sessionId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Não é "not found"
    console.error('❌ Erro ao buscar sessão:', error);
    throw error;
  }
  
  return data;
}

// === FORMULÁRIO ===

async function updateFormState(sessionId, formData) {
  const { error } = await supabase
    .from('form_states')
    .upsert({
      session_id: sessionId,
      data: formData,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('❌ Erro ao atualizar form state:', error);
    throw error;
  }
}

// === MENSAGENS ===

async function saveMessage(sessionId, role, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      session_id: sessionId,
      role,
      content
    }])
    .select()
    .single();
  
  if (error) {
    console.error('❌ Erro ao salvar mensagem:', error);
    throw error;
  }
  
  return data;
}

async function getMessages(sessionId, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    throw error;
  }
  
  return data || [];
}

module.exports = {
  supabase,
  initDatabase,
  createSession,
  getSession,
  updateFormState,
  saveMessage,
  getMessages
};