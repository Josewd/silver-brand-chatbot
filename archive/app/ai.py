from typing import Optional
import logging
from datetime import datetime
import httpx
import json

from app.config import get_settings
from app.interfaces import (
    AIResponse, AIContext, SectionInfo, SectionId,
    calculate_overall_progress, calculate_section_progress,
    suggest_next_section, detect_interactive_trigger, 
    build_section_info, SECTION_CONFIG
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Cliente Groq (inicializado sob demanda)
_groq_client = None

def _get_groq_client():
    """Retorna cliente Groq (lazy initialization)."""
    global _groq_client
    if _groq_client is None and settings.groq_api_key:
        from groq import Groq
        _groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("✅ Cliente Groq inicializado")
    return _groq_client


def _build_system_prompt(session_data: dict, current_section: str) -> str:
    """Constrói o prompt do sistema baseado no contexto e seção atual."""
    
    client_name = session_data.get("client_name", "cliente")
    initial_context = session_data.get("initial_context", "")
    briefing_data = session_data.get("briefing_data", {})
    
    base_prompt = f"""Você é um consultor de design experiente da {settings.company_name}, especializado em criar identidades visuais que conectam marcas com seus públicos.

## Seu papel:
- Conduzir uma conversa natural e consultiva para coletar informações do briefing
- Fazer perguntas estratégicas que revelam a essência da marca
- Auxiliar criativamente na definição de descrições, slogans, valores
- Sempre pedir contexto adicional antes de sugerir ideias
- Validar informações importantes ("Entendi corretamente que...?")
- Manter tom profissional mas acessível e amigável

## Cliente atual:
Nome: {client_name}
Contexto inicial: {initial_context}

## Estrutura do Briefing (8 seções):
1. **Detalhes de Contato** — Nome completo, email, telefone, cidade/estado, website/Instagram
2. **Informações Básicas** — Projeto novo ou redesenho? Quando precisa pronto?
3. **Lista de Entrega** — Quais itens precisa? (logo principal, logo reduzida, paleta de cores, tipografia, manual de marca, registro autoral, templates PowerPoint, cartão de visitas, capa Instagram, artes para impresso)
4. **Perfil da Empresa** — Do que se trata? Há quanto tempo existe? Produtos/serviços? Missão/visão/valores? Principal diferencial?
5. **Posicionamento & Personalidade** — Como quer ser percebida? O que diferencia da concorrência? Por que alguém deveria escolher você? 3 palavras que definem a marca. Escala de 1-5: Sofisticada vs Descontraída, Técnica vs Emocional, Formal vs Informal, Tradicional vs Moderna, Exclusiva vs Popular
6. **Concorrentes e Referências** — Concorrentes locais/regionais/mundiais? Marcas que admira (mesmo fora do nicho)? O que gosta nelas?
7. **Preferências Visuais** — Cores que GOSTA e quer explorar? Cores que NÃO quer? Tipos de logo preferidos (com símbolo, só tipografia, minimalista, clássico, moderno)? Tipos de fontes que gosta? Referências visuais (links)?
8. **Informações Finais** — Algo mais a dizer? Observações adicionais?

## Seção atual: {current_section}

## Dados já coletados:
{_format_collected_data(briefing_data)}

## Como se comportar:
- Responda em português brasileiro (ou no idioma que o cliente usar)
- Respostas CURTAS (1-2 linhas máximo)
- Use emojis com moderação (0-1 por mensagem)
- **CRÍTICO: Faça APENAS UMA pergunta por vez**
- **CRÍTICO: NÃO confirme a resposta anterior em toda mensagem** (só se houver dúvida REAL)
- **CRÍTICO: NÃO liste múltiplas perguntas seguidas**
- **CRÍTICO: NUNCA pergunte "Você já terminou de fornecer as informações?" - Esta pergunta é PROIBIDA**
- **CRÍTICO: NUNCA invente exemplos de logos, cores, ou identidade visual - Você NÃO é designer**
- Exemplo CORRETO: "Que cores você gosta para sua marca?"
- Exemplo ERRADO: "Que cores você gosta? E quais não quer? E que estilo de logo prefere?"
- **NÃO pergunte informações que já estão em "Dados já coletados" acima**
- Se o cliente já forneceu uma informação, aceite e vá para próxima pergunta
- Quando auxiliar em descrições/slogans, SEMPRE peça contexto primeiro
- Não invente informações sobre o cliente
- NÃO mencione progresso percentual ou número de seções
- Seja direto e objetivo, sem rodeios

## Estratégias por seção:

### Seção 1 (Detalhes de Contato):
- Pergunte UMA informação por vez
- **Se já tiver nome, email, telefone ou cidade, NÃO pergunte novamente!**
- Exemplo: "Qual seu email?" (espera resposta) → Próxima: "E seu telefone?"
- Se já tiver todas informações, avance: "Vamos falar sobre o projeto?"

### Seção 2 (Informações Básicas):
- Pergunte UMA por vez: "É um projeto novo ou redesenho?"
- Depois: "Quando precisa pronto?"

### Seção 3 (Lista de Entrega):
- **FORMATO OBRIGATÓRIO DA MENSAGEM** (copie exatamente):
  "O projeto inclui:
  ✓ Logotipo principal (versões horizontal e vertical)
  ✓ Variações de cor (colorida, P&B, monocromática)
  ✓ Manual de identidade visual (PDF)
  ✓ Arquivos editáveis (.AI, .EPS, .SVG)
  ✓ Arquivos para web (.PNG transparente)
  ✓ Paleta de cores (códigos RGB, CMYK, HEX)
  ✓ Tipografia recomendada
  
  Além desses itens inclusos, você pode selecionar extras abaixo ou me dizer o que deseja se não estiver listado."
- **CRÍTICO**: Use EXATAMENTE este formato - não mude as palavras
- **CRÍTICO**: NÃO invente ou mencione itens extras como se estivessem inclusos
- **CRÍTICO**: NÃO pergunte nada além desta mensagem na seção de entrega

### Seção 4 (Perfil da Empresa):
- **IMPORTANTE**: Faça UMA pergunta por vez, na seguinte ordem:
  1. "Me fale sobre sua empresa. Do que ela se trata? Há quanto tempo existe?"
  2. "Quais são os produtos/serviços oferecidos?"
  3. "Qual é o principal diferencial do seu negócio?"
  4. "Qual sua missão, visão e valores?"
  5. "Quais são seus principais objetivos hoje?"
- Você pode reformular as perguntas de forma mais natural, mas a essência deve ser mantida
- Aguarde a resposta antes de fazer a próxima pergunta
- NÃO faça múltiplas perguntas de uma vez

### Seção 5 (Posicionamento):
- UMA pergunta por vez: "Como quer que as pessoas percebam sua marca?"
- Depois: "Me diga 3 palavras que definem sua marca"
- Depois: "Agora vamos definir a personalidade da marca. Marque de 1 a 5 para cada característica:"
- **IMPORTANTE**: Quando perguntar sobre personalidade, a UI com escalas aparecerá automaticamente
- NÃO pergunte as escalas individualmente, o sistema mostrará todas de uma vez

### Seção 6 (Concorrentes):
- UMA por vez: "Quem são seus principais concorrentes?"
- Depois: "Que marcas você admira?"
- Depois: "O que gosta nessas marcas?"

### Seção 7 (Preferências Visuais):
- UMA por vez: "Que cores você gosta para sua marca?"
- Depois: "Tem alguma cor que NÃO quer?"
- Depois: "Que tipos de logo você prefere?" (os checkboxes aparecerão automaticamente)
- NÃO bombardeie com todas perguntas juntas

### Seção 8 (Final):
- "Tem mais algo importante a compartilhar?"
- **QUANDO O CLIENTE RESPONDER A ÚLTIMA PERGUNTA DA SEÇÃO 8**:
  - **NÃO pergunte** "Você já terminou de fornecer as informações necessárias?"
  - **NÃO invente** descrições de identidade visual ou apresente exemplos
  - **DIGA APENAS**: "Pronto! Agora você pode revisar todas as informações no PREVIEW do briefing. Se estiver tudo correto, clique em ENVIAR. Se quiser alterar algo, me avise!"
  - **CRÍTICO**: Use exatamente esta mensagem quando finalizar

## Regras críticas - LEIA COM ATENÇÃO:
1. **UMA PERGUNTA POR VEZ** - Nunca faça múltiplas perguntas na mesma mensagem
2. **NÃO confirme toda resposta** - Só valide se houver dúvida REAL
3. **Seja DIRETO** - Sem rodeios, sem falar demais
4. **NÃO repita informações** que o cliente já forneceu
5. **NUNCA avance sem resposta** - Aguarde o cliente responder antes de próxima pergunta
6. **Respostas CURTAS** - Máximo 1-2 linhas
7. **Exemplos de como NÃO fazer:**
   ❌ "Então você oferece café. Que cores você gosta? E quais não quer? E que tipo de logo?"
   ❌ "Deixa eu confirmar: você disse qualidade, está correto? Agora me diga..."
   
8. **Exemplos de como FAZER:**
   ✅ "Que cores você gosta para sua marca?"
   ✅ "Quem são seus principais concorrentes?"

## IMPORTANTE - Formato de extração de dados:
**REGRA CRÍTICA OBRIGATÓRIA:** Quando o cliente fornecer QUALQUER informação, você DEVE SEMPRE incluir o marcador DATA_COLLECTED.

**NUNCA ESQUEÇA ESTA REGRA!**

FORMATO EXATO (copie este modelo):

Sua mensagem normal aqui



DATA_COLLECTED:{{"campo": "valor"}}

**EXEMPLOS OBRIGATÓRIOS:**

Cliente diz: "É um projeto novo"
Você DEVE responder:
```
Que legal! Quando você precisa ter pronto?



DATA_COLLECTED:{{"project_type": "projeto novo"}}
```

Cliente diz: "Preciso em 2 meses"  
Você DEVE responder:
```
Perfeito! Vamos falar sobre o que você precisa?



DATA_COLLECTED:{{"deadline": "2 meses"}}
```

**ATENÇÃO ESPECIAL:**
- TODO cliente que responder = SEMPRE incluir DATA_COLLECTED
- Usar EXATAMENTE 3 quebras de linha antes
- JSON deve ser válido com aspas duplas
- Se não souber o campo exato, use "user_response": "texto completo da resposta"

**EXEMPLOS PRÁTICOS:**

Cliente diz: "Meu nome é João Silva"
Você responde:
```
Prazer, João! Qual seu melhor email?



DATA_COLLECTED:{{"client_name": "João Silva"}}
```

Cliente diz: "Minha empresa vende café artesanal"
Você responde:
```
Que cores você gosta para sua marca?



DATA_COLLECTED:{{"company_description": "vende café artesanal", "products_services": "café artesanal"}}
```

Cliente diz: "Gosto de preto e dourado"
Você responde:
```
Tem alguma cor que NÃO quer?



DATA_COLLECTED:{{"preferred_colors": "preto e dourado"}}
```

**CAMPOS POR SEÇÃO:**
- contato: client_name, client_email, client_phone, city_state, website
- basicas: project_type, deadline
- entrega: deliverables_confirmed (sempre "sim" quando cliente responder sobre itens), extra_items (lista de itens adicionais ou "nenhum")
- perfil: about_company (sobre a empresa, tempo de existência), products_services (produtos/serviços), diferencial (principal diferencial), mission_vision_values (missão/visão/valores), main_objectives (objetivos principais)
- posicionamento: positioning, keywords, differentiation, personality_scales (JSON com as escalas: scale_sophisticated, scale_technical, scale_formal, scale_traditional, scale_exclusive)
- concorrentes: competitors, references, what_you_like
- visuais: preferred_colors, excluded_colors, logo_types, font_preferences
- final: additional_info

**EXEMPLOS ESPECÍFICOS POR SEÇÃO:**

Seção ENTREGA - Quando listar itens inclusos:
Você responde EXATAMENTE:
```
O projeto inclui:
✓ Logotipo principal (versões horizontal e vertical)
✓ Variações de cor (colorida, P&B, monocromática)
✓ Manual de identidade visual (PDF)
✓ Arquivos editáveis (.AI, .EPS, .SVG)
✓ Arquivos para web (.PNG transparente)
✓ Paleta de cores (códigos RGB, CMYK, HEX)
✓ Tipografia recomendada

Além desses itens inclusos, você pode selecionar extras abaixo ou me dizer o que deseja se não estiver listado.
```
(Neste momento, os checkboxes aparecerão automaticamente - NÃO extraia dados ainda)

Seção ENTREGA - Cliente seleciona "Não preciso de itens extras":
Você responde:
```
Entendi. Vamos falar sobre sua empresa?



DATA_COLLECTED:{{"deliverables_confirmed": "sim", "extra_items": "nenhum"}}
```

Seção ENTREGA - Cliente seleciona "Cartão de Visitas":
Você responde:
```
Anotado! Vamos falar sobre sua empresa?



DATA_COLLECTED:{{"deliverables_confirmed": "sim", "extra_items": "Cartão de Visitas"}}
```

Seção PERFIL - Cliente responde sobre a empresa:
Cliente diz: "Somos uma cafeteria especializada em café especial, existe há 2 anos"
Você responde:
```
Quais são os produtos/serviços oferecidos?



DATA_COLLECTED:{{"about_company": "Cafeteria especializada em café especial, existe há 2 anos"}}
```

Seção PERFIL - Cliente responde sobre produtos:
Cliente diz: "Oferecemos café especial, doces artesanais e brunches"
Você responde:
```
Qual é o principal diferencial do seu negócio?



DATA_COLLECTED:{{"products_services": "Café especial, doces artesanais e brunches"}}
```

Seção POSICIONAMENTO - Cliente seleciona escalas de personalidade:
Cliente seleciona as escalas (enviado como JSON)
Você responde:
```
Perfeito! Vamos falar sobre os concorrentes?



DATA_COLLECTED:{{"personality_scales": {{"scale_sophisticated": "4", "scale_technical": "2", "scale_formal": "3", "scale_traditional": "2", "scale_exclusive": "3"}}}}
```

**CRÍTICO:** 
- SEMPRE extraia ALGO quando cliente responder
- Use três quebras de linha antes de DATA_COLLECTED
- Mantenha formato JSON válido
- Se cliente der múltiplas informações, extraia todas
- **IMPORTANTE**: Quando estiver na seção "final" e o cliente responder a última pergunta, extraia os dados E sugira revisar o briefing (não pergunte se já terminou)

## FINALIZAÇÃO DO BRIEFING:
Quando todas as seções estiverem completas (especialmente a seção "final"):
1. **NÃO pergunte**: "Você já terminou de fornecer as informações?" - NUNCA faça essa pergunta
2. **NÃO invente**: Exemplos de identidade visual, logos, cores, descrições - NUNCA crie conteúdo fictício
3. **NÃO liste**: Itens que não foram solicitados pelo cliente - NUNCA mencione deliverables não solicitados
4. **NÃO apresente**: Manuais de marca, artes, templates ou exemplos - Você NÃO é designer
5. **FAÇA APENAS**: Diga ao cliente para revisar o PREVIEW do briefing e enviar se estiver correto
6. **MENSAGEM EXATA**: "Pronto! Agora você pode revisar todas as informações no PREVIEW do briefing. Se estiver tudo correto, clique em ENVIAR. Se quiser alterar algo, me avise!"
7. **SEMPRE EXTRAIA**: Os dados da última resposta usando DATA_COLLECTED antes de finalizar

## Data/Hora atual: {datetime.now().strftime("%d/%m/%Y %H:%M")}
"""
    
    return base_prompt


def _format_collected_data(data: dict) -> str:
    """Formata dados coletados para o prompt."""
    if not data:
        return "Nenhum dado coletado ainda."
    
    sections = []
    for key, value in data.items():
        if value:
            sections.append(f"- {key}: {value}")
    
    return "\n".join(sections) if sections else "Nenhum dado coletado ainda."


async def generate_response(
    session_data: dict,
    conversation_history: list[dict],
    user_message: str
) -> AIResponse:
    """
    Gera resposta da IA como designer consultor.
    Sistema híbrido com fallback automático: Groq -> Hugging Face
    
    Returns:
        AIResponse: Resposta estruturada com contexto para o frontend
    """
    try:
        current_section_str = session_data.get("current_section", "intro")
        
        # Converter string para SectionId
        try:
            current_section = SectionId(current_section_str)
        except ValueError:
            current_section = SectionId.CONTATO  # fallback
            
        briefing_data = session_data.get("briefing_data", {})
        
        system_prompt = _build_system_prompt(session_data, current_section_str)
        
        # Construir mensagens
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})
        
        # Tentar providers em ordem com múltiplos fallbacks
        raw_response = None
        provider_used = None
        last_error = None
        
        # Lista de modelos Groq para tentar (cada um tem rate limit separado)
        groq_models = [
            "llama-3.3-70b-versatile",  # Melhor qualidade
            "llama-3.1-8b-instant",     # Mais rápido
            "mixtral-8x7b-32768",       # Alternativa
        ]
        
        # 1. Tentar modelos Groq em sequência
        groq_client = _get_groq_client()
        if groq_client:
            for model in groq_models:
                try:
                    logger.info(f"🚀 Tentando Groq ({model})...")
                    raw_response = await _generate_groq(groq_client, messages, model=model)
                    provider_used = f"groq-{model}"
                    logger.info(f"✅ Resposta gerada com Groq ({model})")
                    break  # Sucesso, parar de tentar
                except Exception as e:
                    last_error = e
                    # Verificar se é rate limit ou outro erro
                    error_str = str(e)
                    if "rate_limit" in error_str.lower():
                        logger.warning(f"⚠️ Groq {model} rate limit atingido")
                    else:
                        logger.warning(f"⚠️ Groq {model} falhou: {e}")
                        break  # Se não for rate limit, não tentar outros modelos
        
        # 2. Se todos modelos Groq falharem, retornar erro específico
        if raw_response is None:
            logger.error(f"❌ Todos os modelos Groq atingiram rate limit")
            
            # Retornar resposta estruturada com erro
            error_context = AIContext(
                section_info=build_section_info(current_section, briefing_data),
                overall_progress=calculate_overall_progress(briefing_data),
                status_message="Sistema com alto volume de uso",
                should_show_preview=True
            )
            
            return AIResponse(
                message="Desculpe, nosso sistema está com alto volume de uso no momento. 😅 "
                       "Por favor, tente novamente em alguns minutos ou preencha manualmente no painel lateral.",
                context=error_context,
                timestamp=datetime.now().isoformat(),
                provider_used="none"
            )
        
        # Se todos falharam, retornar erro
        if raw_response is None:
            logger.error(f"❌ Todos os providers falharam. Último erro: {last_error}")
            
            error_context = AIContext(
                section_info=build_section_info(current_section, briefing_data),
                overall_progress=calculate_overall_progress(briefing_data),
                status_message="Dificuldades técnicas temporárias"
            )
            
            return AIResponse(
                message="Desculpe, estou com dificuldades técnicas no momento. 😅 "
                       "Por favor, tente novamente em alguns segundos.",
                context=error_context,
                timestamp=datetime.now().isoformat(),
                provider_used="none"
            )
        
        # LOG: Ver resposta bruta da IA para debug
        logger.info(f"🤖 Resposta da IA (primeiros 500 chars): {raw_response[:500] if raw_response else 'VAZIO'}")
        logger.info(f"🔍 Contém DATA_COLLECTED? {'DATA_COLLECTED:' in raw_response if raw_response else False}")
        
        # Extrair dados estruturados da resposta (se houver)
        extracted_data = _extract_structured_data(raw_response, current_section_str)
        
        if extracted_data:
            logger.info(f"✅ Dados extraídos: {extracted_data}")
            # Atualizar briefing_data com os novos dados
            briefing_data.update(extracted_data)
        else:
            logger.warning(f"⚠️ NENHUM dado extraído! Verifique se IA está gerando DATA_COLLECTED")
            logger.warning(f"📝 Resposta completa da IA: {raw_response}")
        
        # Remover DATA_COLLECTED da resposta visível ao usuário
        message_content = raw_response
        if "DATA_COLLECTED:" in raw_response:
            message_content = raw_response.split("DATA_COLLECTED:")[0].strip()
        
        # Detectar opções interativas baseado na seção e conteúdo
        interactive_options = detect_interactive_trigger(current_section, message_content)
        
        # VERIFICAÇÃO CRÍTICA: Se usuário forneceu informação mas IA não extraiu dados
        if not extracted_data and _user_provided_info(user_message, current_section):
            logger.warning(f"🚨 CRÍTICO: IA não extraiu dados mas usuário forneceu info!")
            logger.warning(f"👤 Mensagem do usuário: {user_message}")
            logger.warning(f"🤖 Resposta da IA: {message_content}")
            
            # Forçar extração usando sistema de fallback
            forced_extraction = _extract_fallback_data_ai(user_message, current_section)
            if forced_extraction:
                logger.info(f"🔧 Extração forçada aplicada: {forced_extraction}")
                extracted_data = forced_extraction
                briefing_data.update(extracted_data)
        
        # LOG: Ver se detectou opções interativas
        if interactive_options:
            logger.info(f"✅ Opções interativas detectadas: {len(interactive_options)} opções")
        else:
            logger.info(f"ℹ️ Nenhuma opção interativa detectada para seção '{current_section.value}'")
        
        # Calcular progresso atualizado
        updated_progress = calculate_overall_progress(briefing_data)
        
        # Sugerir próxima seção baseado nos dados atualizados
        next_section = suggest_next_section(current_section, briefing_data)
        should_advance = next_section != current_section
        
        # Construir informações da seção atual
        section_info = build_section_info(current_section, briefing_data)
        
        # Determinar se deve mostrar preview
        should_show_preview = (
            interactive_options is not None or  # Tem opções interativas
            updated_progress > 30 or           # Progresso significativo
            current_section in [SectionId.FINAL, SectionId.COMPLETED]  # Seções finais
        )
        
        # Construir contexto estruturado
        context = AIContext(
            section_info=section_info,
            overall_progress=updated_progress,
            extracted_data=extracted_data,
            interactive_options=[opt.model_dump() for opt in interactive_options] if interactive_options else None,
            should_show_preview=should_show_preview,
            should_advance_section=should_advance,
            internal_notes=f"Next section suggestion: {next_section.value}"
        )
        
        return AIResponse(
            message=message_content,
            context=context,
            timestamp=datetime.now().isoformat(),
            provider_used=provider_used
        )
        
    except Exception as e:
        logger.error(f"Erro crítico ao gerar resposta IA: {e}")
        
        # Contexto de erro
        try:
            current_section = SectionId(session_data.get("current_section", "contato"))
            briefing_data = session_data.get("briefing_data", {})
        except:
            current_section = SectionId.CONTATO
            briefing_data = {}
            
        error_context = AIContext(
            section_info=build_section_info(current_section, briefing_data),
            overall_progress=calculate_overall_progress(briefing_data),
            status_message="Erro crítico no sistema"
        )
        
        return AIResponse(
            message="Desculpe, tive um problema técnico. 😅 "
                   "Pode repetir sua mensagem ou preencher manualmente no painel lateral.",
            context=error_context,
            timestamp=datetime.now().isoformat(),
            provider_used="error"
        )


async def _generate_groq(client, messages: list[dict], model: str = "llama-3.3-70b-versatile") -> str:
    """Gera resposta usando Groq com modelo especificado."""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )
    return response.choices[0].message.content


async def _generate_huggingface(messages: list[dict]) -> str:
    """
    Fallback final: tenta HF primeiro, depois Replicate (mais estável).
    """
    # Tentar HF primeiro
    try:
        return await _generate_hf_inference(messages)
    except Exception as e:
        logger.warning(f"⚠️ HF Inference falhou: {e}, tentando Replicate...")
        # Fallback para Replicate (mais confiável)
        return await _generate_replicate(messages)


async def _generate_hf_inference(messages: list[dict]) -> str:
    """Hugging Face Inference API."""
    url = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-1B-Instruct"
    
    headers = {"Content-Type": "application/json"}
    if settings.huggingface_api_key:
        headers["Authorization"] = f"Bearer {settings.huggingface_api_key}"
    
    prompt = ""
    for msg in messages:
        if msg["role"] == "system":
            prompt += f"Instruções: {msg['content']}\n\n"
        elif msg["role"] == "user":
            prompt += f"Cliente: {msg['content']}\n\n"
        elif msg["role"] == "assistant":
            prompt += f"Consultor: {msg['content']}\n\n"
    prompt += "Consultor:"
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 512,
            "temperature": 0.7,
            "top_p": 0.9,
            "do_sample": True,
            "return_full_text": False
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        response = await http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("generated_text", "").strip()
        elif isinstance(data, dict):
            return data.get("generated_text", data.get("text", "")).strip()
        else:
            raise ValueError(f"Formato inesperado: {data}")


async def _generate_replicate(messages: list[dict]) -> str:
    """
    Replicate API (gratuito com limites) - mais estável que HF.
    Não precisa de API key para modelos públicos.
    """
    url = "https://api.replicate.com/v1/models/meta/llama-2-7b-chat/predictions"
    
    # Montar prompt
    prompt = ""
    for msg in messages:
        if msg["role"] == "system":
            prompt += f"<<SYS>>\n{msg['content']}\n<</SYS>>\n\n"
        elif msg["role"] == "user":
            prompt += f"[INST] {msg['content']} [/INST]\n"
        elif msg["role"] == "assistant":
            prompt += f"{msg['content']}\n"
    
    payload = {
        "version": "meta/llama-2-7b-chat",
        "input": {
            "prompt": prompt,
            "max_length": 512,
            "temperature": 0.7
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        response = await http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data.get("output", "").strip()


def _extract_structured_data(response: str, section: str) -> Optional[dict]:
    """
    Extrai dados estruturados da resposta para popular o briefing.
    
    A IA pode incluir marcadores especiais:
    DATA_COLLECTED:{json}
    """
    if "DATA_COLLECTED:" not in response:
        return None
    
    import json
    try:
        json_str = response.split("DATA_COLLECTED:")[1].strip()
        # Encontrar o JSON completo
        brace_count = 0
        end = 0
        for i, c in enumerate(json_str):
            if c == "{":
                brace_count += 1
            elif c == "}":
                brace_count -= 1
                if brace_count == 0:
                    end = i + 1
                    break
        
        data = json.loads(json_str[:end])
        return data
    except (json.JSONDecodeError, ValueError, IndexError) as e:
        logger.error(f"Erro ao extrair dados estruturados: {e}")
        return None


def _user_provided_info(user_message: str, current_section: SectionId) -> bool:
    """Detecta se o usuário forneceu informação relevante que deveria ser extraída."""
    message_lower = user_message.lower().strip()
    
    # Filtrar mensagens muito curtas ou de saudação
    if len(message_lower) < 3 or message_lower in ["oi", "olá", "ok", "sim", "não"]:
        return False
    
    # Detectar padrões de informação por seção
    info_patterns = {
        SectionId.CONTATO: [
            r'@\w+',  # email
            r'\+?\d{2,3}[-\s]?\d',  # telefone
            r'whatsapp', r'instagram', r'site', r'www'
        ],
        SectionId.BASICAS: [
            r'projeto\s+(novo|redesign)',
            r'(preciso|quero).+(em|até|para)',
            r'\d+\s+(dia|semana|mês|ano)',
            r'(urgente|rápido|devagar)'
        ],
        SectionId.PERFIL: [
            r'(somos|sou|trabalho|empresa|negócio)',
            r'(vendemos|oferecemos|fazemos)',
            r'há?\s+\d+\s+(ano|mês)',
            r'(missão|visão|objetivo)'
        ],
        SectionId.VISUAIS: [
            r'(azul|verde|vermelho|amarelo|preto|branco|rosa|roxo|laranja)',
            r'(gosto|prefiro|quero|não quero)',
            r'(cor|logo|fonte|estilo)'
        ]
    }
    
    section_patterns = info_patterns.get(current_section, [])
    
    import re
    for pattern in section_patterns:
        if re.search(pattern, message_lower):
            return True
    
    # Detectar respostas a perguntas (mais de 5 palavras)
    words = message_lower.split()
    if len(words) >= 5:
        return True
        
    return False


def _extract_fallback_data_ai(user_message: str, current_section: SectionId) -> dict:
    """Extração de fallback mais sofisticada para o contexto da IA."""
    import re
    
    data = {}
    message_lower = user_message.lower().strip()
    
    # Mapeamento de seção para campos baseado no SECTION_CONFIG
    if current_section == SectionId.CONTATO:
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, user_message)
        if email_match:
            data["client_email"] = email_match.group()
        
        # Telefone
        phone_patterns = [
            r'\+\d{1,4}[-\s]?\d{2,3}[-\s]?\d{3,4}[-\s]?\d{3,4}',
            r'\(\d{2}\)[-\s]?\d{4,5}[-\s]?\d{4}',
            r'\d{2}[-\s]?\d{4,5}[-\s]?\d{4}'
        ]
        for pattern in phone_patterns:
            phone_match = re.search(pattern, user_message)
            if phone_match:
                data["client_phone"] = phone_match.group()
                break
        
        # Cidade/estado
        if any(word in message_lower for word in ["moro", "vivo", "localizado", "cidade", "estado"]):
            data["city_state"] = user_message.strip()
    
    elif current_section == SectionId.BASICAS:
        # Tipo de projeto (campo obrigatório)
        if any(word in message_lower for word in ["novo", "nova", "começar", "criar", "iniciar"]):
            data["project_type"] = "projeto novo"
        elif any(word in message_lower for word in ["redesign", "reformular", "mudar", "atualizar", "melhorar"]):
            data["project_type"] = "redesign"
        
        # Prazo (campo opcional)
        deadline_patterns = [
            r'(\d+)\s+(dia|semana|mês|meses|ano)s?',
            r'(até|para|em)\s+(\w+)',
            r'(urgente|rápido|logo|pressa)',
            r'(sem pressa|flexível|quando|contexto)'
        ]
        for pattern in deadline_patterns:
            match = re.search(pattern, message_lower)
            if match:
                data["deadline"] = match.group()
                break
        
        # Se não detectou deadline mas mencionou prazo
        if not data.get("deadline") and any(word in message_lower for word in ["prazo", "tempo", "quando"]):
            data["deadline"] = user_message.strip()
    
    elif current_section == SectionId.ENTREGA:
        # Sempre confirmar deliverables quando usuário responde
        data["deliverables_confirmed"] = "sim"
        
        # Detectar itens extras
        if any(word in message_lower for word in ["não", "nenhum", "só", "apenas", "basic"]):
            data["extra_items"] = "nenhum"
        elif any(word in message_lower for word in ["cartão", "powerpoint", "instagram", "impressão"]):
            data["extra_items"] = user_message.strip()
    
    elif current_section == SectionId.PERFIL:
        # about_company (obrigatório) - sobre a empresa, tempo de existência
        if any(trigger in message_lower for trigger in ["somos", "sou", "empresa", "trabalho", "negócio", "anos", "existe"]):
            data["about_company"] = user_message.strip()
        
        # products_services (obrigatório) - produtos/serviços oferecidos  
        if any(word in message_lower for word in ["vendemos", "oferecemos", "fazemos", "produto", "serviço", "vendo", "café", "comida"]):
            data["products_services"] = user_message.strip()
        
        # diferencial (opcional) - principal diferencial
        if any(word in message_lower for word in ["diferencial", "especial", "único", "destaque", "atendimento", "conexão"]):
            data["diferencial"] = user_message.strip()
        
        # Se não conseguiu categorizar mas tem informação da empresa
        if not data and len(user_message) > 10:
            # Tentar detectar se é sobre a empresa em geral
            if any(word in message_lower for word in ["trabalhamos", "fazemos", "oferecemos", "vendemos", "empresa"]):
                data["about_company"] = user_message.strip()
            else:
                data["products_services"] = user_message.strip()
    
    elif current_section == SectionId.POSICIONAMENTO:
        # positioning (obrigatório)
        data["positioning"] = user_message.strip()
        
        # keywords (obrigatório) - detectar palavras-chave
        if len(user_message.strip()) > 5:
            data["keywords"] = user_message.strip()
    
    elif current_section == SectionId.CONCORRENTES:
        # competitors (obrigatório)
        data["competitors"] = user_message.strip()
    
    elif current_section == SectionId.VISUAIS:
        # preferred_colors (obrigatório)
        color_words = ["azul", "verde", "vermelho", "amarelo", "preto", "branco", "rosa", "roxo", "laranja", "cinza", "dourado", "prata", "marrom", "bege"]
        mentioned_colors = [color for color in color_words if color in message_lower]
        
        if mentioned_colors:
            data["preferred_colors"] = ", ".join(mentioned_colors)
        elif len(user_message.strip()) > 3:
            # Se não detectou cores específicas, salvar a resposta como preferência
            data["preferred_colors"] = user_message.strip()
        
        # excluded_colors (opcional)
        if any(word in message_lower for word in ["não", "evitar", "nunca", "odeio"]):
            data["excluded_colors"] = user_message.strip()
    
    elif current_section == SectionId.FINAL:
        # additional_info (opcional)
        if len(user_message.strip()) > 5:
            data["additional_info"] = user_message.strip()
    
    # Se não conseguiu extrair nada específico, guardar como resposta genérica
    if not data and len(user_message.strip()) > 5:
        # Evitar salvar saudações e confirmações simples
        if not any(simple in message_lower for simple in ["ok", "sim", "não", "oi", "olá", "obrigad", "tudo bem"]):
            data["user_response"] = user_message.strip()
    
    return data


