# 📡 EXEMPLOS DE USO DA API

## URL Base
```
Local:      http://localhost:8000
Produção:   https://sua-api.render.com
```

---

## 1. Criar Nova Sessão (Designer)

### Request
```bash
curl -X POST http://localhost:8000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Pradella Coffee",
    "client_email": "contato@pradellacoffee.com",
    "client_phone": "+353 87 123 4567",
    "initial_context": "Cliente quer identidade visual para cafeteria artesanal brasileira na Irlanda. Público-alvo são brasileiros expatriados."
  }'
```

### Response
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chat_url": "http://localhost:5173/chat/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## 2. Ver Status da Sessão

### Request
```bash
curl http://localhost:8000/api/session/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_name": "Pradella Coffee",
  "progress": 45,
  "current_section": "posicionamento",
  "is_completed": false,
  "created_at": "2026-07-01T14:30:00.000Z",
  "briefing_data": {
    "client_name": "Pradella Coffee",
    "client_email": "contato@pradellacoffee.com",
    "company_description": "Comida artesanal brasileira..."
  }
}
```

---

## 3. Enviar Mensagem no Chat (Cliente)

### Request
```bash
curl -X POST http://localhost:8000/api/chat/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá! Estou pronto para começar o briefing."
  }'
```

### Response
```json
{
  "reply": "Que ótimo! 👋 Vamos começar com algumas informações básicas sobre sua empresa.\n\nQual é o nome completo dela?",
  "progress": 5,
  "current_section": "contato",
  "is_completed": false
}
```

---

## 4. Ver Histórico da Conversa

### Request
```bash
curl http://localhost:8000/api/chat/a1b2c3d4-e5f6-7890-abcd-ef1234567890/history
```

### Response
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "messages": [
    {
      "role": "user",
      "content": "Olá! Estou pronto para começar.",
      "timestamp": "2026-07-01T14:30:15.000Z"
    },
    {
      "role": "assistant",
      "content": "Que ótimo! 👋 Vamos começar...",
      "timestamp": "2026-07-01T14:30:16.500Z"
    },
    {
      "role": "user",
      "content": "Pradella Coffee",
      "timestamp": "2026-07-01T14:31:20.000Z"
    }
  ]
}
```

---

## 5. Ver Dados do Briefing Coletados

### Request
```bash
curl http://localhost:8000/api/briefing/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_name": "Pradella Coffee",
  "progress": 100,
  "is_completed": true,
  "data": {
    "client_name": "Pradella Coffee",
    "client_email": "contato@pradellacoffee.com",
    "client_phone": "+353 87 123 4567",
    "city_state": "Navan, Irlanda",
    "website": "instagram.com/pradellacoffee",
    "project_type": "Projeto novo",
    "deadline": "2 meses",
    "company_description": "Comida artesanal brasileira...",
    "products_services": "Pão de queijo artesanal congelado...",
    "keywords": "Autêntico, Artesanal, Saboroso",
    "preferred_colors": "Amarelo e verde (cores do Brasil)",
    "logo_types": "Símbolo + tipografia"
  }
}
```

---

## 6. Gerar PDF do Briefing

### Request
```bash
curl -X POST http://localhost:8000/api/briefing/a1b2c3d4-e5f6-7890-abcd-ef1234567890/generate-pdf
```

### Response
```json
{
  "pdf_url": "/api/briefing/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download"
}
```

---

## 7. Baixar PDF do Briefing

### Request
```bash
curl http://localhost:8000/api/briefing/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download \
  --output briefing_pradella_coffee.pdf
```

### Response
```
Arquivo PDF baixado: briefing_pradella_coffee.pdf
```

---

## 8. Listar Todas as Sessões (Admin)

### Request
```bash
curl http://localhost:8000/api/admin/sessions
```

### Response
```json
{
  "sessions": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "client_name": "Pradella Coffee",
      "progress": "100",
      "is_completed": true,
      "created_at": "2026-07-01T14:30:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "client_name": "TechStartup XYZ",
      "progress": "65",
      "is_completed": false,
      "created_at": "2026-07-01T15:00:00.000Z"
    }
  ]
}
```

---

## 9. Health Check

### Request
```bash
curl http://localhost:8000/health
```

### Response
```json
{
  "status": "ok",
  "ai_provider": "gemini"
}
```

---

## Exemplos de Integração

### JavaScript/TypeScript
```javascript
// Criar sessão
async function createSession(clientName, context) {
  const response = await fetch('http://localhost:8000/api/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: clientName,
      initial_context: context
    })
  });
  
  return await response.json();
}

// Enviar mensagem
async function sendMessage(sessionId, message) {
  const response = await fetch(`http://localhost:8000/api/chat/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  
  return await response.json();
}

// Uso
const session = await createSession('Pradella Coffee', 'Cafeteria artesanal');
console.log('Link do chat:', session.chat_url);

const reply = await sendMessage(session.session_id, 'Olá!');
console.log('Bot respondeu:', reply.reply);
```

### Python
```python
import requests

# Criar sessão
def create_session(client_name, context):
    response = requests.post(
        'http://localhost:8000/api/session/create',
        json={
            'client_name': client_name,
            'initial_context': context
        }
    )
    return response.json()

# Enviar mensagem
def send_message(session_id, message):
    response = requests.post(
        f'http://localhost:8000/api/chat/{session_id}',
        json={'message': message}
    )
    return response.json()

# Uso
session = create_session('Pradella Coffee', 'Cafeteria artesanal')
print('Link do chat:', session['chat_url'])

reply = send_message(session['session_id'], 'Olá!')
print('Bot respondeu:', reply['reply'])
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 404 | Não encontrado (sessão não existe) |
| 500 | Erro interno do servidor |

---

## Rate Limiting

Atualmente não há rate limiting implementado, mas recomenda-se:
- Máximo 60 requisições/minuto por IP
- Máximo 1000 mensagens/dia por sessão

Para produção, considere implementar rate limiting com `slowapi`.

---

## Autenticação

Atualmente o sistema usa **links únicos** como forma de autenticação. O UUID da sessão funciona como um token de acesso.

Para adicionar autenticação mais robusta no futuro:
- JWT tokens
- OAuth2 para dashboard admin
- API keys para integrações

---

## Webhooks (Futuro)

Planejado para futuras versões:
```json
POST https://seu-webhook.com/briefing-completed
{
  "event": "briefing.completed",
  "session_id": "abc123",
  "client_name": "Pradella Coffee",
  "completed_at": "2026-07-01T15:45:00Z"
}
```

---

## Suporte

Para mais informações:
- **Documentação**: Ver `README.md`, `INSTALACAO.md`, `VISAO_GERAL.md`
- **Email**: brandhousesilver@gmail.com
- **WhatsApp**: +55 11 96015 7100
