#!/usr/bin/env node

// Teste da configuração hardcoded para produção
process.env.NODE_ENV = 'production';

const { Pool } = require('pg');

console.log('🧪 Testando configuração hardcoded para produção...\n');

// Simular a configuração hardcoded que vai para produção
const poolConfig = {
  user: 'postgres',
  password: 'ezivL8MIDMpHA6aQ',
  host: 'db.dkuhctiznnwalyptlkhu.supabase.co',
  port: 5432, // Porta gratuita
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  family: 4, // FORÇA IPv4 - CRÍTICO para resolver ENETUNREACH
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'silver-brand-chatbot'
};

console.log('🔧 Configuração que será usada em produção:');
console.log('   Host:', poolConfig.host);
console.log('   Port: 5432 (gratuita)');
console.log('   Family: IPv4 forçado para resolver ENETUNREACH');
console.log('   SSL:', 'habilitado');
console.log('   Timeouts:', 'configurados\n');

async function testProductionConfig() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('⏳ Testando conexão hardcoded...');
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query executada:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Configuração hardcoded funciona perfeitamente!');
    console.log('💡 O deploy vai resolver o erro ENETUNREACH');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('💡 Código:', error.code);
    await pool.end().catch(() => {});
  }
}

testProductionConfig();