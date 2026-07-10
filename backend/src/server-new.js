require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const cors = require('cors');

// Importar novas rotas REST para formulário com ajuda inteligente
const adminRoutes = require('./routes/admin');
const sessionRoutes = require('./routes/sessions');
const fieldHelpRoutes = require('./routes/fieldHelp');
const uploadRoutes = require('./routes/upload');
const googleDriveUploadRoutes = require('./routes/google-drive-upload');

const app = express();
const server = createServer(app);

// Configuração CORS para desenvolvimento local e produção
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5179",
    "https://silver-brand-chatbot.vercel.app",
    "https://silver-brand-chatbot-frontend.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir arquivos estáticos de upload
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3001;

// === NOVAS ROTAS REST PARA FORMULÁRIO ===
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', fieldHelpRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/google-drive', googleDriveUploadRoutes);

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Silver Brand Chatbot - Formulário com IA',
    timestamp: new Date().toISOString(),
    database: process.env.SUPABASE_URL ? 'PostgreSQL' : 'Not configured'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// === INICIAR SERVIDOR ===
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 CORS configurado para: ${corsOptions.origin.join(', ')}`);
  console.log(`🔑 Groq API: ${process.env.GROQ_API_KEY ? 'Configurada' : 'NÃO configurada'}`);
  console.log(`🔑 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configurada' : 'NÃO configurada'}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL ? 'PostgreSQL configurado' : 'DB não configurado'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
  });
});