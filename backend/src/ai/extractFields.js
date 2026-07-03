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
  
  // Retry logic para rate limits
  const maxRetries = 3;
  let retryDelay = 1000; // 1 segundo inicial
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      
      console.log(`🤖 Chamando Groq API (tentativa ${attempt}/${maxRetries})...`);
      
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
          parallel_tool_calls: false,
          temperature: 0.5,
          max_tokens: 800
        })
      });
      
      if (!response.ok) {
        // Se for rate limit (429), tenta novamente
        if (response.status === 429 && attempt < maxRetries) {
          console.log(`⏳ Rate limit detectado, aguardando ${retryDelay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
          continue;
        }
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const assistantMessage = result.choices[0].message;
      
      console.log('🤖 Groq resposta completa:', {
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls?.length || 0,
        finish_reason: result.choices[0].finish_reason
      });
      
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
          toolCallsCount: assistantMessage.tool_calls?.length || 0,
          attempt: attempt
        }
      };
      
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
      
      // Se foi o último attempt ou não é rate limit, retorna erro
      if (attempt === maxRetries || !error.message.includes('429')) {
        return {
          message: "Desculpe, houve um problema técnico. Pode repetir sua resposta?",
          fieldUpdates: {},
          metadata: { 
            provider: 'groq', 
            error: error.message,
            fallback: true,
            attempt: attempt
          }
        };
      }
      
      // Se for rate limit e não foi último attempt, aguarda e tenta novamente
      if (error.message.includes('429')) {
        console.log(`⏳ Rate limit, aguardando ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
      }
    }
  }
  
  // Fallback se todas as tentativas falharam
  return {
    message: "Desculpe, houve um problema técnico. Pode repetir sua resposta?",
    fieldUpdates: {},
    metadata: { 
      provider: 'groq', 
      error: 'All retries failed',
      fallback: true
    }
  };
}

function buildSystemPrompt(formSchema, currentFormState) {
  const filledFields = Object.keys(currentFormState).length;
  const totalFields = formSchema.sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  // Encontrar o próximo campo a ser preenchido
  const nextField = getCurrentFieldToWork(formSchema, currentFormState);
  
  return `Você é um assistente especializado em coleta de briefing para projetos de identidade visual da Silver Brand House.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

CAMPO ATUAL PARA TRABALHAR:
${nextField}

SCHEMA DO FORMULÁRIO:
${JSON.stringify(formSchema, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. 🎯 SEMPRE faça UMA pergunta específica por vez
2. 🔄 AUTOMATICAMENTE pergunte o próximo campo assim que receber uma resposta
3. 📝 Use a função update_form_field SEMPRE que extrair informação do usuário
4. 🎯 Siga RIGOROSAMENTE a ordem das seções: ${formSchema.sections.map(s => s.label).join(' → ')}
5. ⚠️ Para campos já preenchidos, NÃO pergunte novamente
6. 🇧🇷 Use linguagem brasileira informal e acolhedora
7. 🔄 Quando uma seção estiver completa, avance AUTOMATICAMENTE para a próxima
8. ⚠️ OBRIGATÓRIO: SEMPRE responda com texto + função (nunca só função!)

FORMATO DA PERGUNTA:
- Seja direto e específico sobre o que quer saber
- Adicione um exemplo ou contexto quando necessário
- Termine sempre com uma pergunta clara
- SEMPRE inclua uma resposta de texto junto com a função

FORMATO DA FUNÇÃO:
- Use EXATAMENTE os IDs dos campos do schema (ex: "nome", "email", "sobre_empresa")
- Extraia TODA a informação relevante da resposta do usuário
- Não peça confirmação, apenas extraia e continue

COMPORTAMENTO AUTOMÁTICO:
- Se o usuário responder qualquer coisa, extraia a informação E imediatamente faça a próxima pergunta
- Não espere o usuário pedir para continuar
- Mantenha o fluxo sempre em movimento
- SEMPRE combine função + mensagem de texto

EXEMPLO DE FLUXO:
Usuário: "Me chamo João Silva"
Assistente: 
1. Chama update_form_field("nome", "João Silva") 
2. Responde: "Ótimo, João! Agora preciso do seu e-mail para contato. Qual é o seu e-mail?"

REGRA ABSOLUTA: 
- Use as funções adequadamente (não coloque no texto!)
- Sempre responda com texto conversacional separado da função
- NUNCA inclua <function=...> no texto da resposta`;
}

function getCurrentFieldToWork(formSchema, currentFormState) {
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (!currentFormState[field.id] || currentFormState[field.id].toString().trim() === '') {
        return `Seção: ${section.label}
Campo: ${field.label} (ID: ${field.id})
Tipo: ${field.type}
${field.required ? '⭐ OBRIGATÓRIO' : ''}
${field.options ? `Opções: ${field.options.join(', ')}` : ''}

PERGUNTA SUGERIDA: "${getQuestionForField(field)}"`;
      }
    }
  }
  return 'Formulário completo! 🎉 Pergunte se o usuário quer revisar ou finalizar o briefing.';
}

function getQuestionForField(field) {
  const questions = {
    'nome': 'Qual é o seu nome completo?',
    'email': 'Qual é o seu e-mail para contato?',
    'empresa_slogan': 'Qual é o nome da sua empresa? Tem algum slogan?',
    'website': 'Você tem website ou Instagram da empresa?',
    'telefone': 'Qual é o seu telefone para contato?',
    'cidade_estado': 'Em que cidade e estado você está?',
    'tipo_projeto': 'Este é um projeto novo ou um redesenho de identidade existente?',
    'prazo': 'Para quando você precisa do projeto pronto?',
    'itens_padrao': 'Quais itens de identidade visual você precisa? (Ex: Logo principal, paleta de cores, tipografia, manual)',
    'itens_extra': 'Precisa de algum item adicional? (Ex: template PowerPoint, cartão de visitas, capas Instagram)',
    'info_extra_itens': 'Tem alguma informação extra sobre os itens que mencionou?',
    'sobre_empresa': 'Me conte sobre sua empresa: o que vocês fazem e há quanto tempo existe?',
    'missao_visao_valores': 'Vocês têm missão, visão e valores definidos? Quais são?',
    'produtos_servicos': 'Quais produtos ou serviços vocês oferecem?',
    'objetivos_hoje': 'Quais são os principais objetivos da empresa atualmente?',
    'diferencial': 'Qual é o principal diferencial do seu negócio?',
    'como_ser_percebida': 'Como vocês querem ser percebidos pelo mercado?',
    'diferencial_concorrencia': 'O que diferencia vocês da concorrência?',
    'por_que_escolher': 'Por que alguém deveria escolher vocês em vez dos concorrentes?',
    'escala_sofisticada_descontraida': 'Em uma escala de 1 a 5, onde 1 é descontraída e 5 é sofisticada, como vocês se veem?',
    'escala_tecnica_emocional': 'De 1 a 5, onde 1 é emocional e 5 é técnica, qual o tom da marca?',
    'escala_formal_informal': 'De 1 a 5, onde 1 é informal e 5 é formal, como vocês se comunicam?',
    'escala_tradicional_moderna': 'De 1 a 5, onde 1 é moderna e 5 é tradicional, qual o estilo da marca?',
    'escala_exclusiva_popular': 'De 1 a 5, onde 1 é popular e 5 é exclusiva, como se posicionam?',
    'tres_palavras': 'Me diga 3 palavras que definem a personalidade da sua marca.',
    'concorrentes_locais': 'Quem são os principais concorrentes de vocês? (locais, regionais ou mundiais)',
    'gosta_nessas_marcas': 'O que você gosta nessas marcas concorrentes?',
    'marcas_admira': 'Que outras marcas vocês admiram, mesmo fora do seu nicho?',
    'info_extra_concorrentes': 'Tem mais alguma informação sobre concorrentes ou referências?',
    'cores_nao_quer': 'Existem cores que vocês definitivamente NÃO querem usar?',
    'cores_quer': 'Que cores vocês gostam e gostariam de explorar na identidade?',
    'fontes_gosta': 'Que tipos de fontes vocês gostam? (pode enviar links de referência)',
    'tipos_logo': 'Que tipos de logo vocês preferem? (com símbolo, só tipografia, minimalista, clássico, moderno)',
    'referencias_visuais': 'Você tem referências visuais que gosta? (pode enviar links)',
    'algo_a_dizer': 'Para finalizar, tem mais alguma coisa importante que gostaria de compartilhar sobre o projeto?'
  };
  
  return questions[field.id] || `Me conte sobre: ${field.label}`;
}

module.exports = {
  extractFields
};