// Teste do prompt conversacional melhorado
const { aiClient } = require('./backend/src/ai/aiClient')

async function testConversationalPrompt() {
  console.log('🧪 Testando prompt conversacional melhorado...')
  
  const mockField = {
    id: 'sobre_empresa',
    label: 'Sobre a empresa',
    type: 'textarea',
    ai_help: true
  }
  
  const mockFormData = {
    company_name: 'TechStart'
  }
  
  const mockSchema = {
    sections: [{
      id: 'basics', 
      fields: [mockField]
    }]
  }
  
  try {
    // Simular resposta offline (já que não temos APIs configuradas)
    process.env.AI_OFFLINE_MODE = 'true'
    
    const result = await aiClient.processFieldHelp({
      field: mockField,
      formData: mockFormData,
      schema: mockSchema,
      helpHistory: [], // Primeira mensagem
      userMessage: 'Preciso de ajuda para descrever minha empresa de tecnologia'
    })
    
    console.log('✅ Resposta simulada (modo offline):')
    console.log('Reply:', result.reply)
    console.log('Draft:', result.draft ? 'SIM' : 'NÃO')
    
    // Verificar se gerou resposta offline
    if (result.success) {
      console.log('🎯 Sistema funcionando - modo offline ativo')
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  } finally {
    // Limpar variável de ambiente
    delete process.env.AI_OFFLINE_MODE
  }
}

testConversationalPrompt()