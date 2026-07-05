// openai.js - Cliente OpenAI para ajuda inteligente
const OpenAI = require('openai')

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey || apiKey.includes('sk-test-key')) {
    console.warn('⚠️ OPENAI_API_KEY não configurada ou usando chave de teste')
    return null
  }

  console.log('🚀 Cliente OpenAI inicializado')
  
  return new OpenAI({
    apiKey: apiKey
  })
}

module.exports = {
  createOpenAIClient
}