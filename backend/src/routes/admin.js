const express = require('express')
const { dbClient, queries } = require('../db/postgres-client')
const formSchema = require('../schema/form-schema.json')

const router = express.Router()

// Middleware simples de autenticação admin
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const adminKey = process.env.ADMIN_API_KEY || 'admin-key-default'
  
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Acesso negado. Token de admin necessário.' })
  }
  
  next()
}

// POST /admin/login - Autenticação de admin
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body
    const adminPassword = process.env.ADMIN_PASSWORD || 'silveradmin2024'
    
    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória' })
    }

    // Hash simples da senha de admin para comparação
    const crypto = require('crypto')
    const hashedAdminPassword = crypto.createHash('sha256').update(adminPassword).digest('hex')
    
    if (password !== hashedAdminPassword) {
      return res.status(401).json({ error: 'Senha incorreta' })
    }

    // Login bem-sucedido - retornar token
    const token = process.env.ADMIN_API_KEY || 'admin-key-default'
    
    res.json({
      success: true,
      token,
      message: 'Login realizado com sucesso'
    })

  } catch (error) {
    console.error('Erro no login admin:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/verify - Verificar se token de admin é válido
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization
  const adminKey = process.env.ADMIN_API_KEY || 'admin-key-default'
  
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  
  res.json({
    valid: true,
    message: 'Token válido'
  })
})

// POST /admin/sessions - Criar nova sessão
router.post('/sessions', requireAdminAuth, async (req, res) => {
  try {
    const { prefill = {}, createdBy = 'admin' } = req.body

    // Criar sessão
    const sessionResult = await dbClient.query(queries.createSession, [createdBy])
    const session = sessionResult.rows[0]

    // Se tiver prefill, criar form_state inicial
    if (Object.keys(prefill).length > 0) {
      const initialProgress = calculateProgress(prefill, formSchema)
      
      await dbClient.query(queries.upsertFormState, [
        session.id,
        JSON.stringify(prefill),
        JSON.stringify(initialProgress)
      ])
    }

    // Gerar link do cliente
    const clientLink = `${req.protocol}://${req.get('host')}/form/${session.client_token}`

    res.json({
      sessionId: session.id,
      clientToken: session.client_token,
      clientLink,
      status: session.status,
      createdAt: session.created_at,
      prefill
    })

  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/sessions - Listar todas as sessões
router.get('/sessions', requireAdminAuth, async (req, res) => {
  try {
    const result = await dbClient.query(queries.getAllSessions)
    
    const sessions = result.rows.map(row => ({
      id: row.id,
      clientToken: row.client_token,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      progress: row.progress || {}
    }))

    res.json({ sessions })

  } catch (error) {
    console.error('Erro ao listar sessões:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /admin/sessions/:id - Obter sessão específica
router.get('/sessions/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const result = await dbClient.query(queries.getSessionById, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' })
    }

    const session = result.rows[0]
    res.json({
      id: session.id,
      clientToken: session.client_token,
      status: session.status,
      createdBy: session.created_by,
      createdAt: session.created_at,
      formData: session.data || {},
      progress: session.progress || {}
    })

  } catch (error) {
    console.error('Erro ao obter sessão:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Função utilitária para calcular progresso
function calculateProgress(formData, schema) {
  const progress = {}
  
  schema.sections.forEach(section => {
    const sectionFields = section.fields
    const totalFields = sectionFields.length
    let filledFields = 0

    sectionFields.forEach(field => {
      if (formData[field.id] && formData[field.id].toString().trim() !== '') {
        filledFields++
      }
    })

    progress[section.id] = Math.round((filledFields / totalFields) * 100)
  })

  return progress
}

module.exports = router