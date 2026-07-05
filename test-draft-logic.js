// Teste da lógica conservadora de rascunhos
const { aiClient } = require('./backend/src/ai/aiClient')

function testDraftLogic() {
  console.log('🧪 Testando lógica de rascunhos conservadora...')
  
  // Cenário 1: Apenas 1 mensagem no histórico
  const scenario1 = [
    { role: 'user', content: 'Me ajude com diferencial da concorrência' }
  ]
  
  const result1 = aiClient.shouldProposeDraft(scenario1, 'Nossa empresa faz software sob medida')
  console.log('\n=== CENÁRIO 1: Apenas 1 mensagem do usuário ===')
  console.log('Histórico:', scenario1.length, 'mensagens')
  console.log('Deve propor rascunho:', result1 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: NÃO')
  
  // Cenário 2: 2 mensagens do usuário, 4 total
  const scenario2 = [
    { role: 'user', content: 'Me ajude com diferencial' },
    { role: 'assistant', content: 'Claro! Me conte sobre sua empresa...' },
    { role: 'user', content: 'Fazemos software personalizado para pequenas empresas' },
    { role: 'assistant', content: 'Interessante! Qual é seu principal diferencial técnico?' }
  ]
  
  const result2 = aiClient.shouldProposeDraft(scenario2, 'Usamos metodologia ágil e entregamos em 30 dias')
  console.log('\n=== CENÁRIO 2: 2 mensagens usuário, conversa substancial ===')
  console.log('Histórico:', scenario2.length, 'mensagens')
  console.log('Mensagens do usuário:', scenario2.filter(m => m.role === 'user').length)
  console.log('Deve propor rascunho:', result2 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: SIM')
  
  // Cenário 3: Pedido explícito mesmo com pouco histórico
  const scenario3 = [
    { role: 'user', content: 'Me ajude com diferencial' }
  ]
  
  const result3 = aiClient.shouldProposeDraft(scenario3, 'Por favor, pode criar uma versão final agora?')
  console.log('\n=== CENÁRIO 3: Pedido explícito ===')
  console.log('Histórico:', scenario3.length, 'mensagens')
  console.log('Mensagem com pedido explícito:', 'SIM')
  console.log('Deve propor rascunho:', result3 ? 'SIM' : 'NÃO')
  console.log('✅ Esperado: SIM')
}

testDraftLogic()