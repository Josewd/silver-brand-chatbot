const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configurar multer para upload de arquivos
// Na Vercel, usar memória storage pois filesystem não é persistente
const storage = process.env.VERCEL 
  ? multer.memoryStorage() // Para Vercel - arquivos em memória
  : multer.diskStorage({   // Para desenvolvimento local
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const filename = `${req.body.fieldId || 'upload'}-${uniqueSuffix}${fileExtension}`;
        cb(null, filename);
      }
    });

// Filtro de arquivos - imagens e documentos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem e documentos são permitidos!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite
  }
});

// Middleware de autenticação
const authenticateClient = (req, res, next) => {
  const clientToken = req.headers['x-client-token'];
  
  if (!clientToken) {
    return res.status(401).json({ error: 'Token de cliente necessário' });
  }
  
  req.clientToken = clientToken;
  next();
};

// Rota para upload de arquivo único
router.post('/', authenticateClient, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    console.log('📁 Upload recebido:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fieldId: req.body.fieldId
    });

    if (process.env.VERCEL) {
      // Na Vercel, retornar dados do arquivo em base64 para armazenamento temporário
      const base64Data = req.file.buffer.toString('base64');
      const dataURL = `data:${req.file.mimetype};base64,${base64Data}`;
      
      console.log('☁️ Vercel: Arquivo convertido para base64');
      
      res.json({
        success: true,
        url: dataURL, // Data URL para preview
        filename: req.file.originalname,
        originalName: req.file.originalname,
        size: req.file.size,
        fieldId: req.body.fieldId,
        isTemporary: true
      });
    } else {
      // No ambiente local, salvar arquivo no disco
      const baseUrl = req.protocol + '://' + req.get('host');
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      console.log('💾 Local: Arquivo salvo em:', req.file.path);
      console.log('🌐 URL gerada:', fileUrl);
      
      // Verificar se o arquivo foi realmente salvo
      if (!fs.existsSync(req.file.path)) {
        throw new Error('Arquivo não foi salvo corretamente no disco');
      }
      
      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        fieldId: req.body.fieldId,
        isTemporary: false,
        serverPath: req.file.path // Para debug
      });
    }

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Rota de teste para verificar configuração
router.get('/test', (req, res) => {
  const uploadDir = path.join(__dirname, '../../uploads');
  const baseUrl = req.protocol + '://' + req.get('host');
  
  res.json({
    message: 'Rota de upload funcionando',
    uploadDir: uploadDir,
    uploadDirExists: fs.existsSync(uploadDir),
    baseUrl: baseUrl,
    staticRoute: `${baseUrl}/uploads/`,
    environment: process.env.VERCEL ? 'vercel' : 'local',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Rota para listar arquivos do diretório uploads (debug)
router.get('/list', authenticateClient, (req, res) => {
  try {
    if (process.env.VERCEL) {
      return res.json({ 
        message: 'Lista de arquivos não disponível na Vercel',
        files: [] 
      });
    }
    
    const uploadDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({
        message: 'Diretório de uploads não existe',
        files: [],
        uploadDir: uploadDir
      });
    }
    
    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      const baseUrl = req.protocol + '://' + req.get('host');
      
      return {
        name: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `${baseUrl}/uploads/${filename}`,
        exists: fs.existsSync(filePath)
      };
    });
    
    res.json({
      uploadDir: uploadDir,
      totalFiles: files.length,
      files: files
    });
    
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Rota para download de arquivo específico
router.get('/download/:filename', authenticateClient, (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
    }
    
    // Verificar se estamos no Vercel (arquivos não persistem)
    if (process.env.VERCEL) {
      return res.status(404).json({ 
        error: 'Arquivo não disponível para download',
        message: 'Arquivos não são persistentes na Vercel. Use a URL base64 para download.' 
      });
    }
    
    // No ambiente local, verificar se arquivo existe
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);
    
    // Verificar se arquivo existe e está dentro do diretório de uploads (segurança)
    if (!filePath.startsWith(uploadDir)) {
      return res.status(400).json({ error: 'Caminho de arquivo inválido' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Arquivo não encontrado',
        message: 'O arquivo pode ter sido removido ou o upload falhou.' 
      });
    }
    
    // Definir headers apropriados para download
    const stat = fs.statSync(filePath);
    const mimeType = getMimeType(path.extname(filename));
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream do arquivo para o cliente
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Erro ao ler arquivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao ler arquivo' });
      }
    });
    
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para determinar MIME type
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// Rota para verificar se um arquivo existe (healthcheck)
router.head('/check/:filename', authenticateClient, (req, res) => {
  try {
    const { filename } = req.params;
    
    if (process.env.VERCEL) {
      // Na Vercel, arquivos não persistem - sempre retornar 404
      return res.status(404).end();
    }
    
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);
    
    if (!filePath.startsWith(uploadDir) || !fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', getMimeType(path.extname(filename)));
    res.status(200).end();
    
  } catch (error) {
    console.error('Erro ao verificar arquivo:', error);
    res.status(500).end();
  }
});

// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
  }
  
  if (error.message === 'Apenas arquivos de imagem são permitidos!') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Erro no upload:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = router;