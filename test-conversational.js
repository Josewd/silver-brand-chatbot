// Teste do novo comportamento conversacional
const { aiClient } = require('./backend/src/ai/aiClient')

async function testConversationalBehavior() {
  console.log('🧪 Testando comportamento conversacional...')
  
  const mockField = {
    id: 'sobre_empresa',
    label: 'Sobre a empresa',
    type: 'textarea',
    ai_help: true
  }
  
  const mockFormData = {
    company_name: 'TechCorp'
  }
  
  const mockSchema = {
    sections: [{
      id: 'basics',
      fields: [mockField]
    }]
  }
  
  // Teste 1: Primeira mensagem (deve apenas conversar)
  console.log('\n=== TESTE 1: PRIMEIRA MENSAGEM ===')
  try {
    const result1 = await aiClient.processFieldHelp({
      field: mockField,
      formData: mockFormData,
      schema: mockSchema,
      helpHistory: [], // Sem histórico
      userMessage: 'Entendi! Continue me contando mais detalhes.'
    })
    
    console.log('✅ Primeira mensagem:')
    console.log('Resposta:', result1.reply)
    console.log('Rascunho proposto:', result1.draft ? 'SIM' : 'NÃO')
    
    // Teste 2: Segunda mensagem (ainda conversando)
    console.log('\n=== TESTE 2: SEGUNDA MENSAGEM ===')
    const mockHistory = [
      { role: 'user', content: 'Entendi! Continue me contando mais detalhes.' },
      { role: 'assistant', content: 'Ótimo! Para criar uma apresentação impactante, preciso saber mais sobre vocês...' }
    ]
    
    const result2 = await aiClient.processFieldHelp({
      field: mockField,
      formData: mockFormData,
      schema: mockSchema,
      helpHistory: mockHistory,
      userMessage: 'Somos uma empresa de tecnologia que desenvolve apps móveis para pequenas empresas.'
    })
    
    console.log('✅ Segunda mensagem:')
    console.log('Resposta:', result2.reply?.substring(0, 100) + '...')
    console.log('Rascunho proposto:', result2.draft ? 'SIM' : 'NÃO')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

testConversationalBehavior()