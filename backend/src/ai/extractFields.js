// Interface trocável para diferentes provedores de IA
async function extractFields(conversationHistory, currentFormState, formSchema) {
  // Por enquanto, usar Groq API
  return await extractFieldsWithGroq(conversationHistory, currentFormState, formSchema);
}

async function extractFieldsWithGroq(conversationHistory, currentFormState, formSchema) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY não configurada');
    return {
      message: "Desculpe, o sistema de IA não está configurado no momento. Tente novamente mais tarde.",
      fieldUpdates: {},
      metadata: { provider: 'none', error: 'API key missing' }
    };
  }
  
  try {
    const systemPrompt = buildSystemPrompt(formSchema, currentFormState);
    
    const tools = [{
      type: "function",
      function: {
        name: "update_form_field",
        description: "Registra a resposta do usuário para um ou mais campos do formulário de briefing",
        parameters: {
          type: "object",
          properties: {
            field_id: {
              type: "string",
              description: "ID do campo no schema, ex: contato.nome, perfil.sobre_empresa"
            },
            value: {
              type: "string",
              description: "Valor extraído da conversa do usuário"
            }
          },
          required: ["field_id", "value"]
        }
      }
    }];
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];
    
    console.log('🤖 Chamando Groq API...');
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: true,
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const assistantMessage = result.choices[0].message;
    
    // Extrair tool calls se houver
    const fieldUpdates = {};
    
    if (assistantMessage.tool_calls) {
      assistantMessage.tool_calls.forEach(toolCall => {
        if (toolCall.function.name === "update_form_field") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            fieldUpdates[args.field_id] = args.value;
          } catch (e) {
            console.error('❌ Erro ao parsear tool call:', e);
          }
        }
      });
    }
    
    console.log('✅ Groq respondeu:', {
      message: assistantMessage.content?.substring(0, 100) + '...',
      fieldUpdates: Object.keys(fieldUpdates)
    });
    
    return {
      message: assistantMessage.content || "Entendi! Continue...",
      fieldUpdates,
      metadata: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        toolCallsCount: assistantMessage.tool_calls?.length || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Erro na Groq API:', error);
    
    // Fallback simples em caso de erro
    return {
      message: "Desculpe, houve um problema técnico. Pode repetir sua resposta?",
      fieldUpdates: {},
      metadata: { 
        provider: 'groq', 
        error: error.message,
        fallback: true
      }
    };
  }
}

function buildSystemPrompt(formSchema, currentFormState) {
  const filledFields = Object.keys(currentFormState).length;
  const totalFields = formSchema.sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  return `Você é um assistente especializado em coleta de briefing para projetos de identidade visual.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

SCHEMA DO FORMULÁRIO:
${JSON.stringify(formSchema, null, 2)}

INSTRUÇÕES IMPORTANTES:
1. Faça UMA pergunta por vez, de forma natural e conversacional
2. Siga a ordem das seções: ${formSchema.sections.map(s => s.label).join(' → ')}
3. Para campos já preenchidos, NÃO pergunte novamente
4. Use a função update_form_field SEMPRE que extrair informação do usuário
5. Use EXATAMENTE os IDs dos campos do schema (ex: "nome", "email", "sobre_empresa")
6. Seja acolhedor e use linguagem brasileira informal
7. Quando uma seção estiver completa, avance naturalmente para a próxima

CAMPO ATUAL A TRABALHAR:
${getCurrentFieldToWork(formSchema, currentFormState)}

EXEMPLOS DE USO DA FUNÇÃO:
- Usuário: "Me chamo João Silva" → update_form_field("nome", "João Silva")
- Usuário: "Meu email é joao@empresa.com" → update_form_field("email", "joao@empresa.com") 
- Usuário: "Somos uma consultoria há 5 anos" → update_form_field("sobre_empresa", "Somos uma consultoria há 5 anos")

Sua próxima pergunta deve ser natural e focada no campo atual.`;
}

function getCurrentFieldToWork(formSchema, currentFormState) {
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (!currentFormState[field.id] || currentFormState[field.id].toString().trim() === '') {
        return `Seção: ${section.label} | Campo: ${field.label} (${field.id})`;
      }
    }
  }
  return 'Formulário completo!';
}

module.exports = {
  extractFields
};