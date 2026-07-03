"""
Interfaces e estruturas de dados para comunicação entre IA e Frontend.
Este arquivo define o "source of truth" para padronizar as respostas.
"""

from typing import Optional, List, Dict, Any, Literal
from enum import Enum


class SectionId(str, Enum):
    """Seções do briefing (ordem de progressão)."""
    INTRO = "intro"
    CONTATO = "contato"
    BASICAS = "basicas" 
    ENTREGA = "entrega"
    PERFIL = "perfil"
    POSICIONAMENTO = "posicionamento"
    CONCORRENTES = "concorrentes"
    VISUAIS = "visuais"
    FINAL = "final"
    COMPLETED = "completed"


class InteractiveOptionType(str, Enum):
    """Tipos de opções interativas que podem ser apresentadas."""
    CHECKBOX = "checkbox"
    SCALE = "scale"
    RADIO = "radio"


class InteractiveOption:
    """Opção interativa (checkbox, scale, etc)."""
    def __init__(self, type: str, label: str, value: str, 
                 min_label: Optional[str] = None, max_label: Optional[str] = None,
                 min: Optional[int] = None, max: Optional[int] = None):
        self.type = type
        self.label = label
        self.value = value
        self.min_label = min_label
        self.max_label = max_label
        self.min = min
        self.max = max
    
    def model_dump(self) -> Dict[str, Any]:
        """Compatibilidade com pydantic."""
        result = {
            "type": self.type,
            "label": self.label, 
            "value": self.value
        }
        if self.min_label is not None:
            result["min_label"] = self.min_label
        if self.max_label is not None:
            result["max_label"] = self.max_label
        if self.min is not None:
            result["min"] = self.min
        if self.max is not None:
            result["max"] = self.max
        return result


class SectionInfo:
    """Informações sobre a seção atual do briefing."""
    def __init__(self, current_section: SectionId, section_name: str, 
                 completion_percentage: int, required_fields: List[str],
                 completed_fields: List[str], next_action: Optional[str] = None):
        self.current_section = current_section
        self.section_name = section_name
        self.completion_percentage = completion_percentage
        self.required_fields = required_fields
        self.completed_fields = completed_fields
        self.next_action = next_action


class AIContext:
    """Contexto estruturado que a IA deve incluir nas respostas."""
    def __init__(self, section_info: SectionInfo, overall_progress: int,
                 extracted_data: Optional[Dict[str, Any]] = None,
                 interactive_options: Optional[List[Dict[str, Any]]] = None,
                 should_show_preview: bool = False,
                 should_advance_section: bool = False,
                 status_message: Optional[str] = None,
                 internal_notes: Optional[str] = None):
        self.section_info = section_info
        self.overall_progress = overall_progress
        self.extracted_data = extracted_data
        self.interactive_options = interactive_options
        self.should_show_preview = should_show_preview
        self.should_advance_section = should_advance_section
        self.status_message = status_message
        self.internal_notes = internal_notes


class AIResponse:
    """Resposta estruturada da IA - 'source of truth' da comunicação."""
    def __init__(self, message: str, context: AIContext, timestamp: str,
                 provider_used: Optional[str] = None):
        self.message = message
        self.context = context
        self.timestamp = timestamp
        self.provider_used = provider_used
    

# Mapeamento de seções para informações estruturadas
SECTION_CONFIG = {
    SectionId.INTRO: {
        "name": "Introdução", 
        "required_fields": ["client_name"],
        "weight": 5  # % do progresso total
    },
    SectionId.CONTATO: {
        "name": "Detalhes de Contato",
        "required_fields": ["client_name", "client_email"],
        "optional_fields": ["client_phone", "city_state", "website"],
        "weight": 15
    },
    SectionId.BASICAS: {
        "name": "Informações Básicas",
        "required_fields": ["project_type"],
        "optional_fields": ["deadline"],
        "weight": 10
    },
    SectionId.ENTREGA: {
        "name": "Lista de Entrega", 
        "required_fields": ["deliverables_confirmed"],
        "optional_fields": ["extra_items"],
        "weight": 10
    },
    SectionId.PERFIL: {
        "name": "Perfil da Empresa",
        "required_fields": ["about_company", "products_services"],
        "optional_fields": ["diferencial", "mission_vision_values", "main_objectives"],
        "weight": 25
    },
    SectionId.POSICIONAMENTO: {
        "name": "Posicionamento & Personalidade",
        "required_fields": ["positioning", "keywords"],
        "optional_fields": ["differentiation", "personality_scales"],
        "weight": 20
    },
    SectionId.CONCORRENTES: {
        "name": "Concorrentes e Referências",
        "required_fields": ["competitors"],
        "optional_fields": ["references", "what_you_like"],
        "weight": 10
    },
    SectionId.VISUAIS: {
        "name": "Preferências Visuais",
        "required_fields": ["preferred_colors"],
        "optional_fields": ["excluded_colors", "logo_types", "font_preferences"],
        "weight": 15
    },
    SectionId.FINAL: {
        "name": "Informações Finais",
        "required_fields": [],
        "optional_fields": ["additional_info"],
        "weight": 5
    }
}


# Opções interativas pré-definidas
DELIVERY_OPTIONS = [
    InteractiveOption(
        type="checkbox",
        label="Template PowerPoint",
        value="template_ppt"
    ),
    InteractiveOption(
        type="checkbox",
        label="Cartão de Visitas", 
        value="cartao_visitas"
    ),
    InteractiveOption(
        type="checkbox",
        label="Capas para Destaques do Instagram",
        value="capas_instagram"
    ),
    InteractiveOption(
        type="checkbox",
        label="Artes para Impressão",
        value="artes_impressao"
    ),
    InteractiveOption(
        type="checkbox",
        label="Não preciso de itens extras",
        value="none"
    )
]

PERSONALITY_SCALES = [
    InteractiveOption(
        type="scale",
        label="Sofisticada vs Descontraída",
        value="scale_sophisticated",
        min_label="Descontraída",
        max_label="Sofisticada",
        min=1,
        max=5
    ),
    InteractiveOption(
        type="scale",
        label="Técnica vs Emocional",
        value="scale_technical",
        min_label="Emocional", 
        max_label="Técnica",
        min=1,
        max=5
    ),
    InteractiveOption(
        type="scale",
        label="Formal vs Informal",
        value="scale_formal",
        min_label="Informal",
        max_label="Formal", 
        min=1,
        max=5
    ),
    InteractiveOption(
        type="scale",
        label="Tradicional vs Moderna",
        value="scale_traditional",
        min_label="Moderna",
        max_label="Tradicional",
        min=1,
        max=5
    ),
    InteractiveOption(
        type="scale",
        label="Exclusiva vs Popular",
        value="scale_exclusive",
        min_label="Popular",
        max_label="Exclusiva",
        min=1,
        max=5
    )
]

LOGO_TYPE_OPTIONS = [
    InteractiveOption(
        type="checkbox",
        label="Com símbolo",
        value="logo_symbol"
    ),
    InteractiveOption(
        type="checkbox",
        label="Só a tipografia",
        value="logo_typography"
    ),
    InteractiveOption(
        type="checkbox",
        label="Minimalista",
        value="logo_minimalist"
    ),
    InteractiveOption(
        type="checkbox",
        label="Clássico", 
        value="logo_classic"
    ),
    InteractiveOption(
        type="checkbox",
        label="Moderno",
        value="logo_modern"
    )
]


def get_section_order() -> List[SectionId]:
    """Retorna a ordem das seções do briefing."""
    return [
        SectionId.INTRO,
        SectionId.CONTATO, 
        SectionId.BASICAS,
        SectionId.ENTREGA,
        SectionId.PERFIL,
        SectionId.POSICIONAMENTO,
        SectionId.CONCORRENTES,
        SectionId.VISUAIS,
        SectionId.FINAL
    ]


def calculate_section_progress(section: SectionId, briefing_data: Dict[str, Any]) -> int:
    """Calcula progresso (0-100) de uma seção específica."""
    if section not in SECTION_CONFIG:
        return 0
        
    config = SECTION_CONFIG[section]
    required_fields = config.get("required_fields", [])
    optional_fields = config.get("optional_fields", [])
    
    if not required_fields and not optional_fields:
        return 100  # Seção sem campos obrigatórios
        
    # Campos obrigatórios têm peso 70%, opcionais 30%
    required_filled = sum(1 for field in required_fields if briefing_data.get(field))
    optional_filled = sum(1 for field in optional_fields if briefing_data.get(field))
    
    required_score = 0
    if required_fields:
        required_score = (required_filled / len(required_fields)) * 70
        
    optional_score = 0 
    if optional_fields:
        optional_score = (optional_filled / len(optional_fields)) * 30
        
    return int(required_score + optional_score)


def calculate_overall_progress(briefing_data: Dict[str, Any]) -> int:
    """Calcula progresso geral (0-100) baseado em todas as seções."""
    total_progress = 0
    total_weight = 0
    
    for section_id, config in SECTION_CONFIG.items():
        if section_id == SectionId.INTRO:
            continue  # Skip intro
            
        section_progress = calculate_section_progress(section_id, briefing_data)
        section_weight = config["weight"]
        
        total_progress += (section_progress * section_weight) / 100
        total_weight += section_weight
        
    return int(total_progress / total_weight * 100) if total_weight > 0 else 0


def suggest_next_section(current_section: SectionId, briefing_data: Dict[str, Any]) -> SectionId:
    """Sugere próxima seção baseado no progresso atual."""
    sections = get_section_order()
    
    try:
        current_idx = sections.index(current_section)
    except ValueError:
        return SectionId.CONTATO  # Default
        
    # Verificar se seção atual tem requisitos mínimos atendidos
    if current_section in SECTION_CONFIG:
        config = SECTION_CONFIG[current_section]
        required_fields = config.get("required_fields", [])
        
        # Se não tem todos campos obrigatórios, não avançar
        if required_fields and not all(briefing_data.get(field) for field in required_fields):
            return current_section
            
    # Avançar para próxima seção
    if current_idx < len(sections) - 1:
        return sections[current_idx + 1]
    else:
        return SectionId.COMPLETED


def detect_interactive_trigger(section: SectionId, message_content: str) -> Optional[List[InteractiveOption]]:
    """Detecta se deve mostrar opções interativas baseado na seção e conteúdo."""
    message_lower = message_content.lower()
    
    # Seção ENTREGA: detectar quando lista itens inclusos
    if section == SectionId.ENTREGA:
        triggers = [
            'o projeto inclui', 'itens inclusos', 'além desses',
            'selecionar extras', 'extras abaixo', 'logotipo principal'
        ]
        if any(trigger in message_lower for trigger in triggers):
            return DELIVERY_OPTIONS
            
    # Seção POSICIONAMENTO: detectar escalas de personalidade  
    elif section == SectionId.POSICIONAMENTO:
        triggers = [
            'personalidade da marca', 'marque de 1 a 5', 'características',
            'definir a personalidade', 'escala de'
        ]
        if any(trigger in message_lower for trigger in triggers):
            return PERSONALITY_SCALES
            
    # Seção VISUAIS: detectar tipos de logo
    elif section == SectionId.VISUAIS:
        triggers = [
            'tipos de logo', 'tipo de logo', 'estilo de logo',
            'logo prefere', 'que logo você gosta'
        ]
        if any(trigger in message_lower for trigger in triggers):
            return LOGO_TYPE_OPTIONS
            
    return None


def build_section_info(current_section: SectionId, briefing_data: Dict[str, Any]) -> SectionInfo:
    """Constrói informações estruturadas da seção atual."""
    if current_section not in SECTION_CONFIG:
        # Fallback para seção desconhecida
        return SectionInfo(
            current_section=current_section,
            section_name=current_section.value.title(),
            completion_percentage=0,
            required_fields=[],
            completed_fields=[]
        )
        
    config = SECTION_CONFIG[current_section]
    required_fields = config.get("required_fields", [])
    optional_fields = config.get("optional_fields", [])
    all_fields = required_fields + optional_fields
    
    completed_fields = [field for field in all_fields if briefing_data.get(field)]
    completion_percentage = calculate_section_progress(current_section, briefing_data)
    
    return SectionInfo(
        current_section=current_section,
        section_name=config["name"],
        completion_percentage=completion_percentage,
        required_fields=required_fields,
        completed_fields=completed_fields
    )