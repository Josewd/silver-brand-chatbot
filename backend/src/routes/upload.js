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

// Filtro de arquivos - apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'));
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

    if (process.env.VERCEL) {
      // Na Vercel, retornar dados do arquivo em base64 para armazenamento temporário
      const base64Data = req.file.buffer.toString('base64');
      const dataURL = `data:${req.file.mimetype};base64,${base64Data}`;
      
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

      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        fieldId: req.body.fieldId,
        isTemporary: false
      });
    }

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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