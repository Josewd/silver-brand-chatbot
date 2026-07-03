const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class LocalDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('🗄️ Usando SQLite como banco de dados local');
          await this.createTables();
          this.initialized = true;
          resolve();
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
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

      let completed = 0;
      tables.forEach((sql, index) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error(`❌ Erro ao criar tabela ${index}:`, err);
            reject(err);
          } else {
            completed++;
            if (completed === tables.length) {
              console.log('✅ Tabelas SQLite criadas com sucesso');
              this.insertTestData().then(resolve).catch(reject);
            }
          }
        });
      });
    });
  }

  async insertTestData() {
    return new Promise((resolve) => {
      const testSessionId = '550e8400-e29b-41d4-a716-446655440001';
      
      this.db.run(
        'INSERT OR IGNORE INTO sessions (id, client_name) VALUES (?, ?)',
        [testSessionId, 'Cliente Teste'],
        () => {
          this.db.run(
            'INSERT OR REPLACE INTO form_states (session_id, data, progress) VALUES (?, ?, ?)',
            [testSessionId, JSON.stringify({nome: 'João Teste', email: 'joao@teste.com'}), JSON.stringify({})],
            () => {
              console.log('✅ Dados de teste inseridos');
              resolve();
            }
          );
        }
      );
    });
  }

  // Wrappers para manter compatibilidade com as queries existentes
  async createSession(sessionData) {
    const sessionId = sessionData.id || this.generateUUID();
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO sessions (id, client_name) VALUES (?, ?)',
        [sessionId, sessionData.client_name || null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: sessionId, client_name: sessionData.client_name });
        }
      );
    });
  }

  async getSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            // Buscar form_state se existir
            this.db.get(
              'SELECT * FROM form_states WHERE session_id = ?',
              [sessionId],
              (err2, formState) => {
                if (!err2 && formState) {
                  row.form_state = {
                    data: JSON.parse(formState.data || '{}'),
                    progress: JSON.parse(formState.progress || '{}')
                  };
                } else {
                  // Se não tem form_state, criar estrutura vazia
                  row.form_state = {
                    data: {},
                    progress: {}
                  };
                }
                console.log('🗄️ Sessão carregada:', {
                  id: sessionId,
                  hasData: !!formState,
                  dataKeys: Object.keys(row.form_state.data)
                });
                resolve(row);
              }
            );
          } else {
            console.log('❌ Sessão não encontrada:', sessionId);
            resolve(null);
          }
        }
      );
    });
  }

  async updateFormState(sessionId, data, progress = {}) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO form_states (session_id, data, progress, updated_at) VALUES (?, ?, ?, datetime("now"))',
        [sessionId, JSON.stringify(data), JSON.stringify(progress)],
        function(err) {
          if (err) reject(err);
          else resolve({ session_id: sessionId });
        }
      );
    });
  }

  async saveMessage(sessionId, role, content) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
        [sessionId, role, content],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  async getMessages(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at',
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getAllSessions(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, f.data, f.progress 
         FROM sessions s 
         LEFT JOIN form_states f ON s.id = f.session_id 
         ORDER BY s.created_at DESC 
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else {
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
            resolve(formatted);
          }
        }
      );
    });
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