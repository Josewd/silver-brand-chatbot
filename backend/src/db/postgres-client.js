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
    
    // Verificar se temos variáveis individuais como alternativa
    const hasIndividualVars = process.env.DB_HOST && process.env.DB_PASSWORD;
    console.log('🔍 Variáveis individuais disponíveis:', hasIndividualVars ? 'SIM' : 'NÃO')
    
    if (!connectionString && !hasIndividualVars) {
      console.error('❌ ERRO: Nenhuma configuração de banco encontrada!')
      console.error('💡 Configure SUPABASE_URL, DATABASE_URL ou variáveis individuais (DB_HOST, DB_PASSWORD, etc.)')
      throw new Error('Database connection configuration not found')
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
    
    // Tentar usar parâmetros individuais se detectar problema com connection string
    let poolConfig;
    
    try {
      // Se temos variáveis individuais, usar elas diretamente
      if (hasIndividualVars) {
        console.log('🔧 Usando variáveis de ambiente individuais...')
        poolConfig = {
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'postgres',
          ssl: { rejectUnauthorized: false },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          family: 4,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'silver-brand-chatbot'
        };
        
        console.log('🔍 Configuração de variáveis individuais:');
        console.log('   Host:', poolConfig.host);
        console.log('   Port:', poolConfig.port);
        console.log('   User:', poolConfig.user);
        console.log('   Database:', poolConfig.database);
        
      } else if (connectionString.includes('.supabase.co') || process.env.NODE_ENV === 'production') {
        console.log('🔧 Usando configuração individual para Supabase/Produção...')
        
        // Parse manual da URL para evitar problemas com connection string
        const url = new URL(connectionString);
        poolConfig = {
          user: url.username || 'postgres',
          password: url.password,
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          database: url.pathname.slice(1) || 'postgres', // Remove a barra inicial
          ssl: { rejectUnauthorized: false },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          family: 4,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'silver-brand-chatbot'
        };
        
        console.log('🔍 Configuração parseada:');
        console.log('   Host:', poolConfig.host);
        console.log('   Port:', poolConfig.port);
        console.log('   User:', poolConfig.user);
        console.log('   Database:', poolConfig.database);
        console.log('   Password:', poolConfig.password ? '[PRESENTE]' : '[AUSENTE]');
        
      } else {
        console.log('🔧 Usando connection string tradicional...')
        poolConfig = {
          connectionString,
          ssl: false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          family: 4
        };
      }
    } catch (error) {
      console.error('❌ Erro ao fazer parse da URL:', error.message);
      console.log('🔄 Usando fallback hardcoded para Supabase...');
      
      // Fallback hardcoded para o seu projeto específico
      poolConfig = {
        user: 'postgres',
        password: 'ezivL8MIDMpHA6aQ',
        host: 'db.dkuhctiznnwalyptlkhu.supabase.co',
        port: 6543, // Usar pooling
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        family: 4,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'silver-brand-chatbot'
      };
      
      console.log('✅ Fallback configurado com host:', poolConfig.host);
    }
    
    this.pool = new Pool(poolConfig)

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