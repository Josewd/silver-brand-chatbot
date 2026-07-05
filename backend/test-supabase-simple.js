#!/usr/bin/env node

// Script para testar conexão com Supabase
const { Pool } = require('pg');

async function testConnection(password) {
  if (!password) {
    console.error('❌ Forneça a senha como variável de ambiente ou argumento:');
    console.log('   SUPABASE_PASSWORD=sua_senha node test-supabase.js');
    console.log('   ou');
    console.log('   node test-supabase.js sua_senha');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres:${password}@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres`;
  
  console.log('🔍 Testando conexão com Supabase...');
  console.log('🔗 Host: db.dkuhctiznnwalyptlkhu.supabase.co');
  console.log('🔌 Porta: 5432 (conexão direta)');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    family: 4 // Forçar IPv4
  });

  try {
    // Testar conexão
    console.log('⏳ Estabelecendo conexão...');
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar query simples
    console.log('⏳ Executando query de teste...');
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('✅ Query executada com sucesso!');
    console.log('⏰ Tempo do servidor:', result.rows[0].current_time);
    console.log('📊 PostgreSQL:', result.rows[0].version.split(' ')[1]);
    
    // Verificar se as tabelas existem
    console.log('⏳ Verificando estrutura do banco...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas encontradas:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        const isProjectTable = ['sessions', 'form_states', 'field_help_messages'].includes(row.table_name);
        console.log(`   ${isProjectTable ? '✅' : '📄'} ${row.table_name}`);
      });
    } else {
      console.log('   (nenhuma tabela encontrada)');
    }
    
    // Verificar tabelas específicas do projeto
    const projectTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sessions', 'form_states', 'field_help_messages')
    `);
    
    if (projectTables.rows.length === 3) {
      console.log('🎉 Todas as tabelas do projeto estão presentes!');
      
      // Testar uma query nas tabelas
      const sessionCount = await client.query('SELECT COUNT(*) as count FROM sessions');
      console.log(`📊 Sessões cadastradas: ${sessionCount.rows[0].count}`);
      
    } else if (projectTables.rows.length > 0) {
      console.log(`⚠️ Apenas ${projectTables.rows.length}/3 tabelas do projeto encontradas.`);
      console.log('💡 Execute o schema.sql para criar as tabelas faltantes.');
    } else {
      console.log('❌ Nenhuma tabela do projeto encontrada.');
      console.log('💡 Execute o schema.sql para criar as tabelas.');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📝 Para usar no Render, configure:');
    console.log(`   SUPABASE_URL=postgresql://postgres:${password}@db.dkuhctiznnwalyptlkhu.supabase.co:5432/postgres`);
    console.log('\n💡 Recomendado para produção (pooling):');
    console.log(`   SUPABASE_URL=postgresql://postgres:${password}@db.dkuhctiznnwalyptlkhu.supabase.co:6543/postgres`);
    
  } catch (error) {
    console.error('\n❌ Erro na conexão:', error.message);
    console.error('🔍 Código do erro:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Host não encontrado. Verifique se o projeto Supabase está ativo.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Conexão recusada. Verifique se o projeto não está pausado.');
    } else if (error.code === 'ENETUNREACH') {
      console.error('💡 Rede não alcançável. Problema de conectividade/IPv6.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 Senha incorreta. Verifique a senha no dashboard do Supabase.');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('💡 Banco de dados não existe.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Timeout de conexão. O projeto pode estar pausado.');
    }
    
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

// Obter senha do argumento ou variável de ambiente
const password = process.argv[2] || process.env.SUPABASE_PASSWORD;
testConnection(password);