from typing import Optional
import logging
from datetime import datetime
import httpx

from app.config import get_settings

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
**REGRA OBRIGATÓRIA:** Quando o cliente fornecer QUALQUER informação (nome, descrição, cor, etc), você DEVE SEMPRE incluir o marcador DATA_COLLECTED.

FORMATO EXATO (copie este modelo):

Sua mensagem normal aqui



DATA_COLLECTED:{{"campo": "valor"}}

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



DATA_COLLECTED:{"deliverables_confirmed": "sim", "extra_items": "nenhum"}
```

Seção ENTREGA - Cliente seleciona "Cartão de Visitas":
Você responde:
```
Anotado! Vamos falar sobre sua empresa?



DATA_COLLECTED:{"deliverables_confirmed": "sim", "extra_items": "Cartão de Visitas"}
```

Seção PERFIL - Cliente responde sobre a empresa:
Cliente diz: "Somos uma cafeteria especializada em café especial, existe há 2 anos"
Você responde:
```
Quais são os produtos/serviços oferecidos?



DATA_COLLECTED:{"about_company": "Cafeteria especializada em café especial, existe há 2 anos"}
```

Seção PERFIL - Cliente responde sobre produtos:
Cliente diz: "Oferecemos café especial, doces artesanais e brunches"
Você responde:
```
Qual é o principal diferencial do seu negócio?



DATA_COLLECTED:{"products_services": "Café especial, doces artesanais e brunches"}
```

Seção POSICIONAMENTO - Cliente seleciona escalas de personalidade:
Cliente seleciona as escalas (enviado como JSON)
Você responde:
```
Perfeito! Vamos falar sobre os concorrentes?



DATA_COLLECTED:{"personality_scales": {"scale_sophisticated": "4", "scale_technical": "2", "scale_formal": "3", "scale_traditional": "2", "scale_exclusive": "3"}}
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
) -> tuple[str, Optional[dict], Optional[list[dict]]]:
    """
    Gera resposta da IA como designer consultor.
    Sistema híbrido com fallback automático: Groq -> Hugging Face
    
    Returns:
        (resposta_texto, dados_extraidos_ou_None, opcoes_interativas_ou_None)
    """
    try:
        current_section = session_data.get("current_section", "intro")
        system_prompt = _build_system_prompt(session_data, current_section)
        
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
            return (
                "Desculpe, nosso sistema está com alto volume de uso no momento. 😅 "
                "Por favor, tente novamente em alguns minutos ou envie email para brandhousesilver@gmail.com",
                None,
                None
            )
        
        # Se todos falharam, retornar erro
        if raw_response is None:
            logger.error(f"❌ Todos os providers falharam. Último erro: {last_error}")
            return (
                "Desculpe, estou com dificuldades técnicas no momento. 😅 "
                "Por favor, tente novamente em alguns segundos ou envie email para brandhousesilver@gmail.com",
                None,
                None
            )
        
        # LOG: Ver resposta bruta da IA para debug
        logger.info(f"🤖 Resposta da IA (primeiros 500 chars): {raw_response[:500] if raw_response else 'VAZIO'}")
        logger.info(f"🔍 Contém DATA_COLLECTED? {'DATA_COLLECTED:' in raw_response if raw_response else False}")
        
        # Extrair dados estruturados da resposta (se houver)
        extracted_data = _extract_structured_data(raw_response, current_section)
        
        if extracted_data:
            logger.info(f"✅ Dados extraídos: {extracted_data}")
        else:
            logger.warning(f"⚠️ NENHUM dado extraído! Verifique se IA está gerando DATA_COLLECTED")
        
        # Remover DATA_COLLECTED da resposta visível ao usuário
        if "DATA_COLLECTED:" in raw_response:
            response = raw_response.split("DATA_COLLECTED:")[0].strip()
        else:
            response = raw_response
        
        # Detectar se deve mostrar opções interativas
        interactive_options = _detect_interactive_options(current_section, response)
        
        # LOG: Ver se detectou opções interativas
        if interactive_options:
            logger.info(f"✅ Opções interativas detectadas: {len(interactive_options)} opções")
        else:
            logger.info(f"ℹ️ Nenhuma opção interativa detectada para seção '{current_section}'")
        
        return response, extracted_data, interactive_options
        
    except Exception as e:
        logger.error(f"Erro crítico ao gerar resposta IA: {e}")
        return (
            "Desculpe, tive um problema técnico. 😅 "
            "Pode repetir sua mensagem ou enviar email para brandhousesilver@gmail.com",
            None,
            None
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


def suggest_next_section(current_section: str, briefing_data: dict) -> str:
    """Sugere próxima seção baseado no progresso e dados coletados."""
    sections_order = [
        "intro",
        "contato",
        "basicas",
        "entrega",
        "perfil",
        "posicionamento",
        "concorrentes",
        "visuais",
        "final"
    ]
    
    # Regras para avançar de seção
    section_requirements = {
        "intro": lambda d: d.get("client_name"),  # Precisa do nome
        "contato": lambda d: d.get("client_email") or d.get("client_phone"),  # Email OU telefone
        "basicas": lambda d: d.get("project_type"),  # Tipo de projeto
        "entrega": lambda d: d.get("deliverables_confirmed"),  # Confirmou itens de entrega
        "perfil": lambda d: d.get("about_company") or d.get("products_services"),  # Pelo menos sobre empresa ou produtos
        "posicionamento": lambda d: d.get("positioning") or d.get("keywords"),  # Posicionamento OU palavras-chave
        "concorrentes": lambda d: d.get("competitors") or d.get("references"),  # Concorrentes OU referências
        "visuais": lambda d: d.get("preferred_colors"),  # Cores preferidas
        "final": lambda d: True,  # Sempre pode avançar da final
    }
    
    try:
        current_idx = sections_order.index(current_section)
        
        # Verificar se pode avançar para próxima seção
        if current_section in section_requirements:
            requirement_met = section_requirements[current_section](briefing_data)
            if requirement_met and current_idx < len(sections_order) - 1:
                return sections_order[current_idx + 1]
        elif current_idx < len(sections_order) - 1:
            return sections_order[current_idx + 1]
            
    except ValueError:
        pass
    
    return current_section


def calculate_progress(briefing_data: dict) -> int:
    """Calcula percentual de conclusão do briefing baseado nas seções (0-100)."""
    
    # Peso por seção (total = 100%)
    section_weights = {
        "contato": 15,      # 15% - Nome, email, telefone, cidade
        "basicas": 10,      # 10% - Tipo de projeto, prazo
        "entrega": 10,      # 10% - Lista de entrega
        "perfil": 20,       # 20% - Descrição, produtos, missão, diferencial
        "posicionamento": 20,  # 20% - Posicionamento, palavras-chave, escalas
        "concorrentes": 10,    # 10% - Concorrentes, referências
        "visuais": 15,         # 15% - Cores, logo, fontes
    }
    
    progress = 0
    
    # Seção Contato (15%)
    contato_fields = ["client_name", "client_email", "client_phone", "city_state"]
    contato_filled = sum(1 for f in contato_fields if briefing_data.get(f))
    progress += (contato_filled / len(contato_fields)) * section_weights["contato"]
    
    # Seção Básicas (10%)
    basicas_fields = ["project_type", "deadline"]
    basicas_filled = sum(1 for f in basicas_fields if briefing_data.get(f))
    progress += (basicas_filled / len(basicas_fields)) * section_weights["basicas"]
    
    # Seção Entrega (10%) - Considera apenas que a seção foi visitada
    if briefing_data.get("deliverables_confirmed") or briefing_data.get("extra_items") is not None:
        progress += section_weights["entrega"]
    
    # Seção Perfil (20%)
    perfil_fields = ["about_company", "products_services", "diferencial", "mission_vision_values", "main_objectives"]
    perfil_filled = sum(1 for f in perfil_fields if briefing_data.get(f))
    
    # Compatibilidade com campos antigos
    if briefing_data.get("company_description") and not briefing_data.get("about_company"):
        perfil_filled += 1
    if briefing_data.get("objectives") and not briefing_data.get("main_objectives"):
        perfil_filled += 1
    
    if perfil_filled > 0:  # Pelo menos um campo preenchido
        progress += (perfil_filled / len(perfil_fields)) * section_weights["perfil"]
    
    # Seção Posicionamento (20%)
    posicionamento_fields = ["positioning", "differentiation", "keywords"]
    posicionamento_filled = sum(1 for f in posicionamento_fields if briefing_data.get(f))
    if briefing_data.get("personality_scales"):
        posicionamento_filled += 1
        posicionamento_fields.append("personality_scales")
    if posicionamento_filled > 0:
        progress += (posicionamento_filled / len(posicionamento_fields)) * section_weights["posicionamento"]
    
    # Seção Concorrentes (10%)
    concorrentes_fields = ["competitors", "references"]
    concorrentes_filled = sum(1 for f in concorrentes_fields if briefing_data.get(f))
    if concorrentes_filled > 0:
        progress += (concorrentes_filled / len(concorrentes_fields)) * section_weights["concorrentes"]
    
    # Seção Visuais (15%)
    visuais_fields = ["preferred_colors", "excluded_colors", "logo_types"]
    visuais_filled = sum(1 for f in visuais_fields if briefing_data.get(f))
    if visuais_filled > 0:
        progress += (visuais_filled / len(visuais_fields)) * section_weights["visuais"]
    
    return int(min(progress, 100))


def _detect_interactive_options(current_section: str, response: str) -> Optional[list[dict]]:
    """Detecta se deve mostrar opções interativas (checkboxes, scales) baseado na seção e conteúdo."""
    
    response_lower = response.lower()
    
    # NÃO mostrar opções se for uma resposta de confirmação/agradecimento
    if any(word in response_lower for word in ['entendi', 'ótimo', 'perfeito', 'maravilha', 'obrigad', 'anotado']):
        return None
    
    # SEÇÃO DE ENTREGA: Checkboxes para itens extras
    if current_section == "entrega":
        # Detectar quando lista os itens inclusos E menciona extras
        has_base_items = any(phrase in response_lower for phrase in [
            'logotipo principal', 'variações de cor', 'manual de identidade', 
            'arquivos editáveis', 'paleta de cores', 'tipografia recomendada',
            'o projeto inclui', 'itens incluídos'
        ])
        
        mentions_extras = any(phrase in response_lower for phrase in [
            'além desses', 'itens extras', 'selecionar extras', 'extras abaixo',
            'algo mais', 'não estiver listado', 'precisa de algo'
        ])
        
        # Mostrar checkboxes apenas se listar itens base E mencionar extras
        if has_base_items and mentions_extras:
            return [
                {
                    "type": "checkbox",
                    "label": "Template PowerPoint",
                    "value": "template_ppt"
                },
                {
                    "type": "checkbox",
                    "label": "Cartão de Visitas",
                    "value": "cartao_visitas"
                },
                {
                    "type": "checkbox",
                    "label": "Capas para Destaques do Instagram",
                    "value": "capas_instagram"
                },
                {
                    "type": "checkbox",
                    "label": "Artes para Impressão",
                    "value": "artes_impressao"
                },
                {
                    "type": "checkbox",
                    "label": "Não preciso de itens extras",
                    "value": "none"
                }
            ]
    
    # SEÇÃO DE POSICIONAMENTO: Escalas de personalidade
    if current_section == "posicionamento":
        # Detectar quando pergunta sobre personalidade da marca
        if any(phrase in response_lower for phrase in [
            'personalidade da marca', 'marque de 1 a 5', 'características',
            'definir a personalidade', 'escala de'
        ]):
            return [
                {
                    "type": "scale",
                    "label": "Sofisticada vs Descontraída",
                    "value": "scale_sophisticated",
                    "min_label": "Descontraída",
                    "max_label": "Sofisticada",
                    "min": 1,
                    "max": 5
                },
                {
                    "type": "scale",
                    "label": "Técnica vs Emocional",
                    "value": "scale_technical",
                    "min_label": "Emocional",
                    "max_label": "Técnica",
                    "min": 1,
                    "max": 5
                },
                {
                    "type": "scale",
                    "label": "Formal vs Informal",
                    "value": "scale_formal",
                    "min_label": "Informal",
                    "max_label": "Formal",
                    "min": 1,
                    "max": 5
                },
                {
                    "type": "scale",
                    "label": "Tradicional vs Moderna",
                    "value": "scale_traditional",
                    "min_label": "Moderna",
                    "max_label": "Tradicional",
                    "min": 1,
                    "max": 5
                },
                {
                    "type": "scale",
                    "label": "Exclusiva vs Popular",
                    "value": "scale_exclusive",
                    "min_label": "Popular",
                    "max_label": "Exclusiva",
                    "min": 1,
                    "max": 5
                }
            ]
    
    # SEÇÃO VISUAIS: Checkboxes para tipos de logo
    if current_section == "visuais":
        # Detectar quando pergunta sobre tipos de logo
        if any(phrase in response_lower for phrase in [
            'tipos de logo', 'tipo de logo', 'estilo de logo', 'logo prefere',
            'que logo você gosta', 'preferência de logo'
        ]):
            return [
                {
                    "type": "checkbox",
                    "label": "Com símbolo",
                    "value": "logo_symbol"
                },
                {
                    "type": "checkbox",
                    "label": "Só a tipografia",
                    "value": "logo_typography"
                },
                {
                    "type": "checkbox",
                    "label": "Minimalista",
                    "value": "logo_minimalist"
                },
                {
                    "type": "checkbox",
                    "label": "Clássico",
                    "value": "logo_classic"
                },
                {
                    "type": "checkbox",
                    "label": "Moderno",
                    "value": "logo_modern"
                }
            ]
    
    return None
