// Teste do novo modelo Groq
const { aiClient } = require('./backend/src/ai/aiClient')

async function testGroqModel() {
  console.log('🧪 Testando novo modelo Groq...')
  
  // Simular um campo e dados para teste
  const mockField = {
    id: 'mission',
    label: 'Missão da empresa',
    type: 'textarea',
    ai_help: true
  }
  
  const mockFormData = {
    company_name: 'TechCorp',
    industry: 'tecnologia'
  }
  
  const mockSchema = {
    sections: [{
      id: 'basics',
      fields: [mockField]
    }]
  }
  
  try {
    const result = await aiClient.processFieldHelp({
      field: mockField,
      formData: mockFormData,
      schema: mockSchema,
      helpHistory: [],
      userMessage: 'Nossa empresa desenvolve software. Como posso melhorar nossa missão?'
    })
    
    console.log('✅ Teste bem-sucedido!')
    console.log('Resposta:', result.reply)
    if (result.draft) {
      console.log('Rascunho:', result.draft)
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

testGroqModel()