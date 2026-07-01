# ✅ CHECKLIST DE VALIDAÇÃO — Silver Brand Chatbot

Use este checklist para validar que tudo está funcionando corretamente.

---

## 📦 1. Instalação

### Backend
- [ ] Python 3.11+ instalado
- [ ] Ambiente virtual criado (`python -m venv venv`)
- [ ] Ambiente ativado (`source venv/bin/activate`)
- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Arquivo `.env` criado e configurado
- [ ] API key configurada (GEMINI_API_KEY ou GROQ_API_KEY)

### Frontend
- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` criado com `VITE_API_URL`

---

## 🧪 2. Testes Iniciais

- [ ] Executar `python test_system.py`
- [ ] Todos os testes passaram (5/5)
- [ ] Banco de dados criado em `database/sessions.db`
- [ ] Pasta `generated_pdfs/` criada

---

## 🚀 3. Rodar o Sistema

### Backend
- [ ] Backend iniciado: `uvicorn app.main:app --reload --port 8000`
- [ ] Sem erros no console
- [ ] Acessar http://localhost:8000 retorna `{"status": "running", ...}`
- [ ] Acessar http://localhost:8000/health retorna `{"status": "ok", ...}`
- [ ] Acessar http://localhost:8000/docs mostra documentação Swagger

### Frontend
- [ ] Frontend iniciado: `npm run dev`
- [ ] Sem erros no console
- [ ] Acessar http://localhost:5173 redireciona para `/admin`
- [ ] Página admin carrega corretamente

---

## 🎨 4. Teste de Fluxo Completo

### Criar Sessão
- [ ] Acessar http://localhost:5173/admin
- [ ] Clicar em "➕ Nova Sessão"
- [ ] Preencher formulário:
  - Nome: "Teste Cliente"
  - Email: teste@email.com
  - Contexto: "Teste do sistema"
- [ ] Clicar em "Criar Sessão"
- [ ] Mensagem de sucesso aparece
- [ ] Link do chat é gerado
- [ ] Botão "📋 Copiar" funciona
- [ ] Nova sessão aparece na lista

### Testar Chat
- [ ] Copiar link do chat
- [ ] Abrir em nova aba (ou clicar em "👁️ Ver Chat")
- [ ] Página do chat carrega
- [ ] Header mostra "Silver Brand House" e nome do cliente
- [ ] Barra de progresso mostra 0%
- [ ] Mensagem de boas-vindas aparece
- [ ] Campo de input está habilitado

### Conversa com Bot
- [ ] Enviar mensagem: "Olá!"
- [ ] Bot responde (pode levar 2-5 segundos)
- [ ] Animação de "digitando" aparece
- [ ] Resposta do bot é natural e amigável
- [ ] Mensagem aparece no histórico
- [ ] Enviar mensagem: "Meu nome é Teste"
- [ ] Bot responde apropriadamente
- [ ] Progresso aumenta (ex: 5%)

### Simular Briefing Completo
Para testar rapidamente, responda estas perguntas básicas:

1. **Nome da empresa**: "Teste Coffee"
2. **Email**: teste@coffee.com
3. **Telefone**: +55 11 99999-9999
4. **Cidade**: "São Paulo, SP"
5. **Website**: instagram.com/testecoffee
6. **Tipo de projeto**: "Projeto novo"
7. **Prazo**: "2 meses"
8. **Sobre a empresa**: "Cafeteria artesanal"
9. **Produtos**: "Café especial e doces"
10. **Diferencial**: "Grãos selecionados"
11. **Como quer ser percebida**: "Moderna e acolhedora"
12. **3 palavras**: "Qualidade, Aconchego, Sabor"
13. **Cores que gosta**: "Marrom e bege"
14. **Cores que não quer**: "Rosa"
15. **Tipo de logo**: "Símbolo + tipografia"

- [ ] Bot conduz conversa naturalmente
- [ ] Progresso aumenta gradualmente
- [ ] Bot valida informações importantes
- [ ] Bot oferece ajuda quando necessário
- [ ] Chegou a 100% de progresso

### Geração e Download de PDF
- [ ] Mensagem de conclusão aparece
- [ ] Botões "Gerar PDF" e "Baixar PDF" aparecem
- [ ] Clicar em "Gerar PDF"
- [ ] Mensagem de sucesso
- [ ] Clicar em "Baixar PDF"
- [ ] PDF é baixado
- [ ] Abrir PDF e verificar:
  - [ ] Cabeçalho com "SILVER BRAND HOUSE"
  - [ ] Nome do cliente correto
  - [ ] Seções organizadas (1-8)
  - [ ] Informações preenchidas corretamente
  - [ ] Rodapé com contatos

### Verificar Dashboard Admin
- [ ] Voltar para http://localhost:5173/admin
- [ ] Sessão de teste aparece na lista
- [ ] Status mostra "✓ Completo"
- [ ] Progresso mostra 100%
- [ ] Botão "📄 Baixar PDF" aparece
- [ ] Clicar em "📄 Baixar PDF" baixa o mesmo PDF

---

## 🔍 5. Testes de Edge Cases

### Chat
- [ ] Enviar mensagem vazia não faz nada
- [ ] Mensagens muito longas são tratadas
- [ ] Caracteres especiais (emojis, acentos) funcionam
- [ ] Histórico persiste ao recarregar página

### Sessão
- [ ] Acessar link de sessão inexistente mostra erro
- [ ] Criar sessão sem nome mostra erro de validação
- [ ] Criar múltiplas sessões funciona

### PDF
- [ ] Gerar PDF sem completar briefing funciona (com campos vazios)
- [ ] Gerar PDF múltiplas vezes funciona
- [ ] Baixar PDF inexistente mostra erro apropriado

---

## 🌐 6. Testes de API (Opcional)

### Health Check
```bash
curl http://localhost:8000/health
```
- [ ] Retorna `{"status": "ok", ...}`

### Criar Sessão
```bash
curl -X POST http://localhost:8000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"client_name": "API Test"}'
```
- [ ] Retorna `{"session_id": "...", "chat_url": "..."}`

### Ver Sessão
```bash
curl http://localhost:8000/api/session/{SESSION_ID}
```
- [ ] Retorna dados da sessão

### Enviar Mensagem
```bash
curl -X POST http://localhost:8000/api/chat/{SESSION_ID} \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá"}'
```
- [ ] Retorna resposta do bot

---

## 📱 7. Testes de Responsividade

### Desktop
- [ ] Testar em Chrome
- [ ] Testar em Firefox
- [ ] Testar em Safari (se disponível)
- [ ] Layout funciona em 1920x1080
- [ ] Layout funciona em 1366x768

### Tablet
- [ ] Testar em iPad (ou DevTools)
- [ ] Layout se adapta (768x1024)
- [ ] Chat é usável
- [ ] Admin é usável

### Mobile
- [ ] Testar em iPhone (ou DevTools)
- [ ] Layout se adapta (375x667)
- [ ] Chat é usável
- [ ] Input não é coberto pelo teclado virtual
- [ ] Scroll funciona corretamente

---

## 🐛 8. Verificação de Erros

### Console do Browser
- [ ] Sem erros no console (F12)
- [ ] Sem warnings críticos
- [ ] Requests da API têm status 200

### Console do Backend
- [ ] Sem erros não tratados
- [ ] Logs aparecem corretamente
- [ ] Sem warnings de deprecation críticos

### Logs
- [ ] Mensagens são logadas: `[INFO]`
- [ ] Erros são logados: `[ERROR]`
- [ ] Request logs aparecem

---

## 🔒 9. Segurança Básica

- [ ] Links de sessão usam UUID (não sequencial)
- [ ] Não há exposição de API keys no frontend
- [ ] `.env` está no `.gitignore`
- [ ] Senhas/secrets não estão commitadas
- [ ] CORS está configurado corretamente

---

## 📊 10. Performance

### Backend
- [ ] API responde em < 500ms (requests simples)
- [ ] IA responde em < 5s (requests com IA)
- [ ] Geração de PDF em < 3s

### Frontend
- [ ] Página carrega em < 2s
- [ ] Chat responde instantaneamente ao usuário
- [ ] Scroll é suave
- [ ] Sem travamentos

---

## ✨ 11. UX/UI

### Visual
- [ ] Cores da Silver Brand estão corretas (roxo/azul)
- [ ] Fontes são legíveis
- [ ] Contraste é adequado
- [ ] Botões têm hover states
- [ ] Loading states são claros

### Interação
- [ ] Feedback visual ao enviar mensagem
- [ ] Progresso atualiza em tempo real
- [ ] Erros são mostrados claramente
- [ ] Sucesso é celebrado
- [ ] Transições são suaves

---

## 🚀 12. Preparação para Deploy

### Código
- [ ] Código está commitado no Git
- [ ] `.gitignore` está configurado
- [ ] README está atualizado
- [ ] Documentação está completa

### Configuração
- [ ] Variáveis de ambiente documentadas
- [ ] `render.yaml` está configurado
- [ ] `Procfile` está configurado
- [ ] `build.sh` está executável

### Testes
- [ ] Todos os testes passam
- [ ] Nenhum console.log desnecessário
- [ ] Nenhum TODO crítico no código

---

## 📈 13. Critérios de Sucesso

Para considerar o sistema pronto para uso real:

- [x] ✅ Backend roda sem erros
- [x] ✅ Frontend roda sem erros
- [x] ✅ Chat funciona end-to-end
- [x] ✅ PDF é gerado corretamente
- [x] ✅ Múltiplas sessões funcionam
- [ ] ✅ Testado com 3+ usuários reais
- [ ] ✅ Feedback positivo dos testadores
- [ ] ✅ Deploy em produção funcionando

---

## 🎓 14. Checklist de Conhecimento

Você sabe:
- [ ] Como criar uma nova sessão
- [ ] Como enviar o link para o cliente
- [ ] Como acompanhar o progresso
- [ ] Como baixar o PDF
- [ ] Como reiniciar o backend se necessário
- [ ] Como ver logs de erros
- [ ] Como adicionar nova API key se expirar
- [ ] Onde estão os arquivos de configuração

---

## 📞 15. Suporte

Se algo não funcionar:
1. ✅ Verificar este checklist
2. ✅ Ler documentação (`INSTALACAO.md`, `VISAO_GERAL.md`)
3. ✅ Executar `python test_system.py`
4. ✅ Verificar logs do backend e frontend
5. ✅ Verificar `.env` está configurado
6. ⚠️ Contatar: brandhousesilver@gmail.com

---

## 🎉 Pronto!

Se você marcou ✅ em todos os itens essenciais, o sistema está pronto para uso!

**Próximo passo**: Fazer deploy em produção (Render + Vercel)
