const { Pool } = require('pg')

// Configuração do pool de conexões PostgreSQL
class DatabaseClient {
  constructor() {
    // Priorizar SUPABASE_URL, fallback para DATABASE_URL, e depois localhost
    let connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL
    
    console.log('🔧 Configurando conexão PostgreSQL...')
    console.log('🔗 Connection string configurada:', connectionString ? 'SIM' : 'NÃO')
    console.log('📊 Environment:', process.env.NODE_ENV)
    console.log('🌐 Connection string (mascarada):', connectionString ? connectionString.replace(/:\/\/.*@/, '://***@') : 'NONE')
    console.log('🔍 SUPABASE_URL env:', process.env.SUPABASE_URL ? 'PRESENTE' : 'AUSENTE')
    console.log('🔍 DATABASE_URL env:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE')
    console.log('📏 Tamanho da string:', connectionString ? connectionString.length : 0)
    
    if (!connectionString) {
      console.error('❌ ERRO: Nenhuma string de conexão encontrada!')
      console.error('💡 Configure SUPABASE_URL ou DATABASE_URL')
      throw new Error('Database connection string not found')
    }

    // Verificar se a string parece truncada
    if (connectionString.length < 50 || !connectionString.includes('@')) {
      console.error('❌ ERRO: String de conexão parece truncada ou inválida')
      console.error('📏 Tamanho:', connectionString.length)
      console.error('📄 Conteúdo:', connectionString)
      
      // Tentar reconstruir URL se parecer supabase truncado
      if (connectionString.includes('base') && !connectionString.includes('.supabase.co')) {
        console.log('🔄 Tentando reconstruir URL do Supabase...')
        connectionString = `postgresql://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:6543/postgres`
        console.log('🔧 URL reconstruída:', connectionString.replace(/:\/\/.*@/, '://***@'))
      }
    }

    // Configurações específicas para Supabase
    if (connectionString.includes('.supabase.co')) {
      console.log('🟣 Detectado Supabase, ajustando configurações...')
      // Se usar porta 5432, sugerir porta de pooling 6543
      if (connectionString.includes(':5432/')) {
        console.warn('⚠️ Recomendado usar porta 6543 (pooling) ao invés de 5432 para Supabase')
      }
    }
    
    // Se o endereço contém IPv6 problemático, tentar fallback
    if (connectionString.includes('2a05:d018:837')) {
      console.warn('⚠️ Detectado endereço IPv6 problemático, tentando configuração alternativa...')
      // Tentar usar localhost como fallback em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        connectionString = 'postgresql://postgres:postgres123@localhost:5432/silver_brand'
        console.log('🔄 Usando fallback localhost')
      }
    }
    
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Máximo de conexões no pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Aumentado para Supabase
      // Forçar IPv4 para evitar problemas com IPv6
      family: 4,
      // Configurações específicas para Supabase
      ...(connectionString.includes('.supabase.co') && {
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'silver-brand-chatbot'
      })
    })

    // Log de conexão
    this.pool.on('connect', () => {
      console.log('📊 Conectado ao banco PostgreSQL')
    })

    this.pool.on('error', (err) => {
      console.error('❌ Erro na conexão com banco:', err)
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
           fs.progress
    FROM sessions s
    LEFT JOIN form_states fs ON s.id = fs.session_id
    ORDER BY s.created_at DESC
  `
}

module.exports = {
  dbClient,
  queries
}