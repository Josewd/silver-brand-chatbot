// Interface trocável para diferentes provedores de IA
async function extractFields(conversationHistory, currentFormState, formSchema) {
  // Priorizar OpenAI se disponível (mais confiável com strict mode)
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('🎯 Usando OpenAI com structured outputs (strict mode)...');
      return await extractFieldsWithOpenAI(conversationHistory, currentFormState, formSchema);
    } catch (error) {
      console.warn('⚠️ OpenAI falhou, tentando Groq como fallback:', error.message);
    }
  }
  
  // Fallback para Groq se OpenAI não disponível ou falhar
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('🤖 Usando Groq API (sistema de 2 fases)...');
      return await extractFieldsWithGroq(conversationHistory, currentFormState, formSchema);
    } catch (error) {
      console.warn('⚠️ Groq falhou, usando extração manual:', error.message);
    }
  }
  
  // Último recurso: extração manual
  console.error('❌ Nenhuma IA disponível, usando fallback manual');
  const lastUserMessage = conversationHistory.filter(msg => msg.role === 'user').pop()?.content || '';
  const manualUpdates = manualFieldExtraction(lastUserMessage, currentFormState);
  
  return {
    message: generateContextualFallback(formSchema, { ...currentFormState, ...manualUpdates }),
    fieldUpdates: manualUpdates,
    metadata: { provider: 'manual', noAI: true }
  };
}

// Extração com OpenAI usando structured outputs (strict mode) - MAIS CONFIÁVEL
async function extractFieldsWithOpenAI(conversationHistory, currentFormState, formSchema) {
  console.log('🎯 === OPENAI STRUCTURED OUTPUTS ===');
  
  // Schema com strict mode - garante formato perfeito
  const tools = [{
    type: "function",
    function: {
      name: "update_form_fields",
      description: "Registra uma ou mais respostas extraídas da última mensagem do usuário",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field_id: { type: "string" },
                value: { type: "string" }
              },
              required: ["field_id", "value"],
              additionalProperties: false
            }
          }
        },
        required: ["updates"],
        additionalProperties: false
      }
    }
  }];

  const systemPrompt = buildOpenAISystemPrompt(formSchema, currentFormState);
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory
  ];

  console.log('🔄 Chamada OpenAI API - Modelo: gpt-4o-mini (custo-benefício otimizado)');

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 500,
      parallel_tool_calls: false // Obrigatório com strict mode
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const assistantMessage = result.choices[0].message;

  console.log(`✅ OpenAI respondeu:`, {
    content_length: assistantMessage.content?.length || 0,
    tool_calls: assistantMessage.tool_calls?.length || 0,
    finish_reason: result.choices[0].finish_reason
  });

  // Extrair atualizações dos tool calls
  const fieldUpdates = {};
  
  if (assistantMessage.tool_calls) {
    assistantMessage.tool_calls.forEach(toolCall => {
      if (toolCall.function.name === "update_form_fields") {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          // Processar array de updates
          args.updates.forEach(update => {
            fieldUpdates[update.field_id] = update.value;
          });
        } catch (e) {
          console.error('❌ Erro ao parsear tool call OpenAI:', e);
        }
      }
    });
  }

  // Com OpenAI, podemos confiar no texto + tool calls na mesma resposta
  const aiMessage = assistantMessage.content || generateContextualFallback(formSchema, { ...currentFormState, ...fieldUpdates });

  console.log(`✅ OpenAI processamento concluído:`, {
    fieldsExtracted: Object.keys(fieldUpdates).length,
    messageGenerated: !!aiMessage
  });

  return {
    message: aiMessage,
    fieldUpdates,
    metadata: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      toolCallsCount: Object.keys(fieldUpdates).length,
      strictMode: true,
      singlePhase: true
    }
  };
}

function buildOpenAISystemPrompt(formSchema, currentFormState) {
  const filledFields = Object.keys(currentFormState).length;
  const totalFields = formSchema.sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  const nextField = getCurrentFieldToWork(formSchema, currentFormState);
  
  return `Você é um assistente especializado em coleta de briefing para projetos de identidade visual da Silver Brand House.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

PRÓXIMO CAMPO PARA TRABALHAR:
${nextField}

INSTRUÇÕES CRÍTICAS:
1. 🎯 EXTRAIA dados da última mensagem do usuário usando update_form_fields
2. 📝 RESPONDA com uma pergunta sobre o próximo campo necessário
3. 🇧🇷 Use linguagem brasileira informal e acolhedora
4. ⚠️ Para campos já preenchidos, NÃO pergunte novamente
5. 🔄 Avance automaticamente para a próxima seção quando necessário

CAMPOS DISPONÍVEIS: nome, email, telefone, empresa_slogan, website, cidade_estado, tipo_projeto, prazo, sobre_empresa, missao_visao_valores, produtos_servicos, objetivos_hoje, diferencial, como_ser_percebida, diferencial_concorrencia, por_que_escolher, etc.

FORMATO DE RESPOSTA:
- Use update_form_fields para extrair informações identificadas
- Responda com texto conversacional perguntando o próximo campo
- Seja específico sobre o que quer saber
- Termine sempre com uma pergunta clara

EXEMPLO:
Usuário: "Minha empresa se chama Tech Solutions"
Ação: update_form_fields([{field_id: "empresa_slogan", value: "Tech Solutions"}])
Resposta: "Ótimo! A Tech Solutions tem algum slogan ou você tem website que possa compartilhar?"

REGRA ABSOLUTA:
- Extraia TODA informação relevante da última mensagem
- Faça UMA pergunta específica sobre o próximo campo necessário
- Mantenha tom conversacional e acolhedor`;
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
  
  // Sistema de fallback com modelos Groq reais e funcionais
  const groqModels = [
    { 
      name: "llama-3.3-70b-versatile", 
      description: "Modelo principal - mais capaz e estável",
      maxTokens: 800,
      temperature: 0.5 
    },
    { 
      name: "llama-3.1-70b-versatile", 
      description: "Fallback 1 - modelo estável",
      maxTokens: 600,
      temperature: 0.5 
    },
    { 
      name: "llama-3.1-8b-instant", 
      description: "Fallback 2 - rápido e confiável",
      maxTokens: 400,
      temperature: 0.3 
    }
  ];
  
  let lastError = null;
  
  // Tentar cada modelo em sequência
  for (let modelIndex = 0; modelIndex < groqModels.length; modelIndex++) {
    const model = groqModels[modelIndex];
    console.log(`🤖 Tentando modelo ${modelIndex + 1}/${groqModels.length}: ${model.name} (${model.description})`);
    
    // Retry logic por modelo (2 tentativas por modelo)
    const maxRetriesPerModel = 2;
    let retryDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const result = await callGroqAPI(
          conversationHistory, 
          currentFormState, 
          formSchema, 
          model, 
          groqApiKey,
          attempt,
          modelIndex + 1
        );
        
        // Sucesso! Retornar resultado
        return {
          ...result,
          metadata: {
            ...result.metadata,
            modelUsed: model.name,
            modelIndex: modelIndex + 1,
            attempt: attempt,
            fallbackLevel: modelIndex
          }
        };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Erro no modelo ${model.name} (tentativa ${attempt}/${maxRetriesPerModel}):`, error.message);
        
        // Se for rate limit e não foi último attempt do modelo, tenta novamente
        if (error.message.includes('429') && attempt < maxRetriesPerModel) {
          console.log(`⏳ Rate limit no ${model.name}, aguardando ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2;
          continue;
        }
        
        // Se não foi rate limit ou foi último attempt, passa para próximo modelo
        break;
      }
    }
  }
  
  // Se todos os modelos falharam, retornar fallback contextual
  console.error('❌ Todos os modelos Groq falharam:', lastError?.message);
  
  // Criar fallback contextual baseado no estado atual do formulário
  const nextFieldInfo = getCurrentFieldToWork(formSchema, currentFormState);
  let contextualFallback = "Desculpe, houve um problema técnico. Vamos continuar: ";
  
  // Debug
  console.log(`🔍 Estado atual do formulário:`, JSON.stringify(currentFormState, null, 2));
  console.log(`📋 Próximo campo:`, nextFieldInfo);
  
  if (nextFieldInfo.includes('nome') && !currentFormState.nome) {
    contextualFallback += "qual é o seu nome completo?";
  } else if (nextFieldInfo.includes('email') && !currentFormState.email) {
    contextualFallback += "qual é o seu e-mail para contato?";
  } else if (nextFieldInfo.includes('telefone') && !currentFormState.telefone) {
    contextualFallback += "qual é o seu telefone?";
  } else if (nextFieldInfo.includes('empresa_slogan') && !currentFormState.empresa_slogan) {
    contextualFallback += "qual é o nome da sua empresa?";
  } else if (nextFieldInfo.includes('website') && !currentFormState.website) {
    contextualFallback += "você tem website ou Instagram da empresa?";
  } else if (nextFieldInfo.includes('cidade_estado') && !currentFormState.cidade_estado) {
    contextualFallback += "em que cidade e estado você está?";
  } else if (nextFieldInfo.includes('tipo_projeto') && !currentFormState.tipo_projeto) {
    contextualFallback += "este é um projeto novo ou um redesenho?";
  } else if (nextFieldInfo.includes('sobre_empresa') && !currentFormState.sobre_empresa) {
    contextualFallback += "me conte sobre sua empresa - o que vocês fazem?";
  } else {
    contextualFallback += "pode me contar mais sobre sua empresa?";
  }
  
  return {
    message: contextualFallback,
    fieldUpdates: {},
    metadata: { 
      provider: 'groq', 
      error: lastError?.message || 'All models failed',
      fallback: true,
      contextualFallback: true,
      modelsAttempted: groqModels.length
    }
  };
}

async function callGroqAPI(conversationHistory, currentFormState, formSchema, model, apiKey, attempt, modelIndex) {
  console.log(`🔄 Chamada Groq API - Modelo: ${model.name}, Tentativa: ${attempt}, Índice: ${modelIndex}`);
  
  // === CHAMADA 1: EXTRAÇÃO DE DADOS (apenas tool calls, sem texto) ===
  const extractionResult = await callGroqExtraction(conversationHistory, currentFormState, model, apiKey);
  
  // Aplicar atualizações extraídas no estado
  const updatedFormState = { ...currentFormState, ...extractionResult.fieldUpdates };
  
  // === CHAMADA 2: GERAÇÃO DE RESPOSTA (apenas texto, sem tools) ===  
  const replyResult = await callGroqReply(conversationHistory, updatedFormState, formSchema, model, apiKey);
  
  // Validar se a resposta tem function calls malformatados
  let cleanMessage = replyResult.message;
  if (containsMalformedFunctionCalls(cleanMessage)) {
    console.warn('⚠️ Detectada function call malformatada no texto, removendo...');
    cleanMessage = removeMalformedFunctionCalls(cleanMessage);
  }
  
  return {
    message: cleanMessage,
    fieldUpdates: extractionResult.fieldUpdates,
    metadata: {
      provider: 'groq',
      model: model.name,
      toolCallsCount: Object.keys(extractionResult.fieldUpdates).length,
      extractionSuccess: extractionResult.success,
      replySuccess: replyResult.success,
      twoPhaseCall: true
    }
  };
}

// Chamada 1: Apenas extração de dados
async function callGroqExtraction(conversationHistory, currentFormState, model, apiKey) {
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
            description: "ID do campo no schema, ex: nome, email, sobre_empresa"
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

  const extractionSystemPrompt = `Você é um extrator de dados especializado. Sua ÚNICA responsabilidade é identificar informações na última mensagem do usuário e extrair usando a função update_form_field.

INSTRUÇÕES CRÍTICAS:
- Use APENAS a função update_form_field quando identificar dados
- NUNCA escreva texto de resposta
- NUNCA simule function calls como texto
- Se não há dados para extrair, não chame nenhuma função
- Extraia apenas informações explícitas na última mensagem

CAMPOS DISPONÍVEIS: nome, email, telefone, empresa_slogan, website, cidade_estado, tipo_projeto, prazo, sobre_empresa, etc.

ESTADO ATUAL DO FORMULÁRIO:
${JSON.stringify(currentFormState, null, 2)}

Extraia APENAS novos dados da última mensagem do usuário.`;

  const messages = [
    { role: "system", content: extractionSystemPrompt },
    ...conversationHistory
  ];

  console.log('🔍 FASE 1: Extração de dados...');

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model.name,
        messages,
        tools,
        tool_choice: "auto", // Nunca "required" - deixa o modelo decidir
        temperature: 0, // Determinístico para extração
        max_tokens: 200, // Limitado - só para function calls
        parallel_tool_calls: true
      })
    });

    if (!response.ok) {
      throw new Error(`Extraction API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const assistantMessage = result.choices[0].message;
    
    // Extrair tool calls
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

    console.log(`✅ FASE 1 concluída: ${Object.keys(fieldUpdates).length} campos extraídos`, fieldUpdates);
    
    return {
      fieldUpdates,
      success: true
    };

  } catch (error) {
    console.error('❌ Erro na extração:', error);
    
    // Log mais detalhado do erro
    if (error.message.includes('404')) {
      console.error('🚫 Modelo não encontrado na API Groq:', model.name);
    } else if (error.message.includes('401')) {
      console.error('🔑 Problema de autenticação com API Groq');
    } else if (error.message.includes('429')) {
      console.error('⏳ Rate limit atingido na API Groq');
    }
    
    return {
      fieldUpdates: {},
      success: false,
      error: error.message
    };
  }
}

// Chamada 2: Apenas geração de texto de resposta
async function callGroqReply(conversationHistory, updatedFormState, formSchema, model, apiKey) {
  const replySystemPrompt = buildReplySystemPrompt(formSchema, updatedFormState);

  const messages = [
    { role: "system", content: replySystemPrompt },
    ...conversationHistory
  ];

  console.log('💬 FASE 2: Geração de resposta...');

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model.name,
        messages,
        // SEM tools aqui - evita confusão
        temperature: 0.7, // Mais criativo para texto
        max_tokens: 300 // Suficiente para uma pergunta
      })
    });

    if (!response.ok) {
      throw new Error(`Reply API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const message = result.choices[0].message.content || "";
    
    console.log(`✅ FASE 2 concluída: resposta gerada (${message.length} chars)`);

    // Fallback se não há resposta
    if (!message.trim()) {
      const fallbackMessage = generateContextualFallback(formSchema, updatedFormState);
      console.log('⚠️ IA não retornou texto, usando fallback contextual:', fallbackMessage);
      return {
        message: fallbackMessage,
        success: false
      };
    }
    
    return {
      message: message.trim(),
      success: true
    };

  } catch (error) {
    console.error('❌ Erro na geração de resposta:', error);
    
    // Log mais detalhado do erro
    if (error.message.includes('404')) {
      console.error('🚫 Modelo não encontrado na API Groq:', model.name);
    } else if (error.message.includes('401')) {
      console.error('🔑 Problema de autenticação com API Groq');
    } else if (error.message.includes('429')) {
      console.error('⏳ Rate limit atingido na API Groq');
    }
    
    const fallbackMessage = generateContextualFallback(formSchema, updatedFormState);
    return {
      message: fallbackMessage,
      success: false,
      error: error.message
    };
  }
}

function buildReplySystemPrompt(formSchema, currentFormState) {
  const filledFields = Object.keys(currentFormState).length;
  const totalFields = formSchema.sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  // Encontrar o próximo campo a ser preenchido
  const nextField = getCurrentFieldToWork(formSchema, currentFormState);
  
  return `Você é um assistente conversacional especializado em briefing para projetos de identidade visual da Silver Brand House.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

PRÓXIMO CAMPO PARA TRABALHAR:
${nextField}

INSTRUÇÕES CRÍTICAS:
1. 🎯 SEMPRE faça UMA pergunta específica por vez sobre o próximo campo
2. 🇧🇷 Use linguagem brasileira informal e acolhedora  
3. 📝 Seja direto e específico sobre o que quer saber
4. ⚠️ Para campos já preenchidos, NÃO pergunte novamente
5. 🔄 Avance automaticamente para a próxima seção quando necessário

FORMATO DA RESPOSTA:
- Use APENAS linguagem natural e conversacional
- NUNCA inclua códigos, JSON, ou function calls no texto
- Termine sempre com uma pergunta clara
- Adicione contexto quando necessário

EXEMPLO DE BOA RESPOSTA:
"Perfeito! Agora me conte: qual é o nome da sua empresa? Ela tem algum slogan?"

REGRAS ABSOLUTAS:
- JAMAIS escreva function calls ou códigos na resposta
- Responda APENAS com texto conversacional
- Mantenha o tom acolhedor e profissional
- Faça uma pergunta específica sobre o próximo campo necessário`;
}

// Função para detectar function calls malformatados no texto
function containsMalformedFunctionCalls(text) {
  if (!text) return false;
  
  // Padrões comuns de function calls malformatados
  const patterns = [
    /<function=/i,
    /update_form_field\s*\{/i,
    /\{"field_id":/i,
    /function\s*\(/i,
    /tool_call/i
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

// Função para remover function calls malformatados do texto
function removeMalformedFunctionCalls(text) {
  if (!text) return "";
  
  // Remover padrões comuns de function calls malformatados
  let cleaned = text
    .replace(/<function=.*?>/gi, '')
    .replace(/update_form_field\s*\{[^}]*\}/gi, '')
    .replace(/\{"field_id":.*?\}/gi, '')
    .replace(/function\s*\([^)]*\)/gi, '')
    .replace(/tool_call.*?;/gi, '')
    .replace(/;\s*$/g, '') // Remove ; no final
    .trim();
  
  return cleaned;
}

// Função para gerar fallback contextual
function generateContextualFallback(formSchema, currentFormState) {
  const nextFieldInfo = getCurrentFieldToWork(formSchema, currentFormState);
  
  if (nextFieldInfo.includes('nome') && !currentFormState.nome) {
    return "Qual é o seu nome completo?";
  } else if (nextFieldInfo.includes('email') && !currentFormState.email) {
    return "Perfeito! Qual é o seu e-mail para contato?";  
  } else if (nextFieldInfo.includes('telefone') && !currentFormState.telefone) {
    return "Ótimo! E qual é o seu telefone para contato?";
  } else if (nextFieldInfo.includes('empresa_slogan') && !currentFormState.empresa_slogan) {
    return "Perfeito! Agora me conte: qual é o nome da sua empresa? Ela tem algum slogan?";
  } else if (nextFieldInfo.includes('website') && !currentFormState.website) {
    return "Você tem website ou Instagram da empresa que possa compartilhar?";
  } else if (nextFieldInfo.includes('cidade_estado') && !currentFormState.cidade_estado) {
    return "Em que cidade e estado você está localizado?";
  } else if (nextFieldInfo.includes('tipo_projeto') && !currentFormState.tipo_projeto) {
    return "Este é um projeto de identidade visual novo ou um redesenho?";
  } else if (nextFieldInfo.includes('sobre_empresa') && !currentFormState.sobre_empresa) {
    return "Agora vamos conhecer melhor sua empresa. Me conte: o que vocês fazem e há quanto tempo existe?";
  } else {
    return "Pode me contar mais detalhes sobre isso?";
  }
}

// Função de extração manual simples (fallback quando IA falha)
function manualFieldExtraction(userMessage, currentFormState) {
  const fieldUpdates = {};
  const message = userMessage.toLowerCase();
  
  // Detectar informações básicas por padrões simples
  if (!currentFormState.empresa_slogan && message.length > 2) {
    // Se está perguntando sobre empresa e não temos empresa_slogan ainda
    fieldUpdates.empresa_slogan = userMessage;
  } else if (!currentFormState.website && (message.includes('www.') || message.includes('http') || message.includes('@'))) {
    fieldUpdates.website = userMessage;
  } else if (!currentFormState.sobre_empresa && message.length > 10) {
    // Respostas longas provavelmente são sobre a empresa
    fieldUpdates.sobre_empresa = userMessage;
  }
  
  return fieldUpdates;
}
function buildSystemPrompt(formSchema, currentFormState) {
  // Função mantida para compatibilidade, mas não mais usada na nova implementação
  return buildReplySystemPrompt(formSchema, currentFormState);
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