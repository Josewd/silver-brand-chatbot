const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseAdapter {
  constructor() {
    this.type = null;
    this.supabase = null;
    this.sqlite = null;
    this.initialized = false;
  }

  async initialize(supabaseClient) {
    try {
      // Tentar conectar ao Supabase primeiro
      const { data, error } = await supabaseClient.from('sessions').select('id').limit(1);
      
      if (!error) {
        console.log('✅ Usando Supabase como banco principal');
        this.type = 'supabase';
        this.supabase = supabaseClient;
      } else {
        throw new Error('Supabase não disponível');
      }
    } catch (error) {
      console.log('⚠️  Supabase indisponível, usando SQLite local como fallback');
      await this.initializeSQLite();
    }
    
    this.initialized = true;
    return this.type;
  }

  async initializeSQLite() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, '../database.sqlite');
      this.sqlite = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.type = 'sqlite';
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          client_name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createFormStatesTable = `
        CREATE TABLE IF NOT EXISTS form_states (
          session_id TEXT PRIMARY KEY,
          data TEXT NOT NULL DEFAULT '{}',
          progress TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
      `;

      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
      `;

      this.sqlite.serialize(() => {
        this.sqlite.run(createSessionsTable);
        this.sqlite.run(createFormStatesTable);
        this.sqlite.run(createMessagesTable, (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Tabelas SQLite criadas com sucesso');
            resolve();
          }
        });
      });
    });
  }

  // Método unificado para operações de sessão
  async createSession(sessionData) {
    if (this.type === 'supabase') {
      const { data, error } = await this.supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      return new Promise((resolve, reject) => {
        const stmt = this.sqlite.prepare(`
          INSERT INTO sessions (id, client_name, created_at, updated_at) 
          VALUES (?, ?, datetime('now'), datetime('now'))
        `);
        
        stmt.run(sessionData.id, sessionData.client_name, function(err) {
          if (err) reject(err);
          else resolve({ id: sessionData.id, client_name: sessionData.client_name });
        });
        
        stmt.finalize();
      });
    }
  }

  async getSession(sessionId) {
    if (this.type === 'supabase') {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data;
    } else {
      return new Promise((resolve, reject) => {
        this.sqlite.get(
          'SELECT * FROM sessions WHERE id = ?',
          [sessionId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }
  }

  async getAllSessions(limit = 50) {
    if (this.type === 'supabase') {
      const { data, error } = await this.supabase
        .from('sessions')
        .select(`*, form_states(*)`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    } else {
      return new Promise((resolve, reject) => {
        this.sqlite.all(
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
  }

  async saveFormState(sessionId, data, progress = {}) {
    if (this.type === 'supabase') {
      const { data: result, error } = await this.supabase
        .from('form_states')
        .upsert({
          session_id: sessionId,
          data: data,
          progress: progress
        });
      
      if (error) throw error;
      return result;
    } else {
      return new Promise((resolve, reject) => {
        const stmt = this.sqlite.prepare(`
          INSERT OR REPLACE INTO form_states (session_id, data, progress, updated_at) 
          VALUES (?, ?, ?, datetime('now'))
        `);
        
        stmt.run(sessionId, JSON.stringify(data), JSON.stringify(progress), function(err) {
          if (err) reject(err);
          else resolve({ session_id: sessionId });
        });
        
        stmt.finalize();
      });
    }
  }

  async saveMessage(sessionId, role, content) {
    if (this.type === 'supabase') {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({ session_id: sessionId, role, content });
      
      if (error) throw error;
      return data;
    } else {
      return new Promise((resolve, reject) => {
        const stmt = this.sqlite.prepare(`
          INSERT INTO messages (session_id, role, content, created_at) 
          VALUES (?, ?, ?, datetime('now'))
        `);
        
        stmt.run(sessionId, role, content, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        });
        
        stmt.finalize();
      });
    }
  }
}

module.exports = new DatabaseAdapter();