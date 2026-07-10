// Serviço para upload direto ao Google Drive no frontend com organização por cliente
class GoogleDriveUploadService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    this.mainFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID; // Silver-assets
    this.clientFoldersCache = new Map(); // Cache de pastas de clientes
  }

  async uploadFile(file, fieldId, clientName) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Google Drive não configurado. Verifique VITE_GOOGLE_API_KEY no .env');
      }

      console.log('📤 Iniciando upload para Google Drive:', file.name);
      console.log('👤 Cliente:', clientName);

      // 1. Encontrar ou criar pasta do cliente
      const clientFolderId = await this.getOrCreateClientFolder(clientName);
      
      // 2. Fazer upload do arquivo na pasta do cliente
      const uploadResult = await this.uploadFileToFolder(file, fieldId, clientFolderId);
      
      return uploadResult;

    } catch (error) {
      console.error('❌ Erro no upload para Google Drive:', error);
      throw error;
    }
  }

  async getOrCreateClientFolder(clientName) {
    try {
      // Sanitizar nome do cliente para usar como nome de pasta
      const folderName = this.sanitizeFolderName(clientName);
      
      console.log('📁 Procurando/criando pasta para cliente:', folderName);
      
      // Verificar cache primeiro
      if (this.clientFoldersCache.has(folderName)) {
        const cachedId = this.clientFoldersCache.get(folderName);
        console.log('💾 Pasta encontrada no cache:', cachedId);
        return cachedId;
      }
      
      // Procurar pasta existente
      const existingFolder = await this.searchClientFolder(folderName);
      
      if (existingFolder) {
        console.log('✅ Pasta do cliente já existe:', existingFolder.id);
        this.clientFoldersCache.set(folderName, existingFolder.id);
        return existingFolder.id;
      }
      
      // Criar nova pasta
      const newFolder = await this.createClientFolder(folderName);
      console.log('🆕 Nova pasta criada para cliente:', newFolder.id);
      this.clientFoldersCache.set(folderName, newFolder.id);
      return newFolder.id;
      
    } catch (error) {
      console.error('❌ Erro ao gerenciar pasta do cliente:', error);
      throw error;
    }
  }

  async searchClientFolder(folderName) {
    try {
      // Buscar pastas filhas na pasta principal (Silver-assets)
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=name='${folderName}' and '${this.mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false` +
        `&key=${this.apiKey}`,
        {
          method: 'GET'
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar pasta: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.files && result.files.length > 0) {
        return result.files[0]; // Primeira pasta encontrada
      }
      
      return null; // Pasta não encontrada
      
    } catch (error) {
      console.error('❌ Erro ao buscar pasta do cliente:', error);
      throw error;
    }
  }

  async createClientFolder(folderName) {
    try {
      console.log('🆕 Criando nova pasta:', folderName);
      
      const metadata = {
        name: folderName,
        parents: [this.mainFolderId], // Dentro da pasta Silver-assets
        mimeType: 'application/vnd.google-apps.folder'
      };

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao criar pasta: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Tornar pasta pública (opcional)
      await this.makeFilePublic(result.id);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao criar pasta do cliente:', error);
      throw error;
    }
  }

  async uploadFileToFolder(file, fieldId, folderId) {
    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const extension = file.name.split('.').pop();
      const fileName = `${fieldId}-${timestamp}-${randomId}.${extension}`;

      console.log('📤 Upload do arquivo:', fileName);
      console.log('📁 Destino:', folderId);

      // Upload usando multipart form data
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      // Preparar metadados
      const metadata = {
        name: fileName,
        parents: [folderId] // Pasta do cliente específico
      };

      // Construir body multipart
      let body = delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) + delimiter +
        `Content-Type: ${file.type}\r\n\r\n`;

      // Converter arquivo para array buffer
      const fileArrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileArrayBuffer);

      // Combinar tudo
      const bodyArray = new Uint8Array(
        new TextEncoder().encode(body).length + 
        uint8Array.length + 
        new TextEncoder().encode(close_delim).length
      );

      let offset = 0;
      const bodyBytes = new TextEncoder().encode(body);
      bodyArray.set(bodyBytes, offset);
      offset += bodyBytes.length;
      bodyArray.set(uint8Array, offset);
      offset += uint8Array.length;
      bodyArray.set(new TextEncoder().encode(close_delim), offset);

      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: bodyArray
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da API:', errorText);
        throw new Error(`Upload falhou: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Arquivo enviado para Google Drive:', result.id);

      // Tornar arquivo público
      await this.makeFilePublic(result.id);

      // Gerar URLs
      const publicUrl = `https://drive.google.com/uc?id=${result.id}`;
      const directUrl = `https://lh3.googleusercontent.com/d/${result.id}`;

      return {
        success: true,
        id: result.id,
        name: fileName,
        originalName: file.name,
        url: publicUrl,
        directUrl: directUrl,
        size: file.size,
        type: file.type,
        uploaded: true,
        storage: 'google-drive',
        clientFolder: folderId
      };

    } catch (error) {
      console.error('❌ Erro no upload do arquivo:', error);
      throw error;
    }
  }

  async makeFilePublic(fileId) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        }
      );

      if (response.ok) {
        console.log('🌐 Arquivo tornado público no Google Drive');
      } else {
        console.warn('⚠️ Não foi possível tornar arquivo público:', response.statusText);
      }

    } catch (error) {
      console.warn('⚠️ Erro ao tornar arquivo público:', error);
    }
  }

  sanitizeFolderName(clientName) {
    if (!clientName || typeof clientName !== 'string') {
      return 'Cliente-Sem-Nome';
    }
    
    // Remover caracteres especiais e normalizar
    return clientName
      .trim()
      .replace(/[<>:"/\\|?*]/g, '') // Remover caracteres proibidos
      .replace(/\s+/g, '-') // Espaços viram hífens
      .substring(0, 50) // Máximo 50 caracteres
      || 'Cliente-Sem-Nome';
  }

  // Verificar se o serviço está configurado
  isConfigured() {
    return !!(this.apiKey && this.mainFolderId);
  }
}

export default GoogleDriveUploadService;