// Teste da nova lógica assertiva de rascunhos
const { aiClient } = require('./backend/src/ai/aiClient')

function testAssertiveDraftLogic() {
  console.log('🧪 Testando lógica assertiva de rascunhos...')
  
  // Cenário 1: Primeira mensagem - deve apenas conversar
  const scenario1 = []
  const result1 = aiClient.shouldProposeDraft(scenario1, 'Me ajude com a missão da empresa')
  console.log('\n=== CENÁRIO 1: Primeira mensagem ===')
  console.log('Histórico:', scenario1.length, 'mensagens')
  console.log('Deve propor rascunho:', result1 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: NÃO (apenas conversar)')
  
  // Cenário 2: Uma mensagem do usuário - deve continuar conversando
  const scenario2 = [
    { role: 'user', content: 'Me ajude com a missão' }
  ]
  const result2 = aiClient.shouldProposeDraft(scenario2, 'Nossa empresa desenvolve apps')
  console.log('\n=== CENÁRIO 2: Uma mensagem do usuário ===')
  console.log('Histórico:', scenario2.length, 'mensagens')
  console.log('Mensagens do usuário:', scenario2.filter(m => m.role === 'user').length)
  console.log('Deve propor rascunho:', result2 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: NÃO (ainda conversando)')
  
  // Cenário 3: Duas mensagens do usuário - DEVE propor rascunho
  const scenario3 = [
    { role: 'user', content: 'Me ajude com a missão' },
    { role: 'assistant', content: 'Claro! Me conta sobre sua empresa...' },
    { role: 'user', content: 'Fazemos apps para pequenas empresas' }
  ]
  const result3 = aiClient.shouldProposeDraft(scenario3, 'Nosso foco é facilitar a gestão')
  console.log('\n=== CENÁRIO 3: Duas mensagens do usuário ===')
  console.log('Histórico:', scenario3.length, 'mensagens') 
  console.log('Mensagens do usuário:', scenario3.filter(m => m.role === 'user').length)
  console.log('Deve propor rascunho:', result3 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: SIM (forçar rascunho)')
  
  // Cenário 4: Três mensagens do usuário - SEMPRE propor rascunho
  const scenario4 = [
    { role: 'user', content: 'Me ajude com a missão' },
    { role: 'assistant', content: 'Claro! Me conta sobre sua empresa...' },
    { role: 'user', content: 'Fazemos apps para PMEs' },
    { role: 'assistant', content: 'Perfeito! Mais algum detalhe?' },
    { role: 'user', content: 'Foco em produtividade e automação' }
  ]
  const result4 = aiClient.shouldProposeDraft(scenario4, 'Esse é nosso diferencial')
  console.log('\n=== CENÁRIO 4: Três mensagens do usuário ===')
  console.log('Histórico:', scenario4.length, 'mensagens')
  console.log('Mensagens do usuário:', scenario4.filter(m => m.role === 'user').length)
  console.log('Deve propor rascunho:', result4 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: SIM (definitivamente)')
}

testAssertiveDraftLogic()