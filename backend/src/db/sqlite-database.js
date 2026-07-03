const Database = require('@libsql/sqlite3').Database;
const path = require('path');
const fs = require('fs');

class LocalDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    
    try {
      this.db = new Database(dbPath);
      console.log('🗄️ Usando SQLite como banco de dados local');
      await this.createTables();
      this.initialized = true;
    } catch (err) {
      console.error('❌ Erro ao conectar SQLite:', err);
      throw err;
    }
  }

  async createTables() {
    try {
      const tables = [
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
          client_name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS form_states (
          session_id TEXT PRIMARY KEY,
          data TEXT NOT NULL DEFAULT '{}',
          progress TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id)
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id)
        )`
      ];

      tables.forEach((sql, index) => {
        this.db.exec(sql);
      });
      
      console.log('✅ Tabelas SQLite criadas com sucesso');
      await this.insertTestData();
    } catch (err) {
      console.error('❌ Erro ao criar tabelas:', err);
      throw err;
    }
  }

  async insertTestData() {
    try {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440001';
      
      this.db.run('INSERT OR IGNORE INTO sessions (id, client_name) VALUES (?, ?)', 
                  testSessionId, 'Cliente Teste');
      this.db.run('INSERT OR REPLACE INTO form_states (session_id, data, progress) VALUES (?, ?, ?)', 
                  testSessionId, JSON.stringify({nome: 'João Teste', email: 'joao@teste.com'}), JSON.stringify({}));
      
      console.log('✅ Dados de teste inseridos');
    } catch (err) {
      console.error('❌ Erro ao inserir dados de teste:', err);
    }
  }

  // Wrappers para manter compatibilidade com as queries existentes
  async createSession(sessionData) {
    const sessionId = sessionData.id || this.generateUUID();
    try {
      this.db.run('INSERT INTO sessions (id, client_name) VALUES (?, ?)', 
                  sessionId, sessionData.client_name || null);
      return { id: sessionId, client_name: sessionData.client_name };
    } catch (err) {
      throw err;
    }
  }

  async getSession(sessionId) {
    try {
      const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
      
      if (row) {
        // Buscar form_state se existir
        const formState = this.db.prepare('SELECT * FROM form_states WHERE session_id = ?').get(sessionId);
        
        if (formState) {
          row.form_state = {
            data: JSON.parse(formState.data || '{}'),
            progress: JSON.parse(formState.progress || '{}')
          };
        }
      }
      
      return row;
    } catch (err) {
      throw err;
    }
  }

  async updateFormState(sessionId, data, progress = {}) {
    try {
      this.db.run('INSERT OR REPLACE INTO form_states (session_id, data, progress, updated_at) VALUES (?, ?, ?, datetime("now"))', 
                  sessionId, JSON.stringify(data), JSON.stringify(progress));
      return { session_id: sessionId };
    } catch (err) {
      throw err;
    }
  }

  async saveMessage(sessionId, role, content) {
    try {
      const stmt = this.db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)');
      const result = stmt.run(sessionId, role, content);
      return { id: result.lastInsertRowid };
    } catch (err) {
      throw err;
    }
  }

  async getMessages(sessionId) {
    try {
      const rows = this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at').all(sessionId);
      return rows || [];
    } catch (err) {
      throw err;
    }
  }

  async getAllSessions(limit = 50) {
    try {
      const rows = this.db.prepare(`
        SELECT s.*, f.data, f.progress 
        FROM sessions s 
        LEFT JOIN form_states f ON s.id = f.session_id 
        ORDER BY s.created_at DESC 
        LIMIT ?
      `).all(limit);
      
      // Formatear para compatibilidade com Supabase
      const formatted = rows.map(row => ({
        id: row.id,
        client_name: row.client_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        form_states: row.data ? [{
          data: JSON.parse(row.data || '{}'),
          progress: JSON.parse(row.progress || '{}')
        }] : []
      }));
      
      return formatted;
    } catch (err) {
      throw err;
    }
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
const localDB = new LocalDatabase();

// Funções de compatibilidade
async function initDatabase() {
  try {
    await localDB.initialize();
    console.log('✅ Database SQLite inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar SQLite:', error);
    throw error;
  }
}

async function createSession(sessionData) {
  return await localDB.createSession(sessionData);
}

async function getSession(sessionId) {
  return await localDB.getSession(sessionId);
}

async function updateFormState(sessionId, data, progress) {
  return await localDB.updateFormState(sessionId, data, progress);
}

async function saveMessage(sessionId, role, content) {
  return await localDB.saveMessage(sessionId, role, content);
}

async function getMessages(sessionId) {
  return await localDB.getMessages(sessionId);
}

async function getAllSessions(limit = 50) {
  return await localDB.getAllSessions(limit);
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