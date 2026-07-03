require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const { initDatabase, createSession, getSession, updateFormState, saveMessage, getMessages, getAllSessions } = require('./db/sqlite-database');
const { extractFields } = require('./ai/extractFields');
const { calculateProgress } = require('./utils/progress');
const formSchema = require('./schema/form-schema.json');

const app = express();
const server = createServer(app);

// Configuração CORS para produção no Render
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://silver-brand-chatbot.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io com configuração para Render free tier
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Inicializar banco de dados
// Inicialização do banco SQLite
initDatabase().catch(console.error);

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
    ai_provider: process.env.GROQ_API_KEY ? 'groq' : 'none'
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
        const hasBasicInfo = formState.nome || formState.email;
        
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
            firstMessage = 'Olá! Vamos continuar com seu briefing. Me conte mais sobre sua empresa.';
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
        hasMessage: !!extractionResponse.message,
        metadata: extractionResponse.metadata
      });
      
      // Aplicar atualizações do formulário se houver (ATUALIZAR ESTADO)
      let updatedFormState = currentFormState;
      if (extractionResponse.fieldUpdates && Object.keys(extractionResponse.fieldUpdates).length > 0) {
        updatedFormState = { ...currentFormState, ...extractionResponse.fieldUpdates };
        await updateFormState(sessionId, updatedFormState);
        console.log(`✅ Estado do formulário atualizado:`, JSON.stringify(updatedFormState, null, 2));
      }
      
      console.log(`🤖 Chamando IA - FASE 2: Próxima pergunta`);
      
      // FASE 2: Gerar próxima pergunta com estado atualizado
      const nextQuestionResponse = await extractFields(
        updatedHistory,
        updatedFormState, // Estado JÁ atualizado com os campos extraídos
        formSchema
      );
      
      console.log(`📤 FASE 2 - Resultado:`, {
        hasMessage: !!nextQuestionResponse.message,
        messageLength: nextQuestionResponse.message?.length || 0,
        metadata: nextQuestionResponse.metadata
      });
      
      // Verificar se a IA retornou uma mensagem válida
      let aiMessage = nextQuestionResponse.message;
      if (!aiMessage || aiMessage.trim() === '') {
        // Se não há resposta da IA, gerar uma pergunta de continuação
        aiMessage = 'Obrigado pela informação. Poderia me contar mais sobre sua empresa?';
        console.log('⚠️ IA não retornou mensagem, usando fallback');
      }
      
      console.log(`📨 Mensagem final da IA: "${aiMessage}"`);
      
      // Salvar resposta da IA
      await saveMessage(sessionId, 'assistant', aiMessage);
      
      // Calcular progresso atualizado (usar estado já atualizado)
      const updatedProgress = calculateProgress(updatedFormState, formSchema);
      
      console.log(`📊 Progresso atualizado: ${updatedProgress.overall}%`);
      
      // Emitir resposta para o cliente
      socket.emit('assistant_message', {
        text: aiMessage
      });
      
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
    if (client_name) initialFormData.nome = client_name;
    if (client_email) initialFormData.email = client_email;
    if (client_phone) initialFormData.telefone = client_phone;
    if (initial_context) initialFormData.initial_context = initial_context;
    
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
    
    // Formatar dados para o frontend
    const formattedSessions = (sessions || []).map(session => {
      const formState = session.form_states?.[0]?.data || {};
      const progress = calculateProgress(formState, formSchema);
      
      return {
        id: session.id,
        client_name: formState.nome || 'Cliente Sem Nome',
        progress: progress.overall || 0,
        is_completed: progress.overall >= 95,
        created_at: session.created_at,
        data: {
          client_name: formState.nome || 'Cliente Sem Nome',
          client_email: formState.email || '',
          client_phone: formState.telefone || '',
          ...formState // Incluir todos os campos do formulário
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
    
    // Carregar também os dados do formulário
    const formState = session.form_state?.data || {};
    const progress = calculateProgress(formState, formSchema);
    
    res.json({
      id: session.id,
      created_at: session.created_at,
      client_name: formState.nome || 'Cliente',
      progress: progress.overall || 0,
      is_completed: progress.overall >= 95,
      exists: true,
      data: {
        client_name: formState.nome || 'Cliente',
        client_email: formState.email || '',
        client_phone: formState.telefone || '',
        ...formState // Incluir todos os campos do formulário
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    res.status(500).json({ error: 'Erro ao verificar sessão' });
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
  console.log(`🔑 Groq API: ${process.env.GROQ_API_KEY ? 'Configurada' : 'NÃO configurada'}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL ? 'Supabase configurado' : 'DB não configurado'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
  });
});