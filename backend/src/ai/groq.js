// groq.js - Cliente Groq para ajuda inteligente
const Groq = require('groq-sdk')

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.warn('⚠️ GROQ_API_KEY não configurada')
    return null
  }

  console.log('🚀 Cliente Groq inicializado')
  
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: false
  })
}

module.exports = {
  createGroqClient
}