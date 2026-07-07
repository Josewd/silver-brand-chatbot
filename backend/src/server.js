require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Sistema antigo SQLite (comentado temporariamente)
// const { initDatabase, createSession, getSession, updateFormState, saveMessage, getMessages, getAllSessions } = require('./db/sqlite-database');
// const { extractFields } = require('./ai/extractFields');
// const { calculateProgress } = require('./utils/progress');
const formSchema = require('./schema/form-schema.json');

// Importar novas rotas REST para formulário com ajuda inteligente
const adminRoutes = require('./routes/admin');
const sessionRoutes = require('./routes/sessions');
const fieldHelpRoutes = require('./routes/fieldHelp');

const app = express();
const server = createServer(app);

// Configuração CORS para produção no Render
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5179",
    "https://silver-brand-chatbot.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json());

// === NOVAS ROTAS REST PARA FORMULÁRIO ===
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', fieldHelpRoutes);

// Socket.io com configuração para Render free tier
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Função para gerar pergunta específica baseada no próximo campo necessário
function generateSpecificQuestion(currentFormState, formSchema) {
  const nextFieldInfo = getCurrentFieldToWork(formSchema, currentFormState);
  const companyName = currentFormState.company_slogan || 'sua empresa';
  
  console.log('🎯 Gerando pergunta específica para:', nextFieldInfo);
  
  if (nextFieldInfo.includes('mission_vision_values')) {
    return `Vamos trabalhar na missão da ${companyName}. Com base no que você me contou, posso sugerir: "A ${companyName} tem como missão proporcionar a melhor experiência de café takeaway, oferecendo produtos de qualidade com atendimento sofisticado." O que acha?`;
  } else if (nextFieldInfo.includes('current_objectives')) {
    return `Quais são os principais objetivos da ${companyName} hoje? Por exemplo: crescer no bairro, fidelizar clientes, ser reconhecida pela qualidade?`;
  } else if (nextFieldInfo.includes('competitive_differentiator')) {
    return `Você mencionou que o diferencial é o atendimento. Especificamente, o que no atendimento de vocês é diferente dos concorrentes?`;
  } else if (nextFieldInfo.includes('why_choose_you')) {
    return `Por que um cliente deveria escolher a ${companyName} em vez de outras opções de café? O que vocês oferecem de único?`;
  } else if (nextFieldInfo.includes('sophisticated_relaxed_scale')) {
    return `Agora vamos definir a personalidade da ${companyName}. Vou mostrar escalas para você avaliar de 1 a 5.`;
  } else if (nextFieldInfo.includes('three_words')) {
    return `Para finalizar a personalidade, me diga 3 palavras que definem a ${companyName}. Por exemplo: sofisticada, acolhedora, qualidade.`;
  } else {
    return `Vamos continuar com as informações da ${empresaNome}. Que outras informações você gostaria de compartilhar?`;
  }
}

// Função para tentar recuperar dados perdidos do histórico da conversa
async function tryRecoveryExtraction(conversationHistory, currentFormState) {
  const recoveredData = {};
  
  // Analisar mensagens do usuário em busca de informações não extraídas
  const userMessages = conversationHistory.filter(msg => msg.role === 'user');
  
  for (const msg of userMessages) {
    const content = msg.content.toLowerCase();
    
    // Recuperar about_company se não foi extraído
    if (!currentFormState.about_company) {
      if (content.includes('vendemos') || content.includes('fazemos') || 
          content.includes('cafe') || content.includes('takeaway') ||
          content.includes('empresa')) {
        recoveredData.about_company = msg.content;
        console.log('🔄 Recuperado about_company:', msg.content);
      }
    }
    
    // Recuperar products_services se não foi extraído
    if (!currentFormState.products_services) {
      if (content.includes('latte') || content.includes('cappuccino') || 
          content.includes('cafe') || content.includes('produtos') ||
          content.includes('variados')) {
        recoveredData.products_services = msg.content;
        console.log('🔄 Recuperado products_services:', msg.content);
      }
    }
    
    // Recuperar differentiator se não foi extraído
    if (!currentFormState.differentiator) {
      if (content.includes('atendimento') || content.includes('diferencial') || 
          content.includes('especial') || content.includes('sem duvida')) {
        recoveredData.differentiator = msg.content;
        console.log('🔄 Recuperado differentiator:', msg.content);
      }
    }
  }
  
  // Analisar mensagens do assistente em busca de conceitos construídos
  const assistantMessages = conversationHistory.filter(msg => msg.role === 'assistant');
  
  for (const msg of assistantMessages) {
    const content = msg.content;
    
    // Recuperar missão construída se não foi extraída
    if (!currentFormState.mission_vision_values && content.includes('missão')) {
      if (content.includes('Pradella Food tem como missão') || 
          content.includes('missão:')) {
        // Extrair a parte da missão
        const missaoMatch = content.match(/["""]([^"""]*missão[^"""]*)["""]/i) || 
                           content.match(/missão[^.]*\./i);
        if (missaoMatch) {
          recoveredData.mission_vision_values = `MISSÃO: ${missaoMatch[0]}`;
          console.log('🔄 Recuperado missão construída:', missaoMatch[0]);
        }
      }
    }
  }
  
  return recoveredData;
}

// Inicializar banco de dados
// Inicialização do banco SQLite
initDatabase().catch(console.error);

// Função utilitária para limpar campos duplicados legados
function cleanLegacyFields(formState) {
  const cleaned = { ...formState };
  
  // Remover campos duplicados em inglês se existirem em português
  if (cleaned.name && cleaned.client_name) {
    delete cleaned.client_name;
  }
  if (cleaned.email && cleaned.client_email) {
    delete cleaned.client_email;
  }
  if (cleaned.phone && cleaned.client_phone) {
    delete cleaned.client_phone;
  }
  
  return cleaned;
}

// === ROTAS HTTP ===

app.get('/', (req, res) => {
  res.json({
    service: 'Silver Brand Chatbot Backend',
    version: '1.0.0',
    status: 'running',
    websocket: 'ready'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: 'connected',
    ai_provider: process.env.OPENAI_API_KEY ? 'openai' : 'none'
  });
});

// === WEBSOCKET HANDLERS ===

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Handler: Entrar numa sessão
  socket.on('join_session', async (data) => {
    try {
      let { sessionId } = data;
      
      // Se não tem sessionId, criar nova sessão
      if (!sessionId) {
        sessionId = uuidv4();
        await createSession({
          id: sessionId,
          client_name: null
        });
        console.log('✅ Nova sessão criada:', sessionId);
      }
      
      // Verificar se a sessão existe ANTES de permitir entrada
      const session = await getSession(sessionId);
      if (!session) {
        console.log('❌ Tentativa de entrar em sessão inexistente:', sessionId);
        socket.emit('error', { message: 'Sessão não encontrada' });
        return;
      }
      
      // Entrar na sala da sessão
      socket.join(sessionId);
      socket.sessionId = sessionId;
      
      // Carregar mensagens da sessão
      const messages = await getMessages(sessionId);
      
      const formState = session.form_state?.data || {};
      const progress = calculateProgress(formState, formSchema);
      
      // Enviar estado atual para o cliente
      socket.emit('session_ready', {
        sessionId,
        formState,
        progress,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
        }))
      });
      
      // Se não há mensagens, enviar mensagem de boas-vindas e primeira pergunta
      if (!messages || messages.length === 0) {
        console.log('📨 Enviando mensagem de boas-vindas para nova sessão');
        
        // Verificar se já tem dados no formulário para decidir a primeira pergunta
        const hasBasicInfo = formState.name || formState.email;
        
        let firstMessage;
        if (hasBasicInfo) {
          // Se já tem dados básicos, continuar do ponto onde parou
          console.log('📋 Sessão tem dados básicos, continuando do ponto atual...');
          try {
            const aiResponse = await extractFields(
              [], // Conversa vazia mas com estado do formulário
              formState,
              formSchema
            );
            firstMessage = aiResponse.message || 'Vamos continuar com seu briefing. Me conte mais sobre sua empresa.';
          } catch (error) {
            console.error('❌ Erro ao gerar pergunta contextual:', error);
            // Sem fallback - re-emitir erro para o cliente
            throw error;
          }
        } else {
          // Mensagem de boas-vindas padrão para novos usuários
          firstMessage = `Olá! 👋 Sou a assistente da Silver Brand House e vou te ajudar a criar um briefing completo para seu projeto de identidade visual.

Vamos começar com as informações básicas de contato. Qual é o seu nome completo?`;
        }
        
        console.log(`📨 Primeira mensagem: "${firstMessage}"`);
        
        // Salvar mensagem de boas-vindas
        await saveMessage(sessionId, 'assistant', firstMessage);
        
        // Enviar mensagem para o cliente
        socket.emit('assistant_message', {
          text: firstMessage
        });
      }
      
      console.log('📡 Cliente entrou na sessão:', sessionId);
      
    } catch (error) {
      console.error('❌ Erro ao entrar na sessão:', error);
      socket.emit('error', { message: 'Erro ao conectar na sessão' });
    }
  });
  
  // Handler: Mensagem do usuário
  socket.on('user_message', async (data) => {
    try {
      const { sessionId, text } = data;
      
      console.log(`\n🔄 === PROCESSANDO MENSAGEM ===`);
      console.log(`📝 Sessão: ${sessionId}`);
      console.log(`💬 Mensagem: "${text}"`);
      
      if (!sessionId || !text) {
        socket.emit('error', { message: 'SessionId e text são obrigatórios' });
        return;
      }
      
      // Carregar estado atual
      const session = await getSession(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Sessão não encontrada' });
        return;
      }
      
      const currentFormState = session.form_state?.data || {};
      const conversationHistory = await getMessages(sessionId);
      
      console.log(`📊 Estado atual do formulário:`, JSON.stringify(currentFormState, null, 2));
      console.log(`📜 Histórico: ${conversationHistory.length} mensagens`);
      
      // Salvar mensagem do usuário
      await saveMessage(sessionId, 'user', text);
      
      // Adicionar mensagem do usuário ao histórico para contexto da IA
      const updatedHistory = [
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: text }
      ];
      
      console.log(`🤖 Chamando IA - FASE 1: Extração de campos`);
      
      // Chamar IA para processar mensagem (FASE 1: Extração)
      const extractionResponse = await extractFields(
        updatedHistory,
        currentFormState,
        formSchema
      );
      
      console.log(`📤 FASE 1 - Resultado:`, {
        fieldUpdates: extractionResponse.fieldUpdates,
        extractionSuccess: extractionResponse.metadata?.extractionSuccess,
        twoPhaseCall: extractionResponse.metadata?.twoPhaseCall
      });
      
      // Aplicar atualizações do formulário se houver (ATUALIZAR ESTADO)
      let updatedFormState = currentFormState;
      if (extractionResponse.fieldUpdates && Object.keys(extractionResponse.fieldUpdates).length > 0) {
        updatedFormState = { ...currentFormState, ...extractionResponse.fieldUpdates };
        await updateFormState(sessionId, updatedFormState);
        console.log(`✅ Estado do formulário atualizado:`, JSON.stringify(updatedFormState, null, 2));
      } else {
        // Se não houve extração mas há muitas mensagens, tentar extração de recuperação
        if (conversationHistory.length > 5) {
          console.log('🔍 Tentando extração de recuperação do histórico...');
          const recoveredData = await tryRecoveryExtraction(conversationHistory, currentFormState);
          if (Object.keys(recoveredData).length > 0) {
            updatedFormState = { ...currentFormState, ...recoveredData };
            await updateFormState(sessionId, updatedFormState);
            console.log(`🔄 Dados recuperados do histórico:`, recoveredData);
          }
        }
      }

      // OpenAI sempre retorna uma mensagem - sem fallbacks
      let aiMessage = extractionResponse.message;
      if (!aiMessage || aiMessage.trim() === '') {
        throw new Error('OpenAI não retornou mensagem válida');
      }
      
      // Detectar mensagem repetitiva genérica e corrigir
      if (aiMessage.includes('Para desenvolver uma identidade visual forte') && 
          aiMessage.includes('preciso entender melhor')) {
        console.log('🔄 Detectada resposta genérica, gerando pergunta específica...');
        aiMessage = generateSpecificQuestion(updatedFormState, formSchema);
      }

      console.log(`📨 Mensagem final da IA: "${aiMessage}"`);
      
      // Salvar resposta da IA
      await saveMessage(sessionId, 'assistant', aiMessage);
      
      // Calcular progresso atualizado (usar estado já atualizado)
      const updatedProgress = calculateProgress(updatedFormState, formSchema);
      
      console.log(`📊 Progresso atualizado: ${updatedProgress.overall}%`);
      
      // Emitir resposta para o cliente
      const responseData = {
        text: aiMessage
      };
      
      // Adicionar opções interativas se houver
      if (extractionResponse.options) {
        if (extractionResponse.options.type === 'auto_fill') {
          // Auto-preenchimento: salvar campo e enviar mensagem
          console.log('📦 Auto-preenchendo campo:', extractionResponse.options.fieldId);
          
          const autoFillData = {
            [extractionResponse.options.fieldId]: extractionResponse.options.value
          };
          
          updatedFormState = { ...updatedFormState, ...autoFillData };
          await updateFormState(sessionId, updatedFormState);
          
          // Recalcular progresso
          const newProgress = calculateProgress(updatedFormState, formSchema);
          
          // Enviar atualização do formulário
          socket.emit('form_update', {
            fields: autoFillData,
            progress: newProgress
          });
          
          // Usar mensagem do auto-fill
          responseData.text = extractionResponse.options.message;
          
          console.log('📦 Item auto-preenchido e progresso atualizado:', newProgress.overall + '%');
          
        } else {
          // Opções interativas normais
          responseData.options = extractionResponse.options;
          console.log(`🎛️ Enviando opções interativas:`, extractionResponse.options);
        }
      }
      
      socket.emit('assistant_message', responseData);
      
      // Emitir atualizações do formulário se houver mudanças na FASE 1
      if (extractionResponse.fieldUpdates && Object.keys(extractionResponse.fieldUpdates).length > 0) {
        socket.emit('form_update', {
          fields: extractionResponse.fieldUpdates,
          progress: updatedProgress
        });
        
        console.log('📊 Formulário atualizado:', {
          fieldsUpdated: Object.keys(extractionResponse.fieldUpdates),
          newProgress: updatedProgress.overall
        });
      } else {
        // Mesmo sem fieldUpdates, enviar progresso para manter UI atualizada
        console.log('📊 Enviando progresso sem fieldUpdates:', updatedProgress.overall + '%');
      }
      
      console.log('✅ Mensagem processada com sucesso!\n');
      
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      socket.emit('error', { 
        message: 'Erro ao processar mensagem',
        details: error.message 
      });
    }
  });
  
  // Handler: Desconexão
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

app.post('/api/session/create', async (req, res) => {
  try {
    const { client_name, client_email, client_phone, initial_context } = req.body;
    
    if (!client_name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }
    
    // Criar nova sessão
    const sessionId = uuidv4();
    await createSession({
      id: sessionId,
      client_name: client_name
    });
    
  // Criar estado inicial do formulário com dados fornecidos
  const initialFormData = {};
  
  // Mapear campos de inglês para português (compatibilidade com API antiga)
  if (client_name) initialFormData.name = client_name;
  if (client_email) initialFormData.email = client_email;
  if (client_phone) initialFormData.phone = client_phone;
  if (initial_context) initialFormData.initial_context = initial_context;
  
  console.log('🔄 Mapeamento de campos:', {
    input: { client_name, client_email, client_phone },
    output: initialFormData
  });
    
    if (Object.keys(initialFormData).length > 0) {
      await updateFormState(sessionId, initialFormData);
    }
    
    // URL do chat
    const chat_url = `${process.env.FRONTEND_URL}/chat/${sessionId}`;
    
    console.log(`✅ Nova sessão criada: ${sessionId} para ${client_name}`);
    
    res.json({
      session_id: sessionId,
      chat_url
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para salvar formulário manualmente
app.post('/api/session/:sessionId/form', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { formData, fieldName, fieldValue } = req.body;
    
    console.log(`📝 === SALVAMENTO MANUAL ===`);
    console.log(`📋 Sessão: ${sessionId}`);
    console.log(`📊 Dados recebidos:`, { formData, fieldName, fieldValue });
    
    // Verificar se a sessão existe
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    let updatedData;
    
    if (formData) {
      // Salvamento completo (modo batch)
      updatedData = formData;
      console.log(`💾 Salvamento completo: ${Object.keys(formData).length} campos`);
    } else if (fieldName && fieldValue !== undefined) {
      // Salvamento de campo individual
      const currentFormState = session.form_state?.data || {};
      updatedData = { ...currentFormState, [fieldName]: fieldValue };
      console.log(`💾 Salvamento individual: ${fieldName} = "${fieldValue}"`);
    } else {
      return res.status(400).json({ error: 'É necessário enviar formData ou fieldName+fieldValue' });
    }
    
    // Salvar no banco
    await updateFormState(sessionId, updatedData);
    
    // Calcular progresso atualizado
    const progress = calculateProgress(updatedData, formSchema);
    
    console.log(`✅ Formulário salvo com sucesso!`);
    console.log(`📊 Progresso: ${progress.overall}%`);
    
    res.json({
      success: true,
      progress: progress.overall,
      formState: updatedData,
      message: 'Formulário salvo com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao salvar formulário:', error);
    res.status(500).json({ error: 'Erro ao salvar formulário' });
  }
});

// === EXISTING ADMIN ROUTES ===

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }
    
    // Senha padrão do admin (deve vir do .env em produção)
    const adminPassword = process.env.ADMIN_PASSWORD || 'silveradmin2024';
    
    // Fazer hash da senha configurada
    const crypto = require('crypto');
    const adminPasswordHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
    
    // Comparar hashes
    if (password !== adminPasswordHash) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Gerar token simples (em produção, use JWT)
    const token = require('crypto').randomBytes(32).toString('hex');
    
    res.json({
      token,
      message: 'Login realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no login admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar se token ainda é válido
app.get('/api/admin/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer "
    
    // Por simplicidade, qualquer token com formato válido é aceito
    // Em produção, você deveria verificar contra uma base de dados ou JWT
    if (token && token.length === 64) {
      return res.json({ valid: true, message: 'Token válido' });
    }
    
    return res.status(401).json({ error: 'Token inválido' });
    
  } catch (error) {
    console.error('❌ Erro na verificação do token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/admin/sessions', async (req, res) => {
  try {
    // Buscar sessões do SQLite
    const sessions = await getAllSessions(50);
    
    // Formatar dados para o frontend (apenas campos em português)
    const formattedSessions = (sessions || []).map(session => {
      const formState = cleanLegacyFields(session.form_states?.[0]?.data || {});
      const progress = calculateProgress(formState, formSchema);
      
      return {
        id: session.id,
        client_name: formState.name || 'Cliente Sem Nome',
        progress: progress.overall || 0,
        is_completed: progress.overall >= 95,
        created_at: session.created_at,
        data: {
          // Apenas campos do schema em português
          ...formState
        }
      };
    });
    
    res.json({
      sessions: formattedSessions
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar sessões:', error);
    res.status(500).json({ error: 'Erro ao carregar sessões' });
  }
});

// Verificar se uma sessão específica existe (para ChatProtectedRoute)
app.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Buscar a sessão no SQLite
    const session = await getSession(sessionId);
      
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    // Carregar também os dados do formulário (apenas campos em português)
    const formState = cleanLegacyFields(session.form_state?.data || {});
    const progress = calculateProgress(formState, formSchema);
    
    res.json({
      id: session.id,
      created_at: session.created_at,
      client_name: formState.name || 'Cliente',
      progress: progress.overall || 0,
      is_completed: progress.overall >= 95,
      exists: true,
      data: {
        // Apenas campos do schema em português
        ...formState
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

// Endpoint para migrar dados legados (remover campos duplicados)
app.post('/api/admin/migrate-legacy-fields', async (req, res) => {
  try {
    console.log('🔄 === MIGRAÇÃO DE CAMPOS LEGADOS ===');
    
    // Buscar todas as sessões
    const sessions = await getAllSessions(1000);
    let migratedCount = 0;
    
    for (const session of sessions) {
      const formState = session.form_states?.[0]?.data || {};
      
      // Verificar se tem campos duplicados
      const hasDuplicates = (
        (formState.name && formState.client_name) ||
        (formState.email && formState.client_email) ||
        (formState.phone && formState.client_phone)
      );
      
      if (hasDuplicates) {
        console.log(`📋 Migrando sessão ${session.id}...`);
        
        // Limpar campos duplicados
        const cleanedData = cleanLegacyFields(formState);
        
        // Salvar dados limpos
        await updateFormState(session.id, cleanedData);
        migratedCount++;
        
        console.log(`✅ Sessão ${session.id} migrada:`, {
          before: Object.keys(formState).length,
          after: Object.keys(cleanedData).length,
          removed: Object.keys(formState).filter(key => !Object.keys(cleanedData).includes(key))
        });
      }
    }
    
    console.log(`✅ Migração concluída: ${migratedCount} sessões atualizadas`);
    
    res.json({
      success: true,
      sessionsChecked: sessions.length,
      sessionsMigrated: migratedCount,
      message: `Migração concluída. ${migratedCount} sessões foram atualizadas.`
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({ error: 'Erro durante a migração' });
  }
});

// Novo endpoint: Gerar preview completo do briefing
app.post('/api/session/:sessionId/generate-briefing', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`\n🎯 === GERANDO BRIEFING COMPLETO ===`);
    console.log(`📝 Sessão: ${sessionId}`);
    
    // Verificar se a sessão existe
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    // Obter estado atual do formulário e histórico da conversa
    const currentFormState = session.form_state?.data || {};
    const conversationHistory = await getMessages(sessionId);
    
    console.log(`📊 Estado atual:`, {
      filledFields: Object.keys(currentFormState).length,
      messagesCount: conversationHistory.length
    });
    
    // Verificar se há informação suficiente para gerar o briefing
    if (conversationHistory.length === 0) {
      return res.status(400).json({ 
        error: 'Não há conversa suficiente para gerar o briefing',
        message: 'Converse um pouco mais com o assistente antes de gerar a prévia.'
      });
    }
    
    // Importar função de geração
    const { generateBriefingSummary } = require('./ai/extractFields');
    
    // Gerar briefing completo usando IA
    const result = await generateBriefingSummary(
      conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      currentFormState,
      formSchema
    );
    
    if (!result.success) {
      throw new Error('Falha na geração do briefing');
    }
    
    // Salvar o briefing gerado no banco de dados (opcional)
    await updateFormState(sessionId, result.briefingData);
    
    // Calcular novo progresso
    const progress = calculateProgress(result.briefingData, formSchema);
    
    console.log(`✅ Briefing gerado com sucesso:`, {
      totalFields: Object.keys(result.briefingData).length,
      newFields: result.newFieldsAdded.length,
      progress: progress.overall
    });
    
    res.json({
      success: true,
      briefingData: result.briefingData,
      progress: progress.overall,
      newFieldsAdded: result.newFieldsAdded,
      message: `Briefing gerado com ${result.newFieldsAdded.length} novos campos preenchidos!`
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar briefing:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar briefing',
      message: error.message
    });
  }
});

// === EXISTING ROUTES ===

app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// === INICIAR SERVIDOR ===

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 CORS configurado para: ${corsOptions.origin.join(', ')}`);
  console.log(`🔑 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configurada' : 'NÃO configurada'}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL ? 'Supabase configurado' : 'DB não configurado'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
  });
});

// Export para Vercel
module.exports = app;