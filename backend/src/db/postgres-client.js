const { Pool } = require('pg')

// Conexão simples via Neon (Postgres serverless).
// Usa DATABASE_URL (connection string "pooled", com pgbouncer) - é a
// recomendada para uso em backend/serverless, evita esgotar conexões.
class DatabaseClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL não configurada. Defina a connection string do Neon no .env')
    }

    console.log('🔧 Configurando conexão PostgreSQL (Neon)...')

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      application_name: 'silver-brand-chatbot'
    })

    this.pool.on('error', (err) => {
      console.error('❌ Erro no pool de conexões PostgreSQL:', err)
    })
  }

  // Método para executar queries
  async query(text, params) {
    const start = Date.now()
    try {
      const res = await this.pool.query(text, params)
      const duration = Date.now() - start
      console.log('🔍 Query executada', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount })
      return res
    } catch (err) {
      console.error('❌ Erro na query:', err)
      throw err
    }
  }

  // Método para transações
  async transaction(callback) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  // Fechar conexões
  async close() {
    await this.pool.end()
    console.log('📊 Pool de conexões fechado')
  }
}

// Instância singleton
const dbClient = new DatabaseClient()

// Queries específicas para o sistema
const queries = {
  // Sessões
  createSession: `
    INSERT INTO sessions (created_by)
    VALUES ($1)
    RETURNING id, client_token, status, created_at
  `,

  getSessionByToken: `
    SELECT s.*, fs.data, fs.progress
    FROM sessions s
    LEFT JOIN form_states fs ON s.id = fs.session_id
    WHERE s.client_token = $1
  `,

  getSessionById: `
    SELECT s.*, fs.data, fs.progress
    FROM sessions s
    LEFT JOIN form_states fs ON s.id = fs.session_id
    WHERE s.id = $1
  `,

  updateSessionStatus: `
    UPDATE sessions
    SET status = $2, updated_at = NOW()
    WHERE id = $1
  `,

  // Form States
  upsertFormState: `
    INSERT INTO form_states (session_id, data, progress)
    VALUES ($1, $2, $3)
    ON CONFLICT (session_id)
    DO UPDATE SET
      data = $2,
      progress = $3,
      updated_at = NOW()
    RETURNING *
  `,

  updateFieldValue: `
    INSERT INTO form_states (session_id, data, progress)
    VALUES ($1, jsonb_build_object($2::text, $3::text), '{}')
    ON CONFLICT (session_id)
    DO UPDATE SET
      data = form_states.data || jsonb_build_object($2::text, $3::text),
      updated_at = NOW()
    RETURNING data, progress
  `,

  // Field Help Messages
  addHelpMessage: `
    INSERT INTO field_help_messages (session_id, field_id, role, content, tool_call_data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,

  getHelpMessages: `
    SELECT role, content, tool_call_data, created_at
    FROM field_help_messages
    WHERE session_id = $1 AND field_id = $2
    ORDER BY created_at ASC
  `,

  // Admin queries
  getAllSessions: `
    SELECT s.id, s.client_token, s.status, s.created_by, s.created_at,
           fs.data, fs.progress
    FROM sessions s
    LEFT JOIN form_states fs ON s.id = fs.session_id
    ORDER BY s.created_at DESC
  `
}

module.exports = {
  dbClient,
  queries
}
