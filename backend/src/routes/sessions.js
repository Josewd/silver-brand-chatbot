const express = require('express')
const { dbClient, queries } = require('../db/postgres-client')
const formSchema = require('../schema/form-schema.json')

const router = express.Router()

// Middleware para validar client token
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

// GET /sessions/:id - Carregar sessão e formulário
router.get('/:id', requireClientToken, async (req, res) => {
  try {
    const session = req.session

    // Retornar schema do formulário + estado atual
    res.json({
      sessionId: session.id,
      schema: formSchema,
      formState: session.data || {},
      progress: session.progress || {},
      status: session.status,
      createdAt: session.created_at
    })

  } catch (error) {
    console.error('Erro ao carregar sessão:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PATCH /sessions/:id/fields/:fieldId - Atualizar campo do formulário
router.patch('/:id/fields/:fieldId', requireClientToken, async (req, res) => {
  try {
    const { fieldId } = req.params
    const { value } = req.body
    const session = req.session

    // Validar se o campo existe no schema
    const field = findFieldInSchema(fieldId, formSchema)
    if (!field) {
      return res.status(400).json({ error: 'Campo não encontrado no formulário' })
    }

    // Validar valor do campo
    const validationError = validateFieldValue(field, value)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    // Atualizar campo no banco
    const result = await dbClient.query(queries.updateFieldValue, [
      session.id,
      fieldId,
      value
    ])

    const updatedData = result.rows[0].data
    
    // Recalcular progresso
    const newProgress = calculateProgress(updatedData, formSchema)
    
    // Atualizar progresso no banco
    await dbClient.query(queries.upsertFormState, [
      session.id,
      JSON.stringify(updatedData),
      JSON.stringify(newProgress)
    ])

    res.json({
      success: true,
      fieldId,
      value,
      progress: newProgress
    })

  } catch (error) {
    console.error('Erro ao atualizar campo:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /sessions/:id/status - Verificar status da sessão (endpoint leve para polling)
router.get('/:id/status', requireClientToken, async (req, res) => {
  try {
    const session = req.session
    
    res.json({
      status: session.status,
      progress: session.progress || {},
      lastUpdated: session.updated_at
    })

  } catch (error) {
    console.error('Erro ao verificar status:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
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

// Função utilitária para validar valor do campo
function validateFieldValue(field, value) {
  // Campos obrigatórios
  if (field.required && (!value || value.toString().trim() === '')) {
    return `Campo "${field.label}" é obrigatório`
  }

  // Validações por tipo
  switch (field.type) {
    case 'email':
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Email inválido'
      }
      break

    case 'select':
      if (value && field.options && !field.options.includes(value)) {
        return `Valor "${value}" não é uma opção válida`
      }
      break

    case 'multiselect':
      if (value && Array.isArray(value)) {
        const invalidOptions = value.filter(v => !field.options.includes(v))
        if (invalidOptions.length > 0) {
          return `Opções inválidas: ${invalidOptions.join(', ')}`
        }
      }
      break

    case 'scale':
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseInt(value)
        if (isNaN(numValue) || numValue < field.min || numValue > field.max) {
          return `Valor deve estar entre ${field.min} e ${field.max}`
        }
      }
      break
  }

  return null
}

// Função utilitária para calcular progresso
function calculateProgress(formData, schema) {
  const progress = {}
  
  schema.sections.forEach(section => {
    const sectionFields = section.fields
    const totalFields = sectionFields.length
    let filledFields = 0

    sectionFields.forEach(field => {
      const value = formData[field.id]
      
      // Considerar campo preenchido se:
      // - Não está vazio/null/undefined
      // - Para arrays (multiselect), tem pelo menos 1 item
      // - Para strings, não está vazio após trim
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) filledFields++
        } else {
          if (value.toString().trim() !== '') filledFields++
        }
      }
    })

    progress[section.id] = Math.round((filledFields / totalFields) * 100)
  })

  return progress
}

module.exports = router