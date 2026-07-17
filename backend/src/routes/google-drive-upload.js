const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
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

// Configurar Google Drive via OAuth 2.0 (conta pessoal, não Service Account)
// Requer GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN
// obtidos uma única vez via scripts/google-drive-oauth-setup.js
const getGoogleAuth = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Credenciais OAuth incompletas (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN)');
    throw new Error('Google Drive não configurado corretamente');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
};

// Cache em memória do ID da pasta raiz "SilverAssets" (evita buscar em toda requisição)
let rootFolderIdCache = null;

// Encontrar ou criar a pasta raiz (ex: "SilverAssets") na raiz do Drive da conta autenticada
const resolveRootFolder = async (drive) => {
  if (rootFolderIdCache) {
    return rootFolderIdCache;
  }

  const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'SilverAssets';

  // Se um ID fixo foi configurado manualmente, respeitar (compatibilidade)
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    rootFolderIdCache = process.env.GOOGLE_DRIVE_FOLDER_ID;
    return rootFolderIdCache;
  }

  console.log(`🔍 Procurando pasta raiz: "${rootFolderName}"`);

  const response = await drive.files.list({
    q: `name='${rootFolderName}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1
  });

  if (response.data.files && response.data.files.length > 0) {
    console.log(`✅ Pasta raiz encontrada: ${response.data.files[0].id}`);
    rootFolderIdCache = response.data.files[0].id;
    return rootFolderIdCache;
  }

  console.log(`📁 Pasta raiz "${rootFolderName}" não existe, criando...`);
  const folder = await drive.files.create({
    resource: {
      name: rootFolderName,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id, name'
  });

  console.log(`✅ Pasta raiz criada: ${folder.data.id}`);
  rootFolderIdCache = folder.data.id;
  return rootFolderIdCache;
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
    q: `name='${folderName}' and '${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
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
    body: Readable.from(file.buffer) // googleapis exige um stream, não um Buffer bruto
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

    // 0. Encontrar ou criar a pasta raiz "SilverAssets"
    const mainFolderId = await resolveRootFolder(drive);

    // 1. Encontrar ou criar pasta do cliente
    let clientFolder = await findClientFolder(drive, clientName, mainFolderId);
    
    if (!clientFolder) {
      clientFolder = await createClientFolder(drive, clientName, mainFolderId);
    }
    
    // 2. Upload do arquivo na pasta do cliente
    const uploadedFile = await uploadFileToFolder(drive, file, clientFolder.id, fieldId);
    
    // 3. Gerar URL pública
    const publicUrl = `https://drive.google.com/file/d/${uploadedFile.id}/view`; // link "abrir no Drive" (não usar em <img>)
    const directUrl = `https://drive.google.com/thumbnail?id=${uploadedFile.id}&sz=w1000`; // embutível em <img src>
    
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

    // Testar acesso à pasta raiz (encontra ou cria "SilverAssets")
    const mainFolderId = await resolveRootFolder(drive);

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