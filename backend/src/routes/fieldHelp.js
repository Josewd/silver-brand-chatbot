const express = require('express')
const { dbClient, queries } = require('../db/postgres-client')
const formSchema = require('../schema/form-schema.json')
const { aiClient } = require('../ai/aiClient')

const router = express.Router()

// Middleware para validar client token (reutilizado das rotas de sessions)
const requireClientToken = async (req, res, next) => {
  try {
    const clientToken = req.headers['x-client-token'] || req.query.token
    
    if (!clientToken) {
      return res.status(401).json({ error: 'Token do cliente necessário' })
    }

    // Verificar se a sessão existe e está válida
    const result = await dbClient.query(queries.getSessionByToken, [clientToken])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou inválida' })
    }

    req.session = result.rows[0]
    next()

  } catch (error) {
    console.error('Erro na autenticação do cliente:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// GET /sessions/:id/fields/:fieldId/help - Carregar histórico de conversa do campo
router.get('/:id/fields/:fieldId/help', requireClientToken, async (req, res) => {
  try {
    const { fieldId } = req.params
    const session = req.session

    // Verificar se o campo existe no schema e tem ajuda AI
    const field = findFieldInSchema(fieldId, formSchema)
    if (!field) {
      return res.status(400).json({ error: 'Campo não encontrado no formulário' })
    }

    if (!field.ai_help) {
      return res.status(400).json({ error: 'Campo não possui ajuda inteligente habilitada' })
    }

    // Buscar histórico de mensagens para este campo
    const result = await dbClient.query(queries.getHelpMessages, [session.id, fieldId])
    
    const messages = result.rows.map(row => ({
      role: row.role,
      content: row.content,
      created_at: row.created_at,
      tool_call_data: row.tool_call_data
    }))

    res.json({ messages })

  } catch (error) {
    console.error('Erro ao carregar histórico de ajuda:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /sessions/:id/fields/:fieldId/help - Enviar mensagem e obter resposta da AI
router.post('/:id/fields/:fieldId/help', requireClientToken, async (req, res) => {
  try {
    const { fieldId } = req.params
    const { message } = req.body
    const session = req.session

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia' })
    }

    // Verificar se o campo existe no schema e tem ajuda AI
    const field = findFieldInSchema(fieldId, formSchema)
    if (!field) {
      return res.status(400).json({ error: 'Campo não encontrado no formulário' })
    }

    if (!field.ai_help) {
      return res.status(400).json({ error: 'Campo não possui ajuda inteligente habilitada' })
    }

    // Salvar mensagem do usuário
    await dbClient.query(queries.addHelpMessage, [
      session.id,
      fieldId,
      'user',
      message.trim(),
      null
    ])

    // Obter histórico de mensagens para contexto
    const historyResult = await dbClient.query(queries.getHelpMessages, [session.id, fieldId])
    const helpHistory = historyResult.rows.map(row => ({
      role: row.role,
      content: row.content
    }))

    // Obter dados atuais do formulário para contexto
    const formData = session.data || {}

    // Chamar a AI para processar a mensagem
    const aiResponse = await aiClient.processFieldHelp({
      field,
      formData,
      schema: formSchema,
      helpHistory,
      userMessage: message.trim()
    })

    if (!aiResponse.success) {
      throw new Error(aiResponse.error || 'Erro na geração de resposta da AI')
    }

    // Salvar resposta da AI
    await dbClient.query(queries.addHelpMessage, [
      session.id,
      fieldId,
      'assistant',
      aiResponse.reply,
      aiResponse.toolCallData ? JSON.stringify(aiResponse.toolCallData) : null
    ])

    res.json({
      reply: aiResponse.reply,
      draft: aiResponse.draft || null
    })

  } catch (error) {
    console.error('Erro ao processar mensagem de ajuda:', error)
    
    // Salvar mensagem de erro no histórico
    try {
      await dbClient.query(queries.addHelpMessage, [
        session.id,
        fieldId,
        'assistant',
        'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        null
      ])
    } catch (saveError) {
      console.error('Erro ao salvar mensagem de erro:', saveError)
    }

    res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      reply: 'Desculpe, ocorreu um erro. Tente novamente em alguns instantes.'
    })
  }
})

// Função utilitária para encontrar campo no schema
function findFieldInSchema(fieldId, schema) {
  for (const section of schema.sections) {
    const field = section.fields.find(f => f.id === fieldId)
    if (field) {
      return { ...field, sectionId: section.id }
    }
  }
  return null
}

module.exports = router