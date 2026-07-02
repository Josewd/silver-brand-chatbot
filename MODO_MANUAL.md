# Switch de Modo Manual no Briefing

## 📋 Visão Geral

Implementação de um switch no BriefingPreview que permite ao usuário alternar entre:
- **Modo Chat (Somente Leitura)**: Visualização dos dados coletados via chat
- **Modo Edição Manual**: Preenchimento direto de todos os campos

## 🎯 Motivação

Quando o chatbot fica indisponível (alto volume, erro da API, etc.), o cliente precisa de uma alternativa para continuar preenchendo o briefing sem perder o progresso.

## ✨ Funcionalidades

### 1. Switch no Header do Preview

Localizado no cabeçalho do preview, permite toggle entre modos:

```jsx
<div className="mode-switch">
  <label className="switch-label">
    <input type="checkbox" checked={manualMode} onChange={...} />
    <span className="switch-slider"></span>
    <span className="switch-text">
      {manualMode ? '✏️ Modo Edição Manual' : '💬 Modo Chat (Somente Leitura)'}
    </span>
  </label>
</div>
```

### 2. Detecção Automática de Erros

O `ChatPage` detecta mensagens de erro da IA:

```javascript
const isErrorMessage = data.reply && (
  data.reply.includes('alto volume de uso') ||
  data.reply.includes('sistema está com') ||
  data.reply.includes('tente novamente em alguns minutos') ||
  data.reply.includes('Desculpe, nosso sistema')
)
```

### 3. Ativação Automática do Modo Manual

Quando um erro é detectado:
1. `fallbackMode` é ativado automaticamente
2. Preview é aberto no lado direito
3. Switch é ativado para Modo Edição Manual
4. Mensagem informativa aparece no chat

### 4. Mensagem Informativa no Chat

Uma mensagem do tipo "system" é inserida:

```javascript
const infoMessage = {
  role: 'system',
  content: '💡 Dica: Você pode preencher o briefing manualmente! Ative o modo de edição no painel lateral usando o switch "Modo Edição Manual".',
  timestamp: new Date().toISOString()
}
```

Estilizada com gradiente roxo e animação de brilho para destacar.

## 🎨 Estilo Visual

### Switch Toggle

- **Off (Modo Chat)**: Cinza
- **On (Modo Manual)**: Dourado (#d4af37)
- Animação suave de transição
- Bolinha deslizante

### Mensagem System

- Gradiente: `#667eea` → `#764ba2`
- Texto branco, centralizado
- Sombra com efeito glow pulsante
- Animação `slideIn` + `glow`

## 🔄 Comportamento dos Campos

### Modo Chat (Somente Leitura)
- Campos aparecem apenas se preenchidos
- Editáveis, mas atualizações são enviadas ao backend

### Modo Manual
- **Todos os campos** aparecem (mesmo vazios)
- Placeholders informativos: "Digite [campo]..."
- Botões "Salvar Progresso" e "Finalizar e Enviar" disponíveis

## 📂 Arquivos Modificados

### `frontend/src/components/BriefingPreview.jsx`
- Adicionado state `manualMode`
- `useEffect` para ativar automaticamente quando `fallbackMode` muda
- Switch UI no header
- Lógica de renderização atualizada para considerar `manualMode`

### `frontend/src/components/BriefingPreview.css`
- Estilos para `.mode-switch`
- `.switch-label`, `.switch-checkbox`, `.switch-slider`
- Animação de transição do switch

### `frontend/src/pages/ChatPage.jsx`
- Detecção de mensagens de erro
- Ativação automática de `fallbackMode`
- Inserção de mensagem `system` no chat
- Renderização condicional para mensagens do tipo `system`

### `frontend/src/pages/ChatPage.css`
- Estilos para `.system-message`
- Gradiente e animação `glow`

## 🧪 Como Testar

1. **Simular erro da IA:**
   - Modificar resposta da IA para incluir "alto volume de uso"
   - Verificar se fallback ativa automaticamente
   - Confirmar que preview abre e switch está em "Manual"
   - Verificar mensagem informativa no chat

2. **Toggle manual:**
   - Abrir preview normalmente
   - Clicar no switch
   - Verificar se todos os campos aparecem
   - Preencher um campo vazio
   - Salvar progresso

3. **Backward compatibility:**
   - Sessões antigas devem funcionar normalmente
   - Switch começa em "Chat" por padrão

## 💡 Fluxo do Usuário

### Cenário 1: Chat Funcional
```
1. Cliente conversa com IA
2. Preview mostra dados coletados (modo leitura)
3. Cliente pode ativar modo manual se preferir preencher diretamente
```

### Cenário 2: Chat Indisponível
```
1. Cliente envia mensagem
2. IA responde: "Desculpe, nosso sistema está com alto volume..."
3. ⚡ Sistema detecta erro automaticamente
4. Preview abre + Switch ativado para Manual
5. 💡 Mensagem aparece: "Você pode preencher manualmente!"
6. Cliente continua preenchendo sem bloqueio
```

## 🚀 Melhorias Futuras

1. **Sincronização bi-direcional**: Dados editados manualmente aparecem no histórico do chat
2. **Validação em tempo real**: Indicar campos obrigatórios faltando
3. **Auto-save**: Salvar automaticamente a cada X segundos em modo manual
4. **Modo híbrido**: Combinar chat + edição manual simultaneamente

## 📝 Observações

- O switch é **sempre visível** no preview
- `fallbackMode` (prop do componente) força modo manual automaticamente
- `manualMode` (state interno) pode ser controlado manualmente pelo usuário
- Mensagens `system` não mostram timestamp (são informativas, não conversacionais)
