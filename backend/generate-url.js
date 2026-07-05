#!/usr/bin/env node

// Script para gerar URLs de conexão válidas
const password = 'ezivL8MIDMpHA6aQ';
const host = 'db.dkuhctiznnwalyptlkhu.supabase.co';

console.log('🔧 URLs de conexão para o Supabase:\n');

// URL básica (porta 5432)
const basicUrl = `postgresql://postgres:${password}@${host}:5432/postgres`;
console.log('📝 Conexão direta (porta 5432):');
console.log(basicUrl);

// URL com pooling (porta 6543) - RECOMENDADA
const poolingUrl = `postgresql://postgres:${password}@${host}:6543/postgres`;
console.log('\n💡 Com pooling (porta 6543) - RECOMENDADA:');
console.log(poolingUrl);

// URL com encoding para caracteres especiais (caso necessário)
const encodedPassword = encodeURIComponent(password);
const encodedUrl = `postgresql://postgres:${encodedPassword}@${host}:6543/postgres`;
console.log('\n🔒 Com password encoded (se der problema):');
console.log(encodedUrl);

// Teste da URL
console.log('\n🔍 Verificando formato da URL...');
try {
  const url = new URL(poolingUrl);
  console.log('✅ URL válida!');
  console.log('   Host:', url.hostname);
  console.log('   Porta:', url.port);
  console.log('   Usuário:', url.username);
  console.log('   Senha:', url.password ? '[PRESENTE]' : '[AUSENTE]');
} catch (error) {
  console.log('❌ URL inválida:', error.message);
}

console.log('\n📋 Para configurar no Render:');
console.log('1. Copie a URL "Com pooling" acima');
console.log('2. No Render, vá em Environment Variables'); 
console.log('3. Edite SUPABASE_URL');
console.log('4. Cole a URL completa');
console.log('5. Salve e redeploy');