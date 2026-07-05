const { Pool } = require('pg')
const dns = require('dns')

// Configuração do pool de conexões PostgreSQL
class DatabaseClient {
  constructor() {
    console.log('🔧 Configurando conexão PostgreSQL...')
    console.log('📊 Environment:', process.env.NODE_ENV)
    
    // Verificar se temos uma URL específica do Render (fallback)
    if (process.env.RENDER_DATABASE_URL) {
      console.log('🎯 RENDER_DATABASE_URL detectada, usando configuração específica')
      this.initializeRenderConnection()
      return
    }
    
    // FORÇA CONFIGURAÇÃO DIRETA PARA SUPABASE EM PRODUÇÃO
    if (process.env.NODE_ENV === 'production') {
      this.initializeProductionConnection()
      return
    }
    
    // Usar método de desenvolvimento
    this.initializeDevelopmentConnection()
  }

  // Método específico para conexões via RENDER_DATABASE_URL
  async initializeRenderConnection() {
    console.log('🎯 Usando RENDER_DATABASE_URL específica')
    
    const poolConfig = {
      connectionString: process.env.RENDER_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
      statement_timeout: 30000,
      query_timeout: 30000,
      application_name: 'silver-brand-chatbot'
    }
    
    console.log('✅ Configuração RENDER_DATABASE_URL ativa')
    
    this.pool = new Pool(poolConfig)
    
    // Event listeners
    this.pool.on('connect', () => {
      console.log('📊 Conectado via RENDER_DATABASE_URL')
    })

    this.pool.on('error', (err) => {
      console.error('❌ Erro na conexão RENDER_DATABASE_URL:', err)
    })
  }

  // Método específico para inicialização em produção com fallbacks
  async initializeProductionConnection() {
    console.log('🚀 PRODUÇÃO DETECTADA - Testando conectividade Supabase')
    
    // Configuração base otimizada para Render + Supabase
    const baseConfig = {
      user: 'postgres',
      password: 'ezivL8MIDMpHA6aQ',
      host: 'db.dkuhctiznnwalyptlkhu.supabase.co',
      port: 5432,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 8, // Otimizado para free tier
      idleTimeoutMillis: 45000,
      connectionTimeoutMillis: 25000, // Render-friendly timeout
      statement_timeout: 40000,
      query_timeout: 40000,
      application_name: 'silver-brand-chatbot'
    }
    
    console.log('🔧 Configuração base:')
    console.log('   Host:', baseConfig.host)
    console.log('   Port: 5432 (gratuita)')
    console.log('   Provider: Render.com')
    
    try {
      // Tentativa 1: Configuração padrão (deixa o sistema resolver DNS automaticamente)
      console.log('🔄 Tentativa 1: Resolução automática DNS...')
      await this.tryConnection(baseConfig, 'DNS automático')
      
    } catch (error1) {
      console.log('❌ Falha DNS automático, tentando com connection string...')
      
      try {
        // Tentativa 2: Connection string com SSL otimizado para Render
        console.log('🔄 Tentativa 2: Connection string SSL...')
        const connectionString = `postgresql://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres?sslmode=verify-full`
        
        await this.tryConnection({
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 5,
          idleTimeoutMillis: 45000,
          connectionTimeoutMillis: 30000
        }, 'Connection string SSL')
        
      } catch (error2) {
        console.log('❌ Falha SSL, tentando com configurações conservadoras...')
        
        try {
          // Tentativa 3: Configuração ultra-conservadora para Render
          console.log('🔄 Tentativa 3: Configuração conservadora...')
          await this.tryConnection({
            ...baseConfig,
            max: 3, // Muito conservador
            connectionTimeoutMillis: 35000, // Timeout longo
            idleTimeoutMillis: 60000,
            ssl: { 
              rejectUnauthorized: false,
              checkServerIdentity: () => undefined // Bypass SSL checks
            }
          }, 'Configuração conservadora')
          
        } catch (error3) {
          console.log('❌ Render connectivity issue detected, tentando último recurso...')
          
          try {
            // Tentativa 4: Connection string simples (último recurso)
            console.log('🔄 Tentativa 4: Último recurso...')
            const fallbackString = `postgres://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres`
            
            await this.tryConnection({
              connectionString: fallbackString,
              ssl: false, // Sem SSL como último recurso (não recomendado mas funcional)
              max: 2,
              connectionTimeoutMillis: 40000
            }, 'Último recurso')
            
            console.warn('⚠️ CONECTADO SEM SSL - Não é seguro para produção!')
            
          } catch (error4) {
            console.error('💥 TODAS AS TENTATIVAS FALHARAM - PROBLEMA DE CONECTIVIDADE RENDER+SUPABASE')
            console.error('Erro 1 (DNS auto):', error1.message)
            console.error('Erro 2 (SSL string):', error2.message) 
            console.error('Erro 3 (conservador):', error3.message)
            console.error('Erro 4 (último recurso):', error4.message)
            
            console.error('🔍 Possíveis causas:')
            console.error('   - Render não tem conectividade IPv6 com Supabase')
            console.error('   - Firewall bloqueando conexões do Render')
            console.error('   - Necessário IPv4 add-on no Supabase (pago)')
            console.error('   - Problema temporário de rede')
            
            // Sugerir usar variáveis de ambiente para connection string alternativa
            console.error('💡 Solução: Configure RENDER_DATABASE_URL nas variáveis de ambiente')
            
            throw new Error('Render-Supabase connectivity failed - try IPv4 add-on or alternative DB')
          }
        }
      }
    }
  }

  // Método auxiliar para tentar conexão
  async tryConnection(config, description) {
    console.log(`🔄 Tentando conexão ${description}...`)
    console.log('   Host:', config.host)
    console.log('   Port:', config.port)
    
    this.pool = new Pool(config)
    
    // Teste de conexão
    const testClient = await this.pool.connect()
    await testClient.query('SELECT 1')
    testClient.release()
    
    console.log(`✅ Sucesso com ${description}!`)
    
    // Configurar event listeners
    this.pool.on('connect', () => {
      console.log(`📊 Conectado ao banco PostgreSQL (${description})`)
    })

    this.pool.on('error', (err) => {
      console.error('❌ Erro na conexão com banco:', err)
    })
  }

  // Inicialização para ambiente de desenvolvimento
  initializeDevelopmentConnection() {
    
    // CÓDIGO ORIGINAL PARA DESENVOLVIMENTO
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
        connectionString = `postgresql://postgres:ezivL8MIDMpHA6aQ@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres`
        console.log('🔧 URL reconstruída:', connectionString.replace(/:\/\/.*@/, '://***@'))
      }
    }

    // Configurações específicas para Supabase
    if (connectionString.includes('.supabase.co')) {
      console.log('🟣 Detectado Supabase, ajustando configurações...')
      // Detectado Supabase - usando porta 5432 gratuita
      if (connectionString.includes(':5432/')) {
        console.log('✅ Usando porta 5432 gratuita do Supabase')
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
          connectionTimeoutMillis: 5000
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
        port: 5432, // Usar porta gratuita
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
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