#!/usr/bin/env node

// Script para testar conexão com o banco de dados
// Usage: node test-db-connection.js "postgresql://postgres:senha@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres"

const { Pool } = require('pg');

async function testConnection(connectionString) {
  if (!connectionString) {
    console.error('❌ Forneça a connection string como argumento');
    console.log('Uso: node test-db-connection.js "postgresql://user:pass@host:port/db"');
    process.exit(1);
  }

  console.log('🔍 Testando conexão com banco de dados...');
  console.log('🔗 Host:', connectionString.split('@')[1]?.split(':')[0] || 'N/A');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    family: 4 // Forçar IPv4
  });

  try {
    // Testar conexão
    console.log('⏳ Conectando...');
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar query simples
    console.log('⏳ Testando query...');
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('✅ Query executada com sucesso!');
    console.log('⏰ Tempo do servidor:', result.rows[0].current_time);
    console.log('📊 Versão PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Verificar se as tabelas existem
    console.log('⏳ Verificando tabelas...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sessions', 'form_states', 'field_help_messages')
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ Tabelas encontradas:', tables.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('⚠️ Nenhuma tabela do projeto encontrada. Execute o schema.sql primeiro.');
    }
    
    client.release();
    await pool.end();
    
    console.log('🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('🔍 Código do erro:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Host não encontrado. Verifique a URL.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Conexão recusada. Verifique se o servidor está ativo.');
    } else if (error.code === 'ENETUNREACH') {
      console.error('💡 Rede não alcançável. Problema de IPv6/conectividade.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 Senha incorreta.');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('💡 Banco de dados não existe.');
    }
    
    process.exit(1);
  }
}

// Pegar connection string do argumento ou variável de ambiente
const connectionString = process.argv[2] || process.env.SUPABASE_URL;
testConnection(connectionString);