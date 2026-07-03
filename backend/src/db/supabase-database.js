const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase não configurado, usando modo local simples');
      return this.initializeFileSystem();
    }
    
    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🗄️ Usando Supabase como banco de dados');
      await this.createTables();
      this.initialized = true;
    } catch (err) {
      console.error('❌ Erro ao conectar Supabase:', err);
      console.log('🔄 Fallback para modo local simples');
      return this.initializeFileSystem();
    }
  }

  async initializeFileSystem() {
    const fs = require('fs');
    const path = require('path');
    
    this.dbPath = path.join(__dirname, '../../data');
    
    // Criar diretório se não existir
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    
    this.sessionsFile = path.join(this.dbPath, 'sessions.json');
    this.messagesFile = path.join(this.dbPath, 'messages.json');
    this.formStatesFile = path.join(this.dbPath, 'form_states.json');
    
    // Inicializar arquivos se não existirem
    if (!fs.existsSync(this.sessionsFile)) {
      fs.writeFileSync(this.sessionsFile, '{}');
    }
    if (!fs.existsSync(this.messagesFile)) {
      fs.writeFileSync(this.messagesFile, '{}');
    }
    if (!fs.existsSync(this.formStatesFile)) {
      fs.writeFileSync(this.formStatesFile, '{}');
    }
    
    console.log('📁 Usando sistema de arquivos local como banco de dados');
    this.initialized = true;
    this.useFileSystem = true;
  }

  async createTables() {
    // Para Supabase, as tabelas devem ser criadas no dashboard
    // Este é apenas um check de conectividade
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('count')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log('⚠️ Tabelas não existem no Supabase. Criando via SQL...');
        // Em produção, você deveria executar o SQL de criação das tabelas
      }
    } catch (err) {
      // Ignorar erros de tabela não existente por agora
    }
  }

  // File System Methods
  readJsonFile(filePath) {
    const fs = require('fs');
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return {};
    }
  }

  writeJsonFile(filePath, data) {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // Unified Methods (work with both Supabase and FileSystem)
  async createSession(sessionData) {
    const sessionId = sessionData.id || this.generateUUID();
    
    if (this.useFileSystem) {
      const sessions = this.readJsonFile(this.sessionsFile);
      sessions[sessionId] = {
        id: sessionId,
        client_name: sessionData.client_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.writeJsonFile(this.sessionsFile, sessions);
      return { id: sessionId, client_name: sessionData.client_name };
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .insert([{
        id: sessionId,
        client_name: sessionData.client_name
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSession(sessionId) {
    if (this.useFileSystem) {
      const sessions = this.readJsonFile(this.sessionsFile);
      const session = sessions[sessionId];
      
      if (session) {
        // Buscar form_state
        const formStates = this.readJsonFile(this.formStatesFile);
        const formState = formStates[sessionId];
        
        if (formState) {
          session.form_state = {
            data: formState.data || {},
            progress: formState.progress || {}
          };
        }
      }
      
      return session;
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        form_states (*)
      `)
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Adaptar formato para compatibilidade
    if (data && data.form_states?.[0]) {
      data.form_state = {
        data: data.form_states[0].data || {},
        progress: data.form_states[0].progress || {}
      };
    }
    
    return data;
  }

  async updateFormState(sessionId, data, progress = {}) {
    if (this.useFileSystem) {
      const formStates = this.readJsonFile(this.formStatesFile);
      formStates[sessionId] = {
        session_id: sessionId,
        data: data,
        progress: progress,
        updated_at: new Date().toISOString()
      };
      this.writeJsonFile(this.formStatesFile, formStates);
      return { session_id: sessionId };
    }

    const { error } = await this.supabase
      .from('form_states')
      .upsert({
        session_id: sessionId,
        data: data,
        progress: progress
      });

    if (error) throw error;
    return { session_id: sessionId };
  }

  async saveMessage(sessionId, role, content) {
    const messageId = this.generateUUID();
    
    if (this.useFileSystem) {
      const messages = this.readJsonFile(this.messagesFile);
      if (!messages[sessionId]) messages[sessionId] = [];
      
      messages[sessionId].push({
        id: messageId,
        session_id: sessionId,
        role: role,
        content: content,
        created_at: new Date().toISOString()
      });
      
      this.writeJsonFile(this.messagesFile, messages);
      return { id: messageId };
    }

    const { data, error } = await this.supabase
      .from('messages')
      .insert([{
        session_id: sessionId,
        role: role,
        content: content
      }])
      .select()
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async getMessages(sessionId) {
    if (this.useFileSystem) {
      const messages = this.readJsonFile(this.messagesFile);
      return messages[sessionId] || [];
    }

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }

  async getAllSessions(limit = 50) {
    if (this.useFileSystem) {
      const sessions = this.readJsonFile(this.sessionsFile);
      const formStates = this.readJsonFile(this.formStatesFile);
      
      return Object.values(sessions)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map(session => ({
          ...session,
          form_states: formStates[session.id] ? [{
            data: formStates[session.id].data || {},
            progress: formStates[session.id].progress || {}
          }] : []
        }));
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        form_states (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Instância global
const database = new SupabaseDatabase();

// Funções de compatibilidade
async function initDatabase() {
  try {
    await database.initialize();
    console.log('✅ Database inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar database:', error);
    throw error;
  }
}

async function createSession(sessionData) {
  return await database.createSession(sessionData);
}

async function getSession(sessionId) {
  return await database.getSession(sessionId);
}

async function updateFormState(sessionId, data, progress) {
  return await database.updateFormState(sessionId, data, progress);
}

async function saveMessage(sessionId, role, content) {
  return await database.saveMessage(sessionId, role, content);
}

async function getMessages(sessionId) {
  return await database.getMessages(sessionId);
}

async function getAllSessions(limit = 50) {
  return await database.getAllSessions(limit);
}

module.exports = {
  initDatabase,
  createSession,
  getSession,
  updateFormState,
  saveMessage,
  getMessages,
  getAllSessions
};