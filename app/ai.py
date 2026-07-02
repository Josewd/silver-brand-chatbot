from typing import Optional
import logging
from datetime import datetime

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Inicializar cliente IA globalmente (como no projeto pão de queijo)
_ai_client = None
_ai_provider = None

def _init_ai_client():
    """Inicializa o cliente de IA uma única vez."""
    global _ai_client, _ai_provider
    
    if _ai_client is not None:
        return _ai_client, _ai_provider
    
    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        _ai_client = genai.GenerativeModel("gemini-2.0-flash")
        _ai_provider = "gemini"
        logger.info("Cliente Gemini inicializado")
        return _ai_client, _ai_provider
    
    elif settings.ai_provider == "groq" and settings.groq_api_key:
        from groq import Groq
        # Criar cliente simples, igual ao pão de queijo
        _ai_client = Groq(api_key=settings.groq_api_key)
        _ai_provider = "groq"
        logger.info("Cliente Groq inicializado")
        return _ai_client, _ai_provider
    
    raise ValueError("Nenhum provedor de IA configurado. Configure GEMINI_API_KEY ou GROQ_API_KEY")


def _get_ai_client():
    """Retorna o cliente de IA configurado."""
    return _init_ai_client()


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
- Quando auxiliar em descrições/slogans, SEMPRE peça contexto primeiro: "Me conte mais sobre...", "Qual sentimento quer transmitir?"
- Não invente informações sobre o cliente
- NÃO mencione progresso percentual ou número de seções nas mensagens (isso é mostrado na interface)
- Valide respostas importantes: "Deixa eu confirmar: você disse que... está correto?"
- Seja empático: "Entendo que pode ser difícil descrever isso. Vamos juntos..."

## Estratégias por seção:

### Seção 1 (Detalhes de Contato):
- Pergunte de forma casual mas organize as informações
- "Qual seu nome completo?", "Melhor email para contato?", etc.

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

## Regras críticas:
- NUNCA avance para próxima seção sem coletar as informações mínimas da atual
- SEMPRE valide informações-chave antes de registrar
- Quando o cliente parecer perdido, ofereça exemplos
- Se não souber algo sobre design, não invente — foque em coletar informações do cliente

## IMPORTANTE - Formato de extração de dados:
Quando o cliente fornecer informações importantes (nome, email, telefone, descrições, preferências, etc), você DEVE incluir no FINAL da sua resposta (após a mensagem ao cliente) um marcador especial para registrar os dados:

DATA_COLLECTED:{{"campo": "valor", "outro_campo": "outro_valor"}}

Exemplo de campos por seção:
- Seção contato: client_name, client_email, client_phone, city_state, website
- Seção basicas: project_type, deadline
- Seção entrega: deliverables (array), extra_items
- Seção perfil: company_description, products_services, mission_vision_values, diferencial, objectives
- Seção posicionamento: positioning, differentiation, why_choose, keywords, personality_scales (objeto com escalas 1-5)
- Seção concorrentes: competitors, references, what_you_like
- Seção visuais: preferred_colors, excluded_colors, logo_types, font_preferences, visual_references
- Seção final: additional_info

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
    
    Returns:
        (resposta_texto, dados_extraidos_ou_None, opcoes_interativas_ou_None)
    """
    try:
        client, provider = _get_ai_client()
        current_section = session_data.get("current_section", "intro")
        
        system_prompt = _build_system_prompt(session_data, current_section)
        
        # Construir mensagens
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})
        
        # Gerar resposta
        if provider == "gemini":
            response = await _generate_gemini(client, messages)
        else:  # groq
            response = await _generate_groq(client, messages)
        
        # Extrair dados estruturados da resposta (se houver)
        extracted_data = _extract_structured_data(response, current_section)
        
        # Detectar se deve mostrar opções interativas
        interactive_options = _detect_interactive_options(current_section, response)
        
        return response, extracted_data, interactive_options
        
    except Exception as e:
        logger.error(f"Erro ao gerar resposta IA: {e}")
        return (
            "Desculpe, tive um problema técnico. 😅 "
            "Pode repetir sua mensagem ou enviar email para brandhousesilver@gmail.com",
            None,
            None
        )


async def _generate_gemini(model, messages: list[dict]) -> str:
    """Gera resposta usando Gemini."""
    # Gemini não usa role "system", então concatenamos no primeiro user message
    system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_messages = [m for m in messages if m["role"] == "user"]
    assistant_messages = [m for m in messages if m["role"] == "assistant"]
    
    # Reconstruir conversa no formato Gemini
    chat_messages = []
    for i, user_msg in enumerate(user_messages):
        if i == 0 and system_msg:
            # Primeira mensagem inclui contexto do sistema
            chat_messages.append({
                "role": "user",
                "parts": [f"{system_msg}\n\nMensagem do cliente: {user_msg['content']}"]
            })
        else:
            chat_messages.append({"role": "user", "parts": [user_msg["content"]]})
        
        if i < len(assistant_messages):
            chat_messages.append({
                "role": "model",
                "parts": [assistant_messages[i]["content"]]
            })
    
    chat = model.start_chat(history=chat_messages[:-1])
    response = chat.send_message(chat_messages[-1]["parts"][0])
    return response.text


async def _generate_groq(client, messages: list[dict]) -> str:
    """Gera resposta usando Groq."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
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
    """Sugere próxima seção baseado no progresso."""
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
    
    try:
        current_idx = sections_order.index(current_section)
        if current_idx < len(sections_order) - 1:
            return sections_order[current_idx + 1]
    except ValueError:
        pass
    
    return current_section


def calculate_progress(briefing_data: dict) -> int:
    """Calcula percentual de conclusão do briefing (0-100)."""
    required_fields = [
        "client_name", "client_email", "client_phone",
        "project_type", "deadline",
        "company_description", "products_services", "diferencial",
        "positioning", "keywords",
        "personality_scales",
        "competitors", "references",
        "preferred_colors", "logo_types"
    ]
    
    filled = sum(1 for field in required_fields if briefing_data.get(field))
    return int((filled / len(required_fields)) * 100)


def _detect_interactive_options(current_section: str, response: str) -> Optional[list[dict]]:
    """Detecta se deve mostrar opções interativas (checkboxes) baseado na seção e conteúdo."""
    
    response_lower = response.lower()
    
    # NÃO mostrar checkboxes se for uma resposta de confirmação/agradecimento
    if any(word in response_lower for word in ['entendi', 'ótimo', 'perfeito', 'maravilha', 'obrigad', 'vamos', 'agora vamos']):
        return None
    
    # Detectar lista de entrega - quando menciona itens incluídos E pergunta sobre extras
    # Deve ter TODOS esses elementos para ser a pergunta inicial:
    if (("logo principal" in response_lower or "já inclui" in response_lower or "todo projeto" in response_lower) and 
        ("além desses" in response_lower or "algo mais" in response_lower or "precisa de algo" in response_lower) and
        ("powerpoint" in response_lower or "cartão" in response_lower or "template" in response_lower)):
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
