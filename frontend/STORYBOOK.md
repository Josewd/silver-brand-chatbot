# 📚 Storybook - Silver Brand Chatbot

Storybook é uma ferramenta para desenvolver componentes UI de forma isolada.

## 🚀 Como Rodar

```bash
cd frontend
npm run storybook
```

O Storybook abrirá em: http://localhost:6006

## 📖 Stories Disponíveis

### 1. **BriefingPreview** (Componentes/BriefingPreview)
Visualize o preview do briefing em diferentes estados:
- ✅ Preview Vazio - Como aparece no início
- ✅ Preview Parcial - Com alguns dados preenchidos
- ✅ Preview Completo - Todos campos preenchidos
- ✅ Preview Enviado - Após finalização
- ✅ Modo Fallback - Formulário manual (chat offline)
- ✅ Fallback Pronto para Enviar - Com campos obrigatórios

### 2. **Chat Messages** (Componentes/Chat/Mensagens)
Visualize os diferentes tipos de mensagens:
- ✅ Mensagem do Usuário
- ✅ Mensagem do Assistente
- ✅ Conversa Completa
- ✅ Mensagem com Loading (digitando...)

### 3. **Chat Checkboxes** (Componentes/Chat/Checkboxes)
Visualize os checkboxes de seleção:
- ✅ Checkboxes de Entrega
- ✅ Um Item Selecionado
- ✅ Vários Itens Selecionados
- ✅ Nenhum Item (selecionado "não preciso")

### 4. **Progress Bar** (Componentes/Chat/ProgressBar)
Visualize a barra de progresso em diferentes estágios:
- ✅ Início (0%)
- ✅ Contato Preenchido (15%)
- ✅ Meio do Processo (35%)
- ✅ Mais da Metade (60%)
- ✅ Quase Completo (85%)
- ✅ Completo (100%)

### 5. **Chat Completo** (Páginas/ChatCompleto)
Visualize a página completa do chat:
- ✅ Chat Vazio - Primeira interação
- ✅ Chat Ativo - Conversa em andamento
- ✅ Chat com Checkboxes - Seleção de itens
- ✅ Chat Loading - Aguardando resposta

## 🎨 Testando Interações

Todos os componentes são interativos! Você pode:
- ✏️ **Editar campos** no Preview do Briefing
- ☑️ **Clicar checkboxes** para testar seleção
- 💾 **Clicar botões** para ver logs no console
- 🎯 **Testar responsividade** redimensionando a janela

## 📝 Dicas de Uso

1. **Controls Tab**: Modifique props dos componentes em tempo real
2. **Actions Tab**: Veja eventos disparados (cliques, mudanças, etc)
3. **Accessibility Tab**: Verifica acessibilidade do componente
4. **Docs Tab**: Documentação automática gerada

## 🔧 Adicionando Novas Stories

Crie um arquivo `*.stories.jsx` em `src/stories/`:

```jsx
export default {
  title: 'Caminho/NomeComponente',
  component: SeuComponente,
  tags: ['autodocs'],
}

export const ExemploBasico = {
  args: {
    propriedade: 'valor',
  },
}
```

## 🎯 Para Que Serve?

✅ **Desenvolvimento Isolado**: Desenvolva componentes sem rodar o app inteiro
✅ **Documentação Viva**: Exemplos visuais de como usar cada componente
✅ **Testes Visuais**: Veja todos os estados possíveis do componente
✅ **Design System**: Crie uma biblioteca de componentes reutilizáveis
✅ **Comunicação**: Mostre componentes para designers/clientes

## 📦 Build para Produção

```bash
npm run build-storybook
```

Gera uma versão estática em `storybook-static/` que pode ser deployada.

## 🌐 Deploy do Storybook

Você pode hospedar o Storybook gratuitamente em:
- **Chromatic**: Integração nativa
- **GitHub Pages**: Estático
- **Netlify/Vercel**: Deploy automático

---

**Divirta-se explorando os componentes!** 🎉
