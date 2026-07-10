const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const router = express.Router();

// Configurar multer para arquivos em memória
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas imagens e alguns tipos de documento
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem e documentos são permitidos!'));
    }
  }
});

// Middleware de autenticação (reutilizar do sistema existente)
const requireAuth = (req, res, next) => {
  const clientToken = req.headers['x-client-token'];
  if (!clientToken) {
    return res.status(401).json({ error: 'Token de cliente necessário' });
  }
  next();
};

// Configurar Google Drive Service Account
const getGoogleAuth = () => {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Credenciais do Service Account incompletas');
    }

    return new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
  } catch (error) {
    console.error('❌ Erro ao configurar Google Auth:', error.message);
    throw new Error('Google Drive não configurado corretamente');
  }
};

// Função para sanitizar nome da pasta (cliente)
const sanitizeFolderName = (clientName) => {
  if (!clientName || typeof clientName !== 'string') {
    return 'Cliente-Sem-Nome';
  }
  
  return clientName
    .trim()
    .replace(/[^\w\s-áàâäãéèêëíìîïóòôöõúùûüçñ]/gi, '') // Remover caracteres especiais, manter acentos
    .replace(/\s+/g, '-') // Espaços viram hífens
    .replace(/-+/g, '-') // Multiple hífens viram um só
    .replace(/^-|-$/g, '') // Remove hífens do início/fim
    .substring(0, 50) || 'Cliente-Padrao'; // Limitar tamanho
};

// Função para buscar pasta do cliente
const findClientFolder = async (drive, clientName, mainFolderId) => {
  const folderName = sanitizeFolderName(clientName);
  
  console.log(`🔍 Procurando pasta: "${folderName}" em ${mainFolderId}`);
  
  const response = await drive.files.list({
    q: `name='${folderName}' and parents in '${mainFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1
  });
  
  if (response.data.files && response.data.files.length > 0) {
    console.log(`✅ Pasta encontrada: ${response.data.files[0].id}`);
    return response.data.files[0];
  }
  
  return null;
};

// Função para criar pasta do cliente
const createClientFolder = async (drive, clientName, mainFolderId) => {
  const folderName = sanitizeFolderName(clientName);
  
  console.log(`📁 Criando pasta: "${folderName}"`);
  
  const folderMetadata = {
    name: folderName,
    parents: [mainFolderId],
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id, name'
  });
  
  // Tornar pasta pública para visualização
  try {
    await drive.permissions.create({
      fileId: folder.data.id,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    console.log(`🔓 Pasta tornada pública: ${folder.data.id}`);
  } catch (permError) {
    console.warn('⚠️ Erro ao tornar pasta pública (continua funcionando):', permError.message);
  }
  
  return folder.data;
};

// Função para fazer upload do arquivo
const uploadFileToFolder = async (drive, file, folderId, fieldId) => {
  // Gerar nome único para o arquivo
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const extension = file.originalname.split('.').pop();
  const fileName = `${fieldId}-${timestamp}-${randomId}.${extension}`;
  
  console.log(`📤 Upload: ${fileName} para pasta ${folderId}`);
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };
  
  const media = {
    mimeType: file.mimetype,
    body: file.buffer
  };
  
  const uploadedFile = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink'
  });
  
  // Tornar arquivo público
  try {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    console.log(`🔓 Arquivo tornado público: ${uploadedFile.data.id}`);
  } catch (permError) {
    console.warn('⚠️ Erro ao tornar arquivo público (continua funcionando):', permError.message);
  }
  
  return uploadedFile.data;
};

// POST /api/google-drive/upload - Upload de arquivo para Google Drive com organização por cliente
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { clientName, fieldId } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    if (!fieldId) {
      return res.status(400).json({ error: 'fieldId é obrigatório' });
    }
    
    console.log('📁 Iniciando upload Google Drive:', {
      fileName: file.originalname,
      clientName: clientName || 'N/A',
      fieldId,
      size: file.size
    });
    
    // Configurar Google Drive
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!mainFolderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');
    }
    
    // 1. Encontrar ou criar pasta do cliente
    let clientFolder = await findClientFolder(drive, clientName, mainFolderId);
    
    if (!clientFolder) {
      clientFolder = await createClientFolder(drive, clientName, mainFolderId);
    }
    
    // 2. Upload do arquivo na pasta do cliente
    const uploadedFile = await uploadFileToFolder(drive, file, clientFolder.id, fieldId);
    
    // 3. Gerar URL pública
    const publicUrl = `https://drive.google.com/file/d/${uploadedFile.id}/view`;
    const directUrl = `https://drive.google.com/uc?id=${uploadedFile.id}&export=download`;
    
    console.log('✅ Upload concluído:', {
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      clientFolder: clientFolder.name
    });
    
    res.json({
      success: true,
      file: {
        id: uploadedFile.id,
        name: file.originalname,
        originalName: file.originalname,
        url: publicUrl,
        directUrl: directUrl,
        size: file.size,
        type: file.mimetype,
        storage: 'google-drive',
        clientFolder: clientFolder.id,
        clientFolderName: clientFolder.name
      },
      message: `Arquivo enviado com sucesso para a pasta "${clientFolder.name}"`
    });
    
  } catch (error) {
    console.error('❌ Erro no upload Google Drive:', error);
    
    let errorMessage = 'Erro interno do servidor';
    if (error.message.includes('não configurado')) {
      errorMessage = 'Google Drive não configurado no servidor';
    } else if (error.message.includes('credentials')) {
      errorMessage = 'Credenciais do Google Drive inválidas';
    } else if (error.message.includes('quota')) {
      errorMessage = 'Cota do Google Drive esgotada';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/google-drive/test - Teste de conectividade
router.get('/test', requireAuth, async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    // Testar acesso à pasta principal
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!mainFolderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');
    }
    
    const folder = await drive.files.get({
      fileId: mainFolderId,
      fields: 'id, name, mimeType'
    });
    
    res.json({
      success: true,
      message: 'Google Drive configurado corretamente',
      folder: folder.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Teste Google Drive falhou:', error);
    res.status(500).json({ 
      error: 'Falha na conexão com Google Drive',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;