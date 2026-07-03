// Interface para extração com OpenAI - sempre aguardar resposta
async function extractFields(conversationHistory, currentFormState, formSchema) {
  // Verificar se OpenAI está disponível
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('❌ OPENAI_API_KEY não configurada');
  }

  console.log('🎯 Usando OpenAI com structured outputs (strict mode)...');
  return await extractFieldsWithOpenAI(conversationHistory, currentFormState, formSchema);
}

// Extração com OpenAI usando structured outputs (strict mode) - SEMPRE AGUARDA RESPOSTA
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

  console.log('🔄 Chamada OpenAI API - Modelo: gpt-4o-mini (aguardando sempre a resposta)');

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
    console.error('❌ Erro na API OpenAI:', response.status, errorText);
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
  const aiMessage = assistantMessage.content || getDefaultResponseForField(formSchema, currentFormState);

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
      hasOptions: !!interactiveOptions,
      alwaysWaitsForResponse: true
    }
  };
}

// Função para gerar resposta padrão baseada no próximo campo
function getDefaultResponseForField(formSchema, currentFormState) {
  const nextFieldInfo = getCurrentFieldToWork(formSchema, currentFormState);
  
  if (nextFieldInfo.includes('name') && !currentFormState.name) {
    return "Olá! Para começarmos o briefing, qual é o seu nome completo?";
  } else if (nextFieldInfo.includes('email') && !currentFormState.email) {
    return "Perfeito! Agora preciso do seu e-mail para contato.";
  } else if (nextFieldInfo.includes('company_slogan') && !currentFormState.company_slogan) {
    return "Qual é o nome da sua empresa?";
  } else {
    return "Vamos continuar com o briefing. Pode me ajudar com mais informações?";
  }
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
- about_company: qualquer descrição do negócio
- mission_vision_values: missão, visão ou valores mencionados
- products_services: produtos/serviços oferecidos
- current_objectives: objetivos ou metas mencionados
- differentiator: diferenciais competitivos mencionados
- how_to_be_perceived: como querem ser percebidos
- E TODOS os outros campos quando informações relevantes aparecerem

EXEMPLO DE EXTRAÇÃO CORRETA:
Usuário: "vendemos cafe take away"
Ação: update_form_fields([{field_id: "about_company", value: "Vendemos café takeaway"}])

Usuário: "o atendimento sem duvidas" (sobre diferencial)
Ação: update_form_fields([{field_id: "differentiator", value: "O atendimento excepcional é nosso principal diferencial"}])

Usuário: "cafes variados, latte, capuccino etc..."
Ação: update_form_fields([{field_id: "products_services", value: "Oferecemos cafés variados incluindo latte, cappuccino e outras bebidas especiais"}])

QUANDO VOCÊ REFORMULA/CONSTRÓI CONCEITOS:
Se você ajudou a construir missão, visão, valores ou qualquer conceito durante a conversa,
você DEVE salvar a versão final construída nos campos apropriados:

Exemplo: Você construiu uma missão com o cliente:
"A Pradella Food tem como missão oferecer café de alta qualidade..."
Ação: update_form_fields([{field_id: "mission_vision_values", value: "MISSÃO: A Pradella Food tem como missão..."}])

CRÍTICO: NÃO DEIXE INFORMAÇÕES VALIOSAS SE PERDEREM!
Toda informação coletada durante a consultoria deve ser extraída para os campos apropriados.

🚫 NUNCA USE RESPOSTAS GENÉRICAS:
- PROIBIDO: "Para desenvolver uma identidade visual forte, preciso entender..."  
- PROIBIDO: "Pode me dar mais detalhes específicos?"
- PROIBIDO: Perguntas vagas ou repetitivas

✅ SEMPRE SEJA ESPECÍFICO:
- Faça perguntas diretas sobre o próximo campo necessário
- Use o contexto já coletado para fazer conexões
- Seja consultivo e educativo, nunca genérico

CAMPOS DISPONÍVEIS: name, email, phone, company_slogan, website, city_state, project_type, deadline, about_company, mission_vision_values, products_services, current_objectives, differentiator, how_to_be_perceived, competitive_differentiator, why_choose_you, etc.

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

🏢 Para "about_company":
"Vejo que vocês trabalham com café takeaway. Para criar uma identidade visual forte, preciso entender: vocês querem transmitir sofisticação (como um Starbucks) ou proximidade local (como uma cafeteria de bairro)? Qual experiência o cliente deve sentir ao ver sua marca?"

🎨 Para "how_to_be_perceived":
"Quando alguém vê a marca Pradella Food, qual deve ser a primeira impressão? Por exemplo: 'Esta marca entende de café de qualidade' ou 'Este lugar me faz sentir em casa' ou 'Aqui tenho a garantia de rapidez sem perder qualidade'?"

🏆 Para "differentiator":
"No mercado de cafés takeaway, o que faria alguém escolher vocês em vez de ir num Starbucks ou numa padaria? É a qualidade dos grãos, o atendimento personalizado, a localização, os preços, ou algo único que só vocês oferecem?"

💡 Para "mission_vision_values":
"Vamos construir isso juntos. Se a Pradella Food existir por 10 anos, qual legado querem deixar no mercado de café? O que querem que as pessoas digam sobre vocês quando recomendarem para um amigo?"

FORMATO DE RESPOSTA PROFISSIONAL:
1. Extraia informações usando update_form_fields
2. Se a resposta foi básica, reformule profissionalmente
3. Para campos com opções (select/multiselect/scale), NÃO liste as opções no texto
4. Faça pergunta específica e educativa sobre o próximo campo
5. Conecte a pergunta com estratégia de marca

CAMPOS COM OPÇÕES INTERATIVAS (não liste no texto):
- project_type: ["New Project", "Redesign"] 
- deadline: ["In 1 month", "In 2 months", "Indefinite", "Urgent"]
- standard_items: ["Main Logo", "Reduced Logo", "Color Palette", "Typography", "Brand Manual", "Copyright Registration"]
- extra_items: ["PowerPoint Template", "Instagram Highlights Cover", "Business Card Design", "Print Design"]
- logo_types: ["With symbol", "Typography only", "Minimalist", "Classic", "Modern"]
- Campos scale: sophisticated_relaxed_scale, technical_emotional_scale, etc.

EXEMPLO CORRETO para standard_items:
❌ "Você precisa de: Main Logo, Reduced Logo, Color Palette..." (não fazer)
✅ "Agora vamos definir quais itens de identidade visual são essenciais para a Pradella Food. Vou apresentar as opções principais para você escolher:" (sistema mostrará checkboxes)

REGRA DE OURO:
Transforme cada interação em uma mini-consultoria de branding. O cliente deve sair da conversa entendendo melhor sua própria marca e com um briefing realmente valioso.`;
}


// Função para detectar quando enviar opções interativas
function detectInteractiveOptions(formSchema, currentFormState) {
  // Encontrar o próximo campo a ser preenchido
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (!currentFormState[field.id] || currentFormState[field.id].toString().trim() === '') {
        
        // LÓGICA ESPECIAL: standard_items são inclusos, não mostrar como opção
        if (field.id === 'standard_items') {
          // Auto-preencher itens padrão e pular para próximo campo
          console.log('📦 Auto-preenchendo standard_items (já inclusos no pacote)');
          return {
            type: 'auto_fill',
            fieldId: 'standard_items',
            value: 'Main Logo, Reduced Logo, Color Palette, Typography, Brand Manual, Copyright Registration',
            message: 'Perfeito! Seu pacote de identidade visual já inclui estes itens essenciais: **Main Logo, Reduced Logo, Color Palette, Typography, Brand Manual e Copyright Registration**. Estes são os elementos fundamentais que toda marca precisa.'
          };
        }
        
        // Pular para o próximo campo (extra_items)
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
        if (section.id === 'personality' && !currentFormState.sophisticated_relaxed_scale) {
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
    'name': 'Qual é o seu nome completo?',
    'email': 'Qual é o seu e-mail para contato?',
    'company_slogan': 'Qual é o nome da sua empresa? Tem algum slogan?',
    'website': 'Você tem website ou Instagram da empresa?',
    'phone': 'Qual é o seu telefone para contato?',
    'city_state': 'Em que cidade e estado você está?',
    'project_type': 'Este é um projeto de identidade visual novo ou um redesenho de algo que já existe?',
    'deadline': 'Para quando você precisa do projeto finalizado?',
    'standard_items': 'Perfeito! Estes itens de identidade visual já estão inclusos no seu pacote: Main Logo, Reduced Logo, Color Palette, Typography, Brand Manual e Copyright Registration. Vou confirmar isso para você.',
    'extra_items': 'Além dos itens já inclusos no pacote, gostaria de adicionar algum item extra? Vou mostrar as opções disponíveis:',
    'extra_items_info': 'Tem alguma informação extra sobre os itens que mencionou?',
    'about_company': 'Para criar uma identidade visual que comunique bem o posicionamento, me conte: o que sua empresa faz e há quanto tempo existe?',
    'mission_vision_values': 'Sua empresa já tem missão, visão e valores definidos? Quais são?',
    'products_services': 'Quais produtos ou serviços vocês oferecem?',
    'current_objectives': 'Quais são os principais objetivos da empresa atualmente?',
    'differentiator': 'No seu mercado, qual é o principal diferencial competitivo? O que vocês fazem de especial?',
    'how_to_be_perceived': 'Quando alguém vê sua marca, qual primeira impressão deve ter? Como querem ser percebidos?',
    'competitive_differentiator': 'O que diferencia vocês da concorrência?',
    'why_choose_you': 'Por que alguém deveria escolher vocês em vez dos concorrentes?',
    'sophisticated_relaxed_scale': 'Como classificaria sua marca numa escala de 1 (descontraída) a 5 (sofisticada)?',
    'technical_emotional_scale': 'Sua comunicação é mais técnica (5) ou emocional (1)?',
    'formal_informal_scale': 'O tom da marca é mais formal (5) ou informal (1)?',
    'traditional_modern_scale': 'O estilo é mais tradicional (5) ou moderno (1)?',
    'exclusive_popular_scale': 'O posicionamento é mais exclusivo (5) ou popular (1)?',
    'three_words': 'Me diga 3 palavras que definem a personalidade da sua marca.',
    'local_competitors': 'Quem são os principais concorrentes de vocês?',
    'likes_in_brands': 'O que você gosta nessas marcas concorrentes?',
    'admired_brands': 'Que outras marcas vocês admiram, mesmo fora do seu nicho?',
    'extra_competitors_info': 'Tem mais alguma informação sobre concorrentes ou referências?',
    'colors_not_want': 'Existem cores que vocês definitivamente NÃO querem usar?',
    'colors_want': 'Que cores vocês gostam e gostariam de explorar na identidade?',
    'fonts_like': 'Que tipos de fontes vocês gostam?',
    'logo_types': 'Que estilo de logo prefere para sua marca? Vou mostrar as opções:',
    'visual_references': 'Você tem referências visuais que gosta?',
    'anything_to_say': 'Para finalizar, tem mais alguma coisa importante que gostaria de compartilhar sobre o projeto?'
  };
  
  return questions[field.id] || `Me conte sobre: ${field.label}`;
}

module.exports = {
  extractFields
};