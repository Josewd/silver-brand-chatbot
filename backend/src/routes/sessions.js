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
    const rawFormState = session.data || {}
    console.log(`📖 Dados brutos da sessão:`, rawFormState)
    
    // Processar dados para garantir que arrays sejam parseados corretamente
    const processedFormState = {}
    
    for (const [fieldId, value] of Object.entries(rawFormState)) {
      const field = findFieldInSchema(fieldId, formSchema)
      
      if (field && (field.type === 'multiselect' || field.type === 'file') && typeof value === 'string') {
        try {
          // Se é multiselect ou arquivo e veio como string, tentar fazer parse
          processedFormState[fieldId] = JSON.parse(value)
          console.log(`🔄 Parseado ${fieldId}:`, processedFormState[fieldId])
        } catch (e) {
          // Se não conseguir fazer parse
          if (field.type === 'file') {
            // Para arquivo, manter como null se não conseguir parsear
            processedFormState[fieldId] = null
            console.log(`⚠️ Erro ao parsear arquivo ${fieldId}, mantendo como null`)
          } else {
            // Para multiselect, manter como array com um item
            processedFormState[fieldId] = [value]
            console.log(`⚠️ Fallback ${fieldId}:`, processedFormState[fieldId])
          }
        }
      } else {
        processedFormState[fieldId] = value
      }
    }
    
    console.log(`✅ Dados processados:`, processedFormState)
    
    res.json({
      sessionId: session.id,
      schema: formSchema,
      formState: processedFormState,
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

    // Preparar valor para salvar no banco
    let valueToSave = value
    
    // Limpar objetos File antes de salvar (eles não podem ser serializados)
    if (field.type === 'file') {
      try {
        if (Array.isArray(value)) {
          valueToSave = value.map(file => {
            if (!file || typeof file !== 'object') {
              console.warn('⚠️ Arquivo inválido encontrado:', file);
              return null;
            }
            
            const cleanFile = { ...file }
            // Remover propriedade 'file' que não pode ser serializada
            delete cleanFile.file
            
            // Garantir que propriedades essenciais existem
            if (!cleanFile.id) {
              cleanFile.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!cleanFile.name) {
              console.warn('⚠️ Arquivo sem nome:', cleanFile);
              return null;
            }
            
            return cleanFile;
          }).filter(file => file !== null); // Remover arquivos inválidos
          
          valueToSave = JSON.stringify(valueToSave)
          console.log(`💾 Salvando arquivos (${valueToSave.length > 1000 ? 'grande' : 'pequeno'}):`, valueToSave.length > 200 ? `${valueToSave.substring(0, 100)}...` : valueToSave)
        } else if (value && typeof value === 'object') {
          const cleanFile = { ...value }
          delete cleanFile.file
          
          // Garantir propriedades essenciais
          if (!cleanFile.id) {
            cleanFile.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          if (!cleanFile.name) {
            throw new Error('Nome do arquivo é obrigatório');
          }
          
          valueToSave = JSON.stringify(cleanFile)
          console.log(`💾 Salvando arquivo único:`, valueToSave.length > 200 ? `${valueToSave.substring(0, 100)}...` : valueToSave)
        } else if (value === null || value === undefined || value === '') {
          // Valor vazio - permitir
          valueToSave = null;
          console.log(`💾 Salvando arquivo como null (campo vazio)`);
        } else {
          throw new Error(`Formato de arquivo inválido: ${typeof value}`);
        }
      } catch (jsonError) {
        console.error('❌ Erro ao processar arquivo para JSON:', jsonError);
        throw new Error(`Erro ao processar arquivo: ${jsonError.message}`);
      }
    } else if (Array.isArray(value)) {
      // Para arrays (multiselect), converter para JSON string
      valueToSave = JSON.stringify(value)
      console.log(`💾 Salvando array como JSON: ${fieldId} =`, valueToSave.length > 1000 ? `${valueToSave.substring(0, 100)}...` : valueToSave)
    } else {
      console.log(`💾 Salvando valor: ${fieldId} =`, valueToSave)
    }

    // Atualizar campo no banco
    const result = await dbClient.query(queries.updateFieldValue, [
      session.id,
      fieldId,
      valueToSave
    ])

    const updatedData = result.rows[0].data
    console.log(`📖 Dados após salvar:`, updatedData)
    
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
    console.error('❌ Erro ao atualizar campo:', error);
    console.error('📋 Contexto do erro:', {
      sessionId: req.session?.id,
      fieldId,
      valueType: typeof value,
      isArray: Array.isArray(value),
      fieldType: field?.type,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Retornar erro mais específico
    if (error.message.includes('arquivo')) {
      res.status(400).json({ 
        error: `Erro no processamento do arquivo: ${error.message}`,
        fieldId,
        details: 'Verifique se o arquivo foi enviado corretamente'
      });
    } else if (error.message.includes('JSON')) {
      res.status(400).json({ 
        error: 'Erro na serialização dos dados do arquivo',
        fieldId,
        details: 'Os dados do arquivo não puderam ser processados'
      });
    } else {
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        fieldId,
        message: error.message
      });
    }
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

// POST /sessions/:id/finalize - Finalizar briefing (mudar status de draft para completed)
router.post('/:id/finalize', requireClientToken, async (req, res) => {
  try {
    const session = req.session
    
    // Verificar se a sessão não está já completa
    if (session.status === 'completed') {
      return res.json({ 
        success: true, 
        message: 'Briefing já está finalizado',
        status: 'completed'
      })
    }
    
    // Calcular progresso atual
    const currentProgress = session.progress || {}
    const overallProgress = calculateOverallProgress(currentProgress)
    
    // Verificar se tem pelo menos 60% de progresso
    if (overallProgress < 60) {
      return res.status(400).json({ 
        error: 'É necessário completar pelo menos 60% do formulário para finalizar',
        currentProgress: overallProgress
      })
    }
    
    // Atualizar status para completed
    const result = await dbClient.query(queries.updateSessionStatus, [
      session.id,
      'completed'
    ])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' })
    }
    
    res.json({
      success: true,
      message: 'Briefing finalizado com sucesso!',
      status: 'completed',
      progress: overallProgress
    })

  } catch (error) {
    console.error('Erro ao finalizar briefing:', error)
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
  if (field.required) {
    if (field.type === 'file') {
      // Para arquivos, considerar vazio se não há valor ou é array vazio
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return `Campo "${field.label}" é obrigatório`
      }
    } else if (!value || value.toString().trim() === '') {
      return `Campo "${field.label}" é obrigatório`
    }
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

    case 'file':
      // Validação específica para campos de arquivo
      if (value && Array.isArray(value)) {
        // Verificar se cada arquivo tem as propriedades necessárias
        for (const file of value) {
          if (!file || typeof file !== 'object') {
            return 'Formato de arquivo inválido'
          }
          if (!file.name || typeof file.name !== 'string') {
            return 'Nome do arquivo é obrigatório'
          }
          // Para arquivos enviados, deve ter URL. Para locais, pode ter file
          if (!file.url && !file.uploaded) {
            // Se não tem URL e não está marcado como enviado, deve ser arquivo local válido
            // Mas não validamos 'file' aqui pois pode não existir após carregamento do DB
          }
          // Validar tamanho do arquivo se especificado
          if (file.size && typeof file.size === 'number' && file.size > 5 * 1024 * 1024) {
            return `Arquivo ${file.name} é muito grande. Máximo 5MB por arquivo.`
          }
        }
        // Verificar limite de arquivos se especificado
        if (!field.multiple && value.length > 1) {
          return 'Apenas um arquivo é permitido para este campo'
        }
      } else if (value && typeof value === 'object') {
        // Arquivo único
        if (!value.name || typeof value.name !== 'string') {
          return 'Nome do arquivo é obrigatório'
        }
        // Validar tamanho do arquivo
        if (value.size && typeof value.size === 'number' && value.size > 5 * 1024 * 1024) {
          return `Arquivo ${value.name} é muito grande. Máximo 5MB por arquivo.`
        }
      } else if (value !== null && value !== undefined && value !== '') {
        return 'Formato de arquivo inválido'
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
      // - Para arrays (multiselect ou arquivos múltiplos), tem pelo menos 1 item
      // - Para strings, não está vazio após trim
      // - Para arquivos únicos, tem objeto válido
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) filledFields++
        } else if (field.type === 'file' && typeof value === 'object') {
          // Arquivo único - considerar preenchido se tem nome e url/data
          if (value.name && (value.url || value.data)) filledFields++
        } else {
          if (value.toString().trim() !== '') filledFields++
        }
      }
    })

    progress[section.id] = Math.round((filledFields / totalFields) * 100)
  })

  return progress
}

// Função utilitária para calcular progresso geral
function calculateOverallProgress(progress) {
  const values = Object.values(progress)
  if (values.length === 0) return 0
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

module.exports = router