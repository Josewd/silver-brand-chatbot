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

  // Detectar se precisa enviar opções interativas
  const interactiveOptions = detectInteractiveOptions(formSchema, { ...currentFormState, ...fieldUpdates });

  return {
    message: aiMessage,
    fieldUpdates,
    options: interactiveOptions,
    metadata: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      toolCallsCount: Object.keys(fieldUpdates).length,
      strictMode: true,
      singlePhase: true,
      hasOptions: !!interactiveOptions
    }
  };
}

function buildOpenAISystemPrompt(formSchema, currentFormState) {
  const filledFields = Object.keys(currentFormState).length;
  const totalFields = formSchema.sections.reduce((sum, section) => sum + section.fields.length, 0);
  
  const nextField = getCurrentFieldToWork(formSchema, currentFormState);
  
  return `Você é um consultor especialista em identidade visual da Silver Brand House. Seu trabalho é extrair informações valiosas de clientes que geralmente são leigos no assunto, transformando respostas básicas em insights profissionais.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

PRÓXIMO CAMPO PARA TRABALHAR:
${nextField}

SUA MISSÃO COMO ESPECIALISTA:
1. 🎯 EXTRAIR informações da resposta usando update_form_fields
2. 🔄 REFORMULAR respostas vagas em versões profissionais quando necessário
3. 🎓 EDUCAR o cliente sobre aspectos importantes de branding
4. 💡 FAZER perguntas específicas e direcionadas, nunca genéricas
5. 🏆 ELEVAR o nível da conversa, transformando ideias básicas em conceitos sólidos

⚠️ CRÍTICO - SEMPRE EXTRAIR DADOS:
Mesmo durante conversas consultivas, você DEVE extrair informações para os campos:
- sobre_empresa: qualquer descrição do negócio
- missao_visao_valores: missão, visão ou valores mencionados
- produtos_servicos: produtos/serviços oferecidos
- objetivos_hoje: objetivos ou metas mencionados
- diferencial: diferenciais competitivos mencionados
- como_ser_percebida: como querem ser percebidos
- E TODOS os outros campos quando informações relevantes aparecerem

EXEMPLO DE EXTRAÇÃO CORRETA:
Usuário: "vendemos cafe take away"
Ação: update_form_fields([{field_id: "sobre_empresa", value: "Vendemos café takeaway"}])

Usuário: "o atendimento sem duvidas" (sobre diferencial)
Ação: update_form_fields([{field_id: "diferencial", value: "O atendimento excepcional é nosso principal diferencial"}])

Usuário: "cafes variados, latte, capuccino etc..."
Ação: update_form_fields([{field_id: "produtos_servicos", value: "Oferecemos cafés variados incluindo latte, cappuccino e outras bebidas especiais"}])

QUANDO VOCÊ REFORMULA/CONSTRÓI CONCEITOS:
Se você ajudou a construir missão, visão, valores ou qualquer conceito durante a conversa,
você DEVE salvar a versão final construída nos campos apropriados:

Exemplo: Você construiu uma missão com o cliente:
"A Pradella Food tem como missão oferecer café de alta qualidade..."
Ação: update_form_fields([{field_id: "missao_visao_valores", value: "MISSÃO: A Pradella Food tem como missão..."}])

CRÍTICO: NÃO DEIXE INFORMAÇÕES VALIOSAS SE PERDEREM!
Toda informação coletada durante a consultoria deve ser extraída para os campos apropriados.

CAMPOS DISPONÍVEIS: nome, email, telefone, empresa_slogan, website, cidade_estado, tipo_projeto, prazo, sobre_empresa, missao_visao_valores, produtos_servicos, objetivos_hoje, diferencial, como_ser_percebida, diferencial_concorrencia, por_que_escolher, etc.

COMO AGIR COM CLIENTES LEIGOS:

📝 QUANDO A RESPOSTA É VAGA OU BÁSICA:
- Extraia o que foi dito
- Reformule profissionalmente
- Apresente a versão melhorada para confirmação
- Exemplo: "Entendi que vocês trabalham com café takeaway. Posso reformular isso como: 'Cafeteria especializada em experiência de café para consumo rápido, focada em qualidade e praticidade para o cliente urbano.' Isso reflete bem o posicionamento de vocês?"

🎯 QUANDO FAZER PERGUNTAS ESPECÍFICAS:
- Se resposta for "não sei" → Explique por que é importante e dê opções
- Se resposta for muito curta → Contextualize com exemplos do mercado
- Se resposta for confusa → Reformule em termos profissionais

🚫 NUNCA FAÇA:
- "Pode me contar mais sobre isso?" (muito genérico)
- "Tem mais alguma coisa?" (não direciona)
- "O que mais você pode me dizer?" (preguiçoso)

✅ SEMPRE FAÇA:
- Perguntas específicas com contexto
- Reformulações profissionais
- Educação sobre branding
- Conexões entre respostas e identidade visual

EXEMPLOS DE PERGUNTAS ESPECIALISTAS:

🏢 Para "sobre_empresa":
"Vejo que vocês trabalham com café takeaway. Para criar uma identidade visual forte, preciso entender: vocês querem transmitir sofisticação (como um Starbucks) ou proximidade local (como uma cafeteria de bairro)? Qual experiência o cliente deve sentir ao ver sua marca?"

🎨 Para "como_ser_percebida":
"Quando alguém vê a marca Pradella Food, qual deve ser a primeira impressão? Por exemplo: 'Esta marca entende de café de qualidade' ou 'Este lugar me faz sentir em casa' ou 'Aqui tenho a garantia de rapidez sem perder qualidade'?"

🏆 Para "diferencial":
"No mercado de cafés takeaway, o que faria alguém escolher vocês em vez de ir num Starbucks ou numa padaria? É a qualidade dos grãos, o atendimento personalizado, a localização, os preços, ou algo único que só vocês oferecem?"

💡 Para "missao_visao_valores":
"Vamos construir isso juntos. Se a Pradella Food existir por 10 anos, qual legado querem deixar no mercado de café? O que querem que as pessoas digam sobre vocês quando recomendarem para um amigo?"

FORMATO DE RESPOSTA PROFISSIONAL:
1. Extraia informações usando update_form_fields
2. Se a resposta foi básica, reformule profissionalmente
3. Para campos com opções (select/multiselect/scale), NÃO liste as opções no texto
4. Faça pergunta específica e educativa sobre o próximo campo
5. Conecte a pergunta com estratégia de marca

CAMPOS COM OPÇÕES INTERATIVAS (não liste no texto):
- tipo_projeto: ["Projeto novo", "Redesenho"] 
- prazo: ["Em 1 mês", "Em 2 meses", "Indefinido", "Urgente"]
- itens_padrao: ["Logo Principal", "Logo Reduzida", "Paleta de Cores", "Tipografia", "Manual de Marca", "Registro de Direito Autoral"]
- itens_extra: ["Template PowerPoint", "Capa Destaques Instagram", "Arte para Cartão de Visitas", "Arte para Impresso"]
- tipos_logo: ["Com símbolo", "Só a tipografia", "Minimalista", "Clássico", "Moderno"]
- Campos scale: escala_sofisticada_descontraida, escala_tecnica_emocional, etc.

EXEMPLO CORRETO para itens_padrao:
❌ "Você precisa de: Logo Principal, Logo Reduzida, Paleta de Cores..." (não fazer)
✅ "Agora vamos definir quais itens de identidade visual são essenciais para a Pradella Food. Vou apresentar as opções principais para você escolher:" (sistema mostrará checkboxes)

REGRA DE OURO:
Transforme cada interação em uma mini-consultoria de branding. O cliente deve sair da conversa entendendo melhor sua própria marca e com um briefing realmente valioso.`;
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
    options: detectInteractiveOptions(formSchema, updatedFormState),
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
  
  return `Você é um consultor especialista em identidade visual da Silver Brand House. Trabalhe como um consultor experiente que sabe extrair informações valiosas de clientes leigos.

CONTEXTO ATUAL:
- Campos já preenchidos: ${filledFields}/${totalFields}
- Estado atual do formulário: ${JSON.stringify(currentFormState, null, 2)}

PRÓXIMO CAMPO PARA TRABALHAR:
${nextField}

SUA MISSÃO COMO ESPECIALISTA:
1. 🔄 REFORMULAR respostas vagas em versões profissionais 
2. 🎓 EDUCAR o cliente sobre branding quando necessário
3. 💡 FAZER perguntas específicas e direcionadas sobre o próximo campo
4. 🏆 ELEVAR o nível da conversa com expertise em identidade visual

COMO AGIR:

📝 SE A RESPOSTA ANTERIOR FOI VAGA:
- Reformule profissionalmente e confirme
- Exemplo: "Entendi que é sobre café takeaway. Posso descrever como 'Cafeteria especializada em experiência premium de café para consumo rápido'? Isso captura bem a essência?"

🎯 PARA PRÓXIMA PERGUNTA:
- Seja específico e educativo
- Conecte com estratégia de marca
- Dê contexto sobre por que é importante

🚫 NUNCA USE:
- "Pode me contar mais sobre isso?"
- "Tem mais alguma coisa?"
- "O que mais você pode dizer?"

✅ SEMPRE USE perguntas específicas como:
- "Para criar uma identidade visual forte, preciso entender..."
- "No mercado de [setor], o que diferencia vocês..."
- "Quando alguém vê sua marca, qual deve ser a primeira impressão..."

EXEMPLOS POR CAMPO:

🏢 sobre_empresa: "Para criar uma identidade visual que comunique bem o posicionamento, preciso entender: vocês querem transmitir sofisticação premium ou proximidade acolhedora?"

🎨 como_ser_percebida: "Quando alguém vê a marca [EMPRESA], qual primeira impressão deve ter? 'Esta marca é confiável' ou 'Este lugar me conecta' ou 'Aqui encontro qualidade'?"

🏆 diferencial: "No seu setor, o que faria um cliente escolher vocês? É expertise, atendimento, inovação, preços ou algo único?"

💡 missao_visao_valores: "Vamos construir juntos: se [EMPRESA] existir por 10 anos, que legado querem deixar? Como querem ser lembrados?"

REGRA DE OURO:
Cada pergunta deve ser uma mini-consultoria. O cliente deve aprender sobre branding enquanto responde.`;
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

// Função para detectar quando enviar opções interativas
function detectInteractiveOptions(formSchema, currentFormState) {
  // Encontrar o próximo campo a ser preenchido
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (!currentFormState[field.id] || currentFormState[field.id].toString().trim() === '') {
        
        // LÓGICA ESPECIAL: itens_padrao são inclusos, não mostrar como opção
        if (field.id === 'itens_padrao') {
          // Auto-preencher itens padrão e pular para próximo campo
          console.log('📦 Auto-preenchendo itens_padrao (já inclusos no pacote)');
          return {
            type: 'auto_fill',
            fieldId: 'itens_padrao',
            value: 'Logo Principal, Logo Reduzida, Paleta de Cores, Tipografia, Manual de Marca, Registro de Direito Autoral',
            message: 'Perfeito! Seu pacote de identidade visual já inclui estes itens essenciais: **Logo Principal, Logo Reduzida, Paleta de Cores, Tipografia, Manual de Marca e Registro de Direito Autoral**. Estes são os elementos fundamentais que toda marca precisa.'
          };
        }
        
        // Pular para o próximo campo (itens_extra)
        continue;
        
        // Se o campo tem opções (select ou multiselect), enviar como interativo
        if (field.options && (field.type === 'select' || field.type === 'multiselect')) {
          return {
            type: field.type === 'multiselect' ? 'checkbox' : 'radio',
            fieldId: field.id,
            question: getQuestionForField(field),
            options: field.options.map(option => ({
              value: option,
              text: option
            }))
          };
        }
        
        // Se o campo é scale, enviar como scale interativo  
        if (field.type === 'scale') {
          return {
            type: 'scale',
            fieldId: field.id,
            question: field.label,
            min: field.min || 1,
            max: field.max || 5
          };
        }
        
        // Para campos de personalidade que são escalas, criar interface múltipla
        if (section.id === 'personalidade' && !currentFormState.escala_sofisticada_descontraida) {
          // Se estamos na seção personalidade e não preenchemos ainda, enviar todas as escalas
          const personalityScales = section.fields.filter(f => f.type === 'scale');
          if (personalityScales.length > 0) {
            return {
              type: 'multiple_scales',
              fieldId: 'personality_scales',
              question: 'Agora vamos definir a personalidade da marca. Avalie cada aspecto de 1 a 5:',
              scales: personalityScales.map(scale => ({
                id: scale.id,
                label: scale.label,
                min: scale.min || 1,
                max: scale.max || 5
              }))
            };
          }
        }
        
        // Se chegou aqui, não precisa de opções interativas
        return null;
      }
    }
  }
  
  return null; // Formulário completo
}

// Função para gerar fallback contextual especializado
function generateContextualFallback(formSchema, currentFormState) {
  const nextFieldInfo = getCurrentFieldToWork(formSchema, currentFormState);
  
  // Buscar nome da empresa para personalizar perguntas
  const empresaNome = currentFormState.empresa_slogan || currentFormState.nome || "sua empresa";
  
  if (nextFieldInfo.includes('nome') && !currentFormState.nome) {
    return "Olá! Sou especialista em identidade visual da Silver Brand House. Para começarmos seu briefing, qual é o seu nome completo?";
  } else if (nextFieldInfo.includes('email') && !currentFormState.email) {
    return "Perfeito! Agora preciso do seu e-mail para enviarmos o briefing completo depois. Qual é?";  
  } else if (nextFieldInfo.includes('telefone') && !currentFormState.telefone) {
    return "Ótimo! E qual seu telefone para contato? Assim podemos alinhar detalhes do projeto quando necessário.";
  } else if (nextFieldInfo.includes('empresa_slogan') && !currentFormState.empresa_slogan) {
    return "Agora vamos falar do seu negócio. Qual é o nome da empresa e ela tem algum slogan ou frase que já usam?";
  } else if (nextFieldInfo.includes('website') && !currentFormState.website) {
    return `A ${empresaNome} tem website, Instagram ou alguma rede social? Isso me ajuda a entender o que já existe da marca.`;
  } else if (nextFieldInfo.includes('cidade_estado') && !currentFormState.cidade_estado) {
    return "Em que cidade e estado vocês estão? O mercado local influencia nas decisões de identidade visual.";
  } else if (nextFieldInfo.includes('tipo_projeto') && !currentFormState.tipo_projeto) {
    return `Para a ${empresaNome}, este é um projeto de identidade visual completamente novo ou vocês já têm algo que precisa ser reformulado/melhorado?`;
  } else if (nextFieldInfo.includes('prazo') && !currentFormState.prazo) {
    return "Qual é o prazo ideal para vocês? Isso me ajuda a planejar as etapas do projeto de forma adequada.";
  } else if (nextFieldInfo.includes('sobre_empresa') && !currentFormState.sobre_empresa) {
    return `Para criar uma identidade visual que comunique bem o posicionamento da ${empresaNome}, preciso entender: o que vocês fazem exatamente e há quanto tempo existem?`;
  } else if (nextFieldInfo.includes('missao_visao_valores') && !currentFormState.missao_visao_valores) {
    return `A ${empresaNome} já tem missão, visão e valores definidos? Isso é fundamental para alinharmos a identidade visual com a essência da marca.`;
  } else if (nextFieldInfo.includes('produtos_servicos') && !currentFormState.produtos_servicos) {
    return "Quais produtos ou serviços vocês oferecem? Preciso entender o portfólio para criar uma identidade que reflita toda a atuação.";
  } else if (nextFieldInfo.includes('objetivos_hoje') && !currentFormState.objetivos_hoje) {
    return "Quais são os principais objetivos da empresa hoje? Crescimento, expansão, fidelização? Isso influencia como a marca deve se posicionar.";
  } else if (nextFieldInfo.includes('diferencial') && !currentFormState.diferencial) {
    return `No mercado onde a ${empresaNome} atua, qual é o principal diferencial competitivo? O que vocês fazem de especial que os concorrentes não fazem?`;
  } else if (nextFieldInfo.includes('como_ser_percebida') && !currentFormState.como_ser_percebida) {
    return `Quando alguém vê a marca ${empresaNome}, qual deve ser a primeira impressão? Por exemplo: "Esta empresa é confiável", "Este lugar me conecta", ou "Aqui encontro qualidade"?`;
  } else {
    return `Para desenvolver uma identidade visual forte para a ${empresaNome}, preciso entender melhor esse aspecto. Pode me dar mais detalhes específicos?`;
  }
}

// Função de extração manual melhorada com reformulação
function manualFieldExtraction(userMessage, currentFormState) {
  const fieldUpdates = {};
  const message = userMessage.toLowerCase().trim();
  
  // Detectar respostas vagas que precisam de reformulação
  const vagueResponses = ['nao sei', 'nao tenho', 'indefinido', 'pode me ajudar', 'nao', 'sim'];
  const isVague = vagueResponses.some(vague => message.includes(vague)) && message.length < 20;
  
  if (isVague) {
    console.log('🔍 Resposta vaga detectada, não extraindo campos:', userMessage);
    return {}; // Não extrair nada de respostas vagas
  }
  
  // Detectar informações específicas por contexto e conteúdo
  if (!currentFormState.empresa_slogan && message.length > 2 && !message.includes('nao')) {
    fieldUpdates.empresa_slogan = userMessage;
  } 
  
  if (!currentFormState.sobre_empresa && (
    message.includes('vendemos') || message.includes('fazemos') || 
    message.includes('empresa') || message.includes('negocio') || 
    message.includes('cafe') || message.includes('takeaway') ||
    (message.length > 10 && !isVague)
  )) {
    fieldUpdates.sobre_empresa = userMessage;
  }
  
  if (!currentFormState.produtos_servicos && (
    message.includes('cafe') || message.includes('latte') || 
    message.includes('cappuccino') || message.includes('produtos') ||
    message.includes('servicos') || message.includes('oferecemos')
  )) {
    fieldUpdates.produtos_servicos = userMessage;
  }
  
  if (!currentFormState.diferencial && (
    message.includes('diferencial') || message.includes('atendimento') ||
    message.includes('especial') || message.includes('unico') ||
    message.includes('melhor') || message.includes('sem duvida')
  )) {
    fieldUpdates.diferencial = userMessage;
  }
  
  if (!currentFormState.como_ser_percebida && (
    message.includes('perceb') || message.includes('referencia') || 
    message.includes('qualidade') || message.includes('reconheci')
  )) {
    fieldUpdates.como_ser_percebida = userMessage;
  }
  
  if (!currentFormState.objetivos_hoje && (
    message.includes('objetiv') || message.includes('meta') || 
    message.includes('crescer') || message.includes('futuro') ||
    message.includes('planos')
  )) {
    fieldUpdates.objetivos_hoje = userMessage;
  }
  
  // Campos básicos (mantidos)
  if (!currentFormState.website && (message.includes('www.') || message.includes('http') || message.includes('instagram'))) {
    fieldUpdates.website = userMessage;
  } 
  
  if (!currentFormState.cidade_estado && message.includes('/') && message.length < 50) {
    fieldUpdates.cidade_estado = userMessage;
  } 
  
  if (!currentFormState.tipo_projeto && (message.includes('novo') || message.includes('redesenho') || message.includes('redesign'))) {
    fieldUpdates.tipo_projeto = message.includes('novo') ? 'Projeto novo' : 'Redesenho';
  } 
  
  if (!currentFormState.prazo && (message.includes('mes') || message.includes('prazo') || message.includes('urgente') || message.includes('indefinido'))) {
    if (message.includes('indefinido')) fieldUpdates.prazo = 'Indefinido';
    else if (message.includes('urgente')) fieldUpdates.prazo = 'Urgente';
    else if (message.includes('1') || message.includes('um')) fieldUpdates.prazo = 'Em 1 mês';
    else if (message.includes('2') || message.includes('dois')) fieldUpdates.prazo = 'Em 2 meses';
  }
  
  console.log('🔧 Extração manual detectou:', Object.keys(fieldUpdates));
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
    'tipo_projeto': 'Este é um projeto de identidade visual novo ou um redesenho de algo que já existe?',
    'prazo': 'Para quando você precisa do projeto finalizado?',
    'itens_padrao': 'Perfeito! Estes itens de identidade visual já estão inclusos no seu pacote: Logo Principal, Logo Reduzida, Paleta de Cores, Tipografia, Manual de Marca e Registro de Direito Autoral. Vou confirmar isso para você.',
    'itens_extra': 'Além dos itens já inclusos no pacote, gostaria de adicionar algum item extra? Vou mostrar as opções disponíveis:',,
    'info_extra_itens': 'Tem alguma informação extra sobre os itens que mencionou?',
    'sobre_empresa': 'Para criar uma identidade visual que comunique bem o posicionamento, me conte: o que sua empresa faz e há quanto tempo existe?',
    'missao_visao_valores': 'Sua empresa já tem missão, visão e valores definidos? Quais são?',
    'produtos_servicos': 'Quais produtos ou serviços vocês oferecem?',
    'objetivos_hoje': 'Quais são os principais objetivos da empresa atualmente?',
    'diferencial': 'No seu mercado, qual é o principal diferencial competitivo? O que vocês fazem de especial?',
    'como_ser_percebida': 'Quando alguém vê sua marca, qual primeira impressão deve ter? Como querem ser percebidos?',
    'diferencial_concorrencia': 'O que diferencia vocês da concorrência?',
    'por_que_escolher': 'Por que alguém deveria escolher vocês em vez dos concorrentes?',
    'escala_sofisticada_descontraida': 'Como classificaria sua marca numa escala de 1 (descontraída) a 5 (sofisticada)?',
    'escala_tecnica_emocional': 'Sua comunicação é mais técnica (5) ou emocional (1)?',
    'escala_formal_informal': 'O tom da marca é mais formal (5) ou informal (1)?',
    'escala_tradicional_moderna': 'O estilo é mais tradicional (5) ou moderno (1)?',
    'escala_exclusiva_popular': 'O posicionamento é mais exclusivo (5) ou popular (1)?',
    'tres_palavras': 'Me diga 3 palavras que definem a personalidade da sua marca.',
    'concorrentes_locais': 'Quem são os principais concorrentes de vocês?',
    'gosta_nessas_marcas': 'O que você gosta nessas marcas concorrentes?',
    'marcas_admira': 'Que outras marcas vocês admiram, mesmo fora do seu nicho?',
    'info_extra_concorrentes': 'Tem mais alguma informação sobre concorrentes ou referências?',
    'cores_nao_quer': 'Existem cores que vocês definitivamente NÃO querem usar?',
    'cores_quer': 'Que cores vocês gostam e gostariam de explorar na identidade?',
    'fontes_gosta': 'Que tipos de fontes vocês gostam?',
    'tipos_logo': 'Que estilo de logo prefere para sua marca? Vou mostrar as opções:',
    'referencias_visuais': 'Você tem referências visuais que gosta?',
    'algo_a_dizer': 'Para finalizar, tem mais alguma coisa importante que gostaria de compartilhar sobre o projeto?'
  };
  
  return questions[field.id] || `Me conte sobre: ${field.label}`;
}

module.exports = {
  extractFields
};