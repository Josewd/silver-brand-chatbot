/**
 * Script de configuração única para obter um refresh_token do Google OAuth 2.0
 * para a conta que vai "possuir" os uploads no Google Drive (pasta SilverAssets).
 *
 * Como usar:
 *   1. Garanta que GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e
 *      GOOGLE_OAUTH_REDIRECT_URI estão preenchidos no backend/.env
 *   2. No Google Cloud Console, adicione o mesmo valor de GOOGLE_OAUTH_REDIRECT_URI
 *      como "Authorized redirect URI" do client OAuth (tipo Web application).
 *   3. Rode: node scripts/google-drive-oauth-setup.js
 *   4. Abra a URL impressa no terminal, faça login com a conta Google que vai
 *      guardar os arquivos, e aceite as permissões.
 *   5. O script captura o retorno automaticamente e imprime o refresh_token.
 *   6. Copie o refresh_token para GOOGLE_OAUTH_REFRESH_TOKEN no .env (local e no
 *      painel de variáveis de ambiente do Render/Vercel). NUNCA cometa esse valor no git.
 */

require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8080/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no backend/.env antes de rodar este script.');
  process.exit(1);
}

const redirectUrl = new URL(REDIRECT_URI);
const port = Number(redirectUrl.port) || 8080;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Escopo mínimo: o app só vê/gerencia arquivos e pastas que ele mesmo cria.
// Por isso a pasta SilverAssets deve ser criada por este mesmo fluxo (o script
// de setup não cria a pasta - isso acontece automaticamente no primeiro upload).
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // necessário para receber um refresh_token
  prompt: 'consent',      // força o Google a emitir refresh_token mesmo se já autorizado antes
  scope: SCOPES
});

console.log('\n============================================================');
console.log('1) Abra esta URL no navegador e faça login com a conta que');
console.log('   vai guardar os arquivos (pasta SilverAssets):\n');
console.log(authUrl);
console.log('\n2) Aguardando o retorno do Google em', REDIRECT_URI, '...');
console.log('============================================================\n');

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, REDIRECT_URI);

    if (requestUrl.pathname !== redirectUrl.pathname) {
      res.writeHead(404);
      res.end();
      return;
    }

    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Autorização negada</h1><p>${error}</p>`);
      console.error('❌ Autorização negada pelo Google:', error);
      server.close();
      process.exit(1);
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end('Código de autorização ausente.');
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>✅ Autorizado!</h1><p>Pode voltar para o terminal. Esta janela já pode ser fechada.</p>');

    console.log('\n============================================================');
    if (tokens.refresh_token) {
      console.log('✅ Refresh token obtido com sucesso. Copie a linha abaixo para o seu .env:\n');
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log('⚠️  O Google não retornou um refresh_token desta vez.');
      console.log('   Isso acontece se essa conta já autorizou este app antes sem "prompt=consent".');
      console.log('   Revogue o acesso em https://myaccount.google.com/permissions e rode o script novamente.');
    }
    console.log('============================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao trocar o código por tokens:', err.message);
    res.writeHead(500);
    res.end('Erro ao processar autorização. Veja o terminal.');
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`🔊 Servidor local aguardando o redirect na porta ${port}...`);
});
