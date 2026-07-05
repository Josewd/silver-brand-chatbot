// aiClient.js - Cliente AI para ajuda inteligente por campo
const { createGroqClient } = require('./groq')
const { createOpenAIClient } = require('./openai')

class AIClient {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai'
    this.client = this.provider === 'openai' 
      ? createOpenAIClient() 
      : createGroqClient()
    
    console.log(`🤖 AI Client inicializado com provider: ${this.provider}`)
  }

  // Processar ajuda para um campo específico
  async processFieldHelp({ field, formData, schema, helpHistory, userMessage }) {
    try {
      // Modo offline/simulação para demonstração quando há problemas de conectividade
      if (process.env.AI_OFFLINE_MODE === 'true') {
        return this.generateOfflineResponse(field, formData, userMessage)
      }

      const systemPrompt = this.buildSystemPrompt(field, formData, schema)
      
      // Montar mensagens incluindo o histórico
      const messages = [
        { role: 'system', content: systemPrompt },
        ...helpHistory,
        { role: 'user', content: userMessage }
      ]

      const tools = this.buildFieldTools()

      console.log(`🎯 Processando ajuda para campo: ${field.id}`)
      console.log(`📝 Contexto: ${Object.keys(formData).length} campos preenchidos`)
      console.log(`💬 Histórico: ${helpHistory.length} mensagens`)

      const response = await this.client.chat.completions.create({
        model: this.getModelName(),
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      })

      const message = response.choices[0].message
      const toolCall = message.tool_calls?.[0]

      let draft = null
      let toolCallData = null

      if (toolCall && toolCall.function?.name === 'propose_field_value') {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          draft = args.value
          toolCallData = {
            toolCall: toolCall.function.name,
            arguments: args
          }
          console.log(`✨ Rascunho proposto para ${field.id}:`, draft?.substring(0, 100) + '...')
        } catch (parseError) {
          console.error('Erro ao parsear argumentos da tool:', parseError)
        }
      }

      return {
        success: true,
        reply: message.content || 'Entendi! Continue me contando mais detalhes.',
        draft,
        toolCallData
      }

    } catch (error) {
      console.error(`❌ Erro na AI (${this.provider}):`, error)
      return {
        success: false,
        error: error.message,
        reply: 'Desculpe, ocorreu um erro. Tente reformular sua resposta.'
      }
    }
  }

  // Construir prompt do sistema para o campo específico
  buildSystemPrompt(field, formData, schema) {
    const contextoPreenchido = Object.entries(formData)
      .filter(([key, value]) => value && value.toString().trim() !== '')
      .map(([key, value]) => {
        const fieldInfo = this.findFieldLabel(key, schema)
        return `- ${fieldInfo}: ${value}`
      })
      .join('\n')

    return `
Você é um ESPECIALISTA EM IDENTIDADE VISUAL E BRANDING com 15+ anos de experiência.

Campo atual: "${field.label}"
ID: ${field.id}
Tipo: ${field.type}

Contexto do cliente:
${contextoPreenchido || "(ainda não há informações preenchidas)"}

SUA MISSÃO:
- Você é um CONSULTOR ESPECIALISTA, não apenas um assistente passivo
- ANALISE criticamente as informações do cliente
- MELHORE e PROFISSIONALIZE respostas amadoras ou incompletas
- PROPONHA versões mais estratégicas e comercialmente eficazes
- Use seu conhecimento em branding para elevar a qualidade

COMO AGIR POR CAMPO:

🎯 MISSÃO/VISÃO/VALORES:
- Se receber algo genérico como "vender produtos", transforme em algo inspirador
- Adicione propósito, impacto social, diferenciação
- Exemplo: "Vender café" → "Proporcionar momentos de conexão e energia através de experiências gastronômicas únicas"

🎯 DIFERENCIAL:
- Identifique vantagens competitivas reais
- Traduza características em benefícios para o cliente
- Crie posicionamento único no mercado

🎯 POSICIONAMENTO:
- Defina segmento, personalidade e tom de voz
- Conecte com o público-alvo específico
- Crie messaging strategy profissional

🎯 3 PALAVRAS:
- Selecione palavras estratégicas, não óbvias
- Considere diferenciação vs concorrentes
- Equilibre aspiração com autenticidade

SEMPRE:
1. Faça 1-2 perguntas estratégicas para entender melhor
2. Quando tiver informação suficiente, CRIE uma versão PROFISSIONAL da resposta
3. Explique brevemente POR QUE sua versão é mais eficaz
4. Use a função propose_field_value com sua versão melhorada

Seja direto, estratégico e transforme ideias amadoras em branding profissional.
`.trim()
  }

  // Construir tools para propor valores de campo
  buildFieldTools() {
    const tools = [{
      type: "function",
      function: {
        name: "propose_field_value",
        description: "Propõe um rascunho de resposta pronto para ser aplicado no campo do formulário",
        parameters: {
          type: "object",
          properties: { 
            value: { 
              type: "string",
              description: "O texto final proposto para o campo"
            }
          },
          required: ["value"],
          additionalProperties: false
        }
      }
    }]

    // Adicionar strict: true apenas para OpenAI
    if (this.provider === 'openai') {
      tools[0].function.strict = true
    }

    return tools
  }

  // Encontrar label de um campo pelo ID
  findFieldLabel(fieldId, schema) {
    for (const section of schema.sections) {
      const field = section.fields.find(f => f.id === fieldId)
      if (field) {
        return field.label
      }
    }
    return fieldId
  }

  // Obter nome do modelo baseado no provider
  getModelName() {
    switch (this.provider) {
      case 'openai':
        return 'gpt-4o-mini'
      case 'groq':
        return 'openai/gpt-oss-20b' // Substituído mixtral-8x7b-32768 (descontinuado)
      default:
        return 'openai/gpt-oss-20b'
    }
  }
}

// Cliente singleton
const aiClient = new AIClient()

module.exports = {
  aiClient
}