#!/usr/bin/env node

// Script de verificação de ambiente para debugging
console.log('🔍 VERIFICAÇÃO DE AMBIENTE RENDER')
console.log('=====================================')

// Verificar variáveis críticas
const criticalVars = [
  'SUPABASE_URL',
  'DATABASE_URL', 
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'ADMIN_API_KEY',
  'AI_PROVIDER',
  'NODE_ENV',
  'PORT'
]

criticalVars.forEach(varName => {
  const value = process.env[varName]
  const status = value ? '✅' : '❌'
  const preview = value ? `${value.substring(0, 20)}...` : 'NOT SET'
  console.log(`${status} ${varName}: ${preview}`)
})

console.log('=====================================')

// Tentar conexão com banco
if (process.env.SUPABASE_URL) {
  console.log('🔗 Testando conexão com Supabase...')
  
  const { Pool } = require('pg')
  const pool = new Pool({
    connectionString: process.env.SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  pool.query('SELECT NOW() as current_time')
    .then(result => {
      console.log('✅ Conexão Supabase OK:', result.rows[0].current_time)
      process.exit(0)
    })
    .catch(err => {
      console.error('❌ Erro conexão Supabase:', err.message)
      process.exit(1)
    })
} else {
  console.log('❌ SUPABASE_URL não configurado')
  process.exit(1)
}