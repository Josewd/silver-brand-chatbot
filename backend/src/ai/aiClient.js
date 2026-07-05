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

      const systemPrompt = this.buildSystemPrompt(field, formData, schema, helpHistory)
      
      // Montar mensagens incluindo o histórico
      const messages = [
        { role: 'system', content: systemPrompt },
        ...helpHistory,
        { role: 'user', content: userMessage }
      ]

      // Decidir se deve usar tools baseado no histórico
      const shouldUseDraft = this.shouldProposeDraft(helpHistory, userMessage)
      const tools = shouldUseDraft ? this.buildFieldTools() : []

      console.log(`🎯 Processando ajuda para campo: ${field.id}`)
      console.log(`📝 Contexto: ${Object.keys(formData).length} campos preenchidos`)
      console.log(`💬 Histórico: ${helpHistory.length} mensagens`)
      console.log(`🛠️ Tools habilitadas: ${shouldUseDraft ? 'SIM' : 'NÃO (conversação)'}`)

      const requestConfig = {
        model: this.getModelName(),
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }

      // Apenas adicionar tools se deve propor rascunho
      if (shouldUseDraft) {
        requestConfig.tools = tools
        requestConfig.tool_choice = 'auto'
      }

      const response = await this.client.chat.completions.create(requestConfig)

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

  // Decidir se deve propor rascunho baseado no histórico
  shouldProposeDraft(helpHistory, userMessage) {
    // Se é a primeira mensagem, apenas conversar
    if (helpHistory.length === 0) {
      return false
    }
    
    // Se já tem pelo menos 1 troca de mensagens (2 mensagens total)
    // E a mensagem atual parece ter informação suficiente
    if (helpHistory.length >= 2) {
      return true
    }
    
    // Se a mensagem atual é longa e detalhada (>50 caracteres)
    if (userMessage.length > 50) {
      return true  
    }
    
    // Palavras-chave que indicam que o usuário quer uma proposta
    const proposalKeywords = [
      'crie', 'faça', 'escreva', 'elabore', 'desenvolva', 'monte',
      'pode fazer', 'pode criar', 'me ajuda a', 'sugira',
      'proposta', 'versão', 'rascunho', 'exemplo'
    ]
    
    const hasProposalIntent = proposalKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    )
    
    return hasProposalIntent
  }

  // Construir prompt do sistema para o campo específico
  buildSystemPrompt(field, formData, schema, helpHistory = []) {
    const contextoPreenchido = Object.entries(formData)
      .filter(([key, value]) => value && value.toString().trim() !== '')
      .map(([key, value]) => {
        const fieldInfo = this.findFieldLabel(key, schema)
        return `- ${fieldInfo}: ${value}`
      })
      .join('\n')

    // Adicionar contexto sobre o estágio da conversa
    const isFirstMessage = helpHistory.length === 0
    const conversationStage = isFirstMessage 
      ? "PRIMEIRA INTERAÇÃO - Foque em fazer perguntas e entender melhor"
      : `CONVERSA EM ANDAMENTO - ${helpHistory.length} mensagens trocadas`

    return `
Você é um ESPECIALISTA EM IDENTIDADE VISUAL E BRANDING com 15+ anos de experiência.

Campo atual: "${field.label}"
ID: ${field.id}
Tipo: ${field.type}
${conversationStage}

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

FLUXO DE CONVERSA:
1. **PRIMEIRA INTERAÇÃO**: Sempre faça perguntas estratégicas para entender melhor (NÃO proponha rascunho ainda)
2. **SEGUNDA/TERCEIRA MENSAGEM**: Continue explorando detalhes se necessário
3. **QUANDO TIVER CONTEXTO SUFICIENTE**: Então crie uma versão profissional usando propose_field_value

REGRAS IMPORTANTES:
- ❌ NÃO proponha rascunho na primeira mensagem
- ✅ PRIMEIRO converse, entenda, questione
- ✅ SÓ use propose_field_value quando tiver informações suficientes
- ✅ Seja um consultor curioso, não um gerador automático

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