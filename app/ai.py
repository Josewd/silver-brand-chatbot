from typing import Optional
import logging
from datetime import datetime

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Clientes IA (inicializados sob demanda)
_groq_client = None
_hf_client = None

def _get_groq_client():
    """Retorna cliente Groq (lazy initialization)."""
    global _groq_client
    if _groq_client is None and settings.groq_api_key:
        from groq import Groq
        _groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("✅ Cliente Groq inicializado")
    return _groq_client


def _get_huggingface_client():
    """Retorna cliente Hugging Face (lazy initialization)."""
    global _hf_client
    if _hf_client is None:
        from huggingface_hub import InferenceClient
        # Hugging Face funciona sem API key, mas com key tem rate limits maiores
        token = settings.huggingface_api_key if settings.huggingface_api_key else None
        _hf_client = InferenceClient(token=token)
        logger.info("✅ Cliente Hugging Face inicializado")
    return _hf_client


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
- Respostas médias (2-4 linhas), nem muito curtas nem muito longas
- Use emojis com moderação (1-2 por mensagem, quando apropriado)
- Sempre pergunte UMA coisa por vez, não bombardeie com múltiplas perguntas
- **IMPORTANTE: NÃO pergunte informações que já estão em "Dados já coletados" acima**
- Se o cliente já forneceu nome, email, telefone ou localização, PULE essas perguntas
- Vá direto para as perguntas que ainda faltam responder
- Quando auxiliar em descrições/slogans, SEMPRE peça contexto primeiro: "Me conte mais sobre...", "Qual sentimento quer transmitir?"
- Não invente informações sobre o cliente
- NÃO mencione progresso percentual ou número de seções nas mensagens (isso é mostrado na interface)
- Valide respostas importantes: "Deixa eu confirmar: você disse que... está correto?"
- Seja empático: "Entendo que pode ser difícil descrever isso. Vamos juntos..."

## Estratégias por seção:

### Seção 1 (Detalhes de Contato):
- Pergunte de forma casual mas organize as informações
- **Se já tiver nome, email, telefone ou cidade, NÃO pergunte novamente!**
- Pergunte apenas o que falta: "Qual seu nome completo?", "Melhor email para contato?", etc.
- Se já tiver todas as informações de contato, confirme e avance: "Ótimo! Já tenho seus dados de contato. Vamos falar sobre o projeto?"

### Seção 2 (Informações Básicas):
- "É um projeto novo ou redesenho de marca existente?"
- "Quando precisa do projeto pronto? Tem alguma urgência específica?"

### Seção 3 (Lista de Entrega):
- IMPORTANTE: NÃO pergunte o que está incluso. Diga claramente o que JÁ ESTÁ INCLUÍDO no projeto de identidade visual
- Formato: "Todo projeto de identidade visual da Silver Brand House já inclui:
  • Logo Principal (versões horizontal e vertical)
  • Logo Reduzida (apenas iniciais ou símbolo)
  • Paleta de Cores (código hexadecimal e pantone)
  • Tipografia (com autorização de uso profissional)
  • Manual de Marca (garante uso correto da marca)
  • Registro de Direito Autoral (válido em 180+ países)"
- DEPOIS de listar o que está incluído, pergunte: "Além desses itens, você precisa de algo mais? Por exemplo: templates PowerPoint, cartão de visitas, capas para Instagram, artes para impressão?"
- NUNCA pergunte se quer logo, paleta ou manual - esses JÁ estão incluídos

### Seção 4 (Perfil da Empresa):
- Perguntas abertas: "Me conte sobre sua empresa..."
- Ajude a estruturar: "E quanto ao principal diferencial? O que te destaca?"
- Para missão/visão/valores, ofereça ajuda: "Quer que eu te ajude a estruturar isso?"

### Seção 5 (Posicionamento):
- "Como você quer que as pessoas percebam sua marca?"
- "O que te diferencia dos concorrentes?"
- Para as 3 palavras, dê exemplos: "Por exemplo: 'Inovação, Confiança, Acolhimento'"
- Escalas: faça UMA de cada vez, pergunte: "De 1 a 5, sua marca é mais sofisticada (5) ou descontraída (1)?"

### Seção 6 (Concorrentes):
- "Quem são seus principais concorrentes?"
- "Que marcas você admira (mesmo de outros setores)?"
- "O que você gosta nessas marcas?"

### Seção 7 (Preferências Visuais):
- "Que cores você gosta e quer explorar na sua marca?"
- "Tem alguma cor que definitivamente NÃO quer?"
- "Que estilo de logo você prefere?" (dê exemplos: minimalista, com símbolo, só letras)
- "Tem alguma fonte/tipografia que goste? Pode mandar links de referência"

### Seção 8 (Final):
- "Tem mais alguma informação que acha importante compartilhar?"
- "Algo que esquecemos de perguntar?"
- **IMPORTANTE**: Quando chegar nesta seção e coletar as informações finais, informe o cliente:
  "✨ Ótimo! Seu briefing está praticamente completo. 
  
  Por favor, clique no botão 'PREVIEW' no lado direito da tela para revisar todas as informações que você forneceu. Lá você poderá editar qualquer campo se necessário.
  
  Se estiver tudo correto, é só clicar em 'Finalizar e Enviar' e você receberá uma confirmação por email! 📧"

## Regras críticas:
- NUNCA avance para próxima seção sem coletar as informações mínimas da atual
- SEMPRE valide informações-chave antes de registrar
- Quando o cliente parecer perdido, ofereça exemplos
- Se não souber algo sobre design, não invente — foque em coletar informações do cliente

## IMPORTANTE - Formato de extração de dados:
Quando o cliente fornecer informações importantes (nome, email, telefone, descrições, preferências, etc), você DEVE incluir um marcador INVISÍVEL (que não aparece para o usuário) para registrar os dados.

FORMATO: Coloque em uma linha separada no FINAL, precedido por três quebras de linha:



DATA_COLLECTED:{{"campo": "valor", "outro_campo": "outro_valor"}}

Exemplo de campos por seção:
- Seção contato: client_name, client_email, client_phone, city_state, website
- Seção basicas: project_type, deadline
- Seção entrega: deliverables (array com strings), extra_items
- Seção perfil: company_description, products_services, mission_vision_values, diferencial, objectives
- Seção posicionamento: positioning, differentiation, why_choose, keywords, personality_scales (objeto)
- Seção concorrentes: competitors, references, what_you_like
- Seção visuais: preferred_colors, excluded_colors, logo_types, font_preferences, visual_references
- Seção final: additional_info

CRÍTICO: O marcador DATA_COLLECTED deve estar APÓS sua mensagem amigável ao cliente, em linhas separadas, para não aparecer na interface!

**SEMPRE inclua o DATA_COLLECTED quando coletar qualquer informação nova do cliente!**

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
        
        # Tentar providers em ordem (Groq primeiro, depois Hugging Face)
        raw_response = None
        provider_used = None
        last_error = None
        
        # 1. Tentar Groq primeiro (mais rápido)
        try:
            groq_client = _get_groq_client()
            if groq_client:
                logger.info("🚀 Tentando Groq...")
                raw_response = await _generate_groq(groq_client, messages)
                provider_used = "groq"
                logger.info("✅ Resposta gerada com Groq")
        except Exception as e:
            last_error = e
            logger.warning(f"⚠️ Groq falhou: {e}")
        
        # 2. Se Groq falhar, tentar Hugging Face
        if raw_response is None:
            try:
                hf_client = _get_huggingface_client()
                if hf_client:
                    logger.info("🚀 Tentando Hugging Face (fallback)...")
                    raw_response = await _generate_huggingface(hf_client, messages)
                    provider_used = "huggingface"
                    logger.info("✅ Resposta gerada com Hugging Face")
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Hugging Face falhou: {e}")
        
        # Se todos falharam, retornar erro
        if raw_response is None:
            logger.error(f"❌ Todos os providers falharam. Último erro: {last_error}")
            return (
                "Desculpe, estou com dificuldades técnicas no momento. 😅 "
                "Por favor, tente novamente em alguns segundos ou envie email para brandhousesilver@gmail.com",
                None,
                None
            )
        
        # Extrair dados estruturados da resposta (se houver)
        extracted_data = _extract_structured_data(raw_response, current_section)
        
        # Remover DATA_COLLECTED da resposta visível ao usuário
        if "DATA_COLLECTED:" in raw_response:
            response = raw_response.split("DATA_COLLECTED:")[0].strip()
        else:
            response = raw_response
        
        # Detectar se deve mostrar opções interativas
        interactive_options = _detect_interactive_options(current_section, response)
        
        return response, extracted_data, interactive_options
        
    except Exception as e:
        logger.error(f"Erro crítico ao gerar resposta IA: {e}")
        return (
            "Desculpe, tive um problema técnico. 😅 "
            "Pode repetir sua mensagem ou enviar email para brandhousesilver@gmail.com",
            None,
            None
        )


async def _generate_groq(client, messages: list[dict]) -> str:
    """Gera resposta usando Groq (Llama 3.3 70B)."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )
    return response.choices[0].message.content


async def _generate_huggingface(client, messages: list[dict]) -> str:
    """
    Gera resposta usando Hugging Face Inference API.
    Usa modelo Llama 3.1 8B (gratuito, boa qualidade).
    """
    # Hugging Face Inference API usa formato de chat
    # Converter system prompt para primeira mensagem do user
    formatted_messages = []
    system_content = ""
    
    for msg in messages:
        if msg["role"] == "system":
            system_content = msg["content"]
        elif msg["role"] == "user":
            if system_content and len(formatted_messages) == 0:
                # Primeira mensagem: incluir contexto do sistema
                formatted_messages.append({
                    "role": "user",
                    "content": f"{system_content}\n\nMensagem do cliente: {msg['content']}"
                })
                system_content = ""  # Já incluído
            else:
                formatted_messages.append(msg)
        elif msg["role"] == "assistant":
            formatted_messages.append(msg)
    
    # Usar modelo Llama 3.1 8B (gratuito e bom para conversação)
    response = client.chat_completion(
        messages=formatted_messages,
        model="meta-llama/Llama-3.1-8B-Instruct",
        max_tokens=1024,
        temperature=0.7,
    )
    
    return response.choices[0].message.content


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
        "entrega": lambda d: True,  # Sempre pode avançar (lista padrão existe)
        "perfil": lambda d: d.get("company_description"),  # Descrição da empresa
        "posicionamento": lambda d: d.get("positioning"),  # Como quer ser percebida
        "concorrentes": lambda d: d.get("competitors") or d.get("references"),  # Concorrentes OU referências
        "visuais": lambda d: d.get("preferred_colors"),  # Cores preferidas
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
    
    # Seção Entrega (10%)
    if briefing_data.get("deliverables") or briefing_data.get("extra_items"):
        progress += section_weights["entrega"]
    
    # Seção Perfil (20%)
    perfil_fields = ["company_description", "products_services", "mission_vision_values", "diferencial"]
    perfil_filled = sum(1 for f in perfil_fields if briefing_data.get(f))
    progress += (perfil_filled / len(perfil_fields)) * section_weights["perfil"]
    
    # Seção Posicionamento (20%)
    posicionamento_fields = ["positioning", "differentiation", "keywords"]
    posicionamento_filled = sum(1 for f in posicionamento_fields if briefing_data.get(f))
    if briefing_data.get("personality_scales"):
        posicionamento_filled += 1
        posicionamento_fields.append("personality_scales")
    progress += (posicionamento_filled / len(posicionamento_fields)) * section_weights["posicionamento"]
    
    # Seção Concorrentes (10%)
    concorrentes_fields = ["competitors", "references"]
    concorrentes_filled = sum(1 for f in concorrentes_fields if briefing_data.get(f))
    progress += (concorrentes_filled / len(concorrentes_fields)) * section_weights["concorrentes"]
    
    # Seção Visuais (15%)
    visuais_fields = ["preferred_colors", "excluded_colors", "logo_types"]
    visuais_filled = sum(1 for f in visuais_fields if briefing_data.get(f))
    progress += (visuais_filled / len(visuais_fields)) * section_weights["visuais"]
    
    return int(min(progress, 100))


def _detect_interactive_options(current_section: str, response: str) -> Optional[list[dict]]:
    """Detecta se deve mostrar opções interativas (checkboxes) baseado na seção e conteúdo."""
    
    response_lower = response.lower()
    
    # Só mostrar checkboxes na seção de entrega
    if current_section != "entrega":
        return None
    
    # NÃO mostrar checkboxes se for uma resposta de confirmação/agradecimento
    if any(word in response_lower for word in ['entendi', 'ótimo', 'perfeito', 'maravilha', 'obrigad']):
        return None
    
    # Detectar lista de entrega - quando pergunta sobre itens extras
    if any(phrase in response_lower for phrase in ['além desses', 'algo mais', 'precisa de algo', 'itens extras', 'algum item adicional']):
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
    
    return None
