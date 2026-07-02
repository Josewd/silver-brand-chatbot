"""
Sistema de Formulário Estruturado para Briefing.
Mantém estado completo do briefing independente da extração da IA.
"""

from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def create_empty_form() -> Dict[str, Any]:
    """Cria estrutura vazia do formulário de briefing."""
    return {
        "contato": {
            "client_name": "",
            "client_email": "",
            "client_phone": "",
            "city_state": "",
            "website": ""
        },
        "basicas": {
            "project_type": "",
            "deadline": ""
        },
        "entrega": {
            "deliverables_confirmed": "",
            "extra_items": ""
        },
        "perfil": {
            "about_company": "",
            "products_services": "",
            "diferencial": "",
            "mission_vision_values": "",
            "main_objectives": ""
        },
        "posicionamento": {
            "positioning": "",
            "keywords": "",
            "differentiation": "",
            "personality_scales": {}
        },
        "concorrentes": {
            "competitors": "",
            "references": "",
            "what_you_like": ""
        },
        "visuais": {
            "preferred_colors": "",
            "excluded_colors": "",
            "logo_types": "",
            "font_preferences": "",
            "visual_references": ""
        },
        "final": {
            "additional_info": ""
        }
    }


def flatten_form(form: Dict[str, Any]) -> Dict[str, Any]:
    """Converte formulário estruturado para formato flat (compatível com sistema atual)."""
    flat = {}
    for section, fields in form.items():
        if isinstance(fields, dict):
            flat.update(fields)
    return flat


def update_form_from_flat(form: Dict[str, Any], flat_data: Dict[str, Any]) -> Dict[str, Any]:
    """Atualiza formulário estruturado com dados flat."""
    updated_form = form.copy()
    
    # Mapear campos para seções
    field_to_section = {}
    for section, fields in form.items():
        if isinstance(fields, dict):
            for field in fields.keys():
                field_to_section[field] = section
    
    # Atualizar campos
    for field, value in flat_data.items():
        if field in field_to_section:
            section = field_to_section[field]
            if section not in updated_form:
                updated_form[section] = {}
            updated_form[section][field] = value
    
    return updated_form


def infer_data_from_message(
    user_message: str,
    current_section: str,
    current_form: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Fallback: Tenta inferir dados da mensagem do usuário quando IA não gera DATA_COLLECTED.
    
    Args:
        user_message: Mensagem do usuário
        current_section: Seção atual do briefing
        current_form: Estado atual do formulário
        
    Returns:
        Dict com dados inferidos ou None
    """
    user_message_lower = user_message.lower().strip()
    
    # Se mensagem muito curta, não inferir
    if len(user_message) < 3:
        return None
    
    # Mapear seção para campos principais
    section_fields_map = {
        "intro": ["client_name"],
        "contato": ["client_email", "client_phone", "city_state", "website"],
        "basicas": ["project_type", "deadline"],
        "entrega": ["deliverables_confirmed", "extra_items"],
        "perfil": ["about_company", "products_services", "diferencial", 
                   "mission_vision_values", "main_objectives"],
        "posicionamento": ["positioning", "keywords", "differentiation"],
        "concorrentes": ["competitors", "references", "what_you_like"],
        "visuais": ["preferred_colors", "excluded_colors", "logo_types", "font_preferences"],
        "final": ["additional_info"]
    }
    
    # Detectar campos vazios na seção atual
    empty_fields = []
    if current_section in section_fields_map:
        for field in section_fields_map[current_section]:
            # Procurar campo na estrutura do form
            for section_data in current_form.values():
                if isinstance(section_data, dict) and field in section_data:
                    if not section_data[field]:
                        empty_fields.append(field)
                        break
    
    # Se não há campos vazios, não inferir
    if not empty_fields:
        return None
    
    # Inferir valor para o primeiro campo vazio
    first_empty_field = empty_fields[0]
    
    # Detectar confirmações simples
    if user_message_lower in ["sim", "não", "nao", "yes", "no", "ok"]:
        # Se é confirmação, usar como está
        return {first_empty_field: user_message}
    
    # Para outros casos, salvar a mensagem completa
    logger.info(f"🔍 Inferindo dados: {first_empty_field} = {user_message[:50]}...")
    return {first_empty_field: user_message}


def get_form_summary(form: Dict[str, Any]) -> str:
    """
    Gera resumo do formulário para incluir no prompt da IA.
    Mostra apenas campos preenchidos de forma concisa.
    """
    summary_lines = []
    
    for section, fields in form.items():
        if isinstance(fields, dict):
            filled_fields = {k: v for k, v in fields.items() if v}
            if filled_fields:
                summary_lines.append(f"{section.upper()}: {len(filled_fields)}/{len(fields)} campos")
                for field, value in filled_fields.items():
                    # Truncar valores longos
                    display_value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                    summary_lines.append(f"  - {field}: {display_value}")
    
    return "\n".join(summary_lines) if summary_lines else "Formulário vazio"
