from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from typing import Dict

# Criar diretório para PDFs
os.makedirs("generated_pdfs", exist_ok=True)


def generate_briefing_pdf(session_id: str, client_name: str, briefing_data: Dict) -> str:
    """
    Gera PDF do briefing preenchido.
    
    Args:
        session_id: ID da sessão
        client_name: Nome do cliente
        briefing_data: Dados coletados do briefing
        
    Returns:
        Caminho do arquivo PDF gerado
    """
    pdf_path = f"generated_pdfs/{session_id}.pdf"
    
    # Criar documento
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    field_label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666'),
        spaceAfter=4,
        fontName='Helvetica-Bold'
    )
    
    field_value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=12,
        fontName='Helvetica'
    )
    
    # Construir conteúdo
    story = []
    
    # Cabeçalho
    story.append(Paragraph("SILVER BRAND HOUSE", title_style))
    story.append(Paragraph("BRIEFING DE IDENTIDADE VISUAL", section_style))
    story.append(Spacer(1, 10*mm))
    
    # Cliente
    story.append(Paragraph(f"<b>Cliente:</b> {client_name}", field_value_style))
    story.append(Spacer(1, 5*mm))
    
    # === SEÇÃO 1: DETALHES DE CONTATO ===
    story.append(Paragraph("1. DETALHES DE CONTATO", section_style))
    
    _add_field(story, "Nome completo", briefing_data.get("client_name", ""), field_label_style, field_value_style)
    _add_field(story, "E-mail", briefing_data.get("client_email", ""), field_label_style, field_value_style)
    _add_field(story, "Telefone", briefing_data.get("client_phone", ""), field_label_style, field_value_style)
    _add_field(story, "Cidade/Estado", briefing_data.get("city_state", ""), field_label_style, field_value_style)
    _add_field(story, "Website/Instagram", briefing_data.get("website", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 2: INFORMAÇÕES BÁSICAS ===
    story.append(Paragraph("2. INFORMAÇÕES BÁSICAS", section_style))
    
    _add_field(story, "Tipo de projeto", briefing_data.get("project_type", ""), field_label_style, field_value_style)
    _add_field(story, "Prazo desejado", briefing_data.get("deadline", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 3: LISTA DE ENTREGA ===
    story.append(Paragraph("3. LISTA DE ENTREGA", section_style))
    
    items = briefing_data.get("deliverables", [])
    if items:
        if isinstance(items, list):
            items_text = "<br/>".join([f"• {item}" for item in items])
        else:
            items_text = str(items)
        story.append(Paragraph(items_text, field_value_style))
    
    _add_field(story, "Informações extras", briefing_data.get("extra_items", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 4: PERFIL DA EMPRESA ===
    story.append(Paragraph("4. PERFIL DA EMPRESA", section_style))
    
    _add_field(story, "Sobre a empresa", briefing_data.get("company_description", ""), field_label_style, field_value_style)
    _add_field(story, "Produtos/Serviços", briefing_data.get("products_services", ""), field_label_style, field_value_style)
    _add_field(story, "Missão/Visão/Valores", briefing_data.get("mission_vision_values", ""), field_label_style, field_value_style)
    _add_field(story, "Principal diferencial", briefing_data.get("diferencial", ""), field_label_style, field_value_style)
    _add_field(story, "Objetivos principais", briefing_data.get("objectives", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 5: POSICIONAMENTO & PERSONALIDADE ===
    story.append(Paragraph("5. POSICIONAMENTO & PERSONALIDADE", section_style))
    
    _add_field(story, "Como quer ser percebida", briefing_data.get("positioning", ""), field_label_style, field_value_style)
    _add_field(story, "O que diferencia da concorrência", briefing_data.get("differentiation", ""), field_label_style, field_value_style)
    _add_field(story, "Por que escolher você", briefing_data.get("why_choose", ""), field_label_style, field_value_style)
    _add_field(story, "3 palavras que definem a marca", briefing_data.get("keywords", ""), field_label_style, field_value_style)
    
    # Escalas de personalidade
    scales = briefing_data.get("personality_scales", {})
    if scales:
        story.append(Paragraph("<b>Escalas de Personalidade (1-5):</b>", field_label_style))
        for scale_name, value in scales.items():
            story.append(Paragraph(f"• {scale_name}: {value}", field_value_style))
        story.append(Spacer(1, 3*mm))
    
    # === SEÇÃO 6: CONCORRENTES E REFERÊNCIAS ===
    story.append(Paragraph("6. CONCORRENTES E REFERÊNCIAS", section_style))
    
    _add_field(story, "Concorrentes", briefing_data.get("competitors", ""), field_label_style, field_value_style)
    _add_field(story, "Marcas que admira", briefing_data.get("references", ""), field_label_style, field_value_style)
    _add_field(story, "O que gosta nessas marcas", briefing_data.get("what_you_like", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 7: PREFERÊNCIAS VISUAIS ===
    story.append(Paragraph("7. PREFERÊNCIAS VISUAIS", section_style))
    
    _add_field(story, "Cores que GOSTA", briefing_data.get("preferred_colors", ""), field_label_style, field_value_style)
    _add_field(story, "Cores que NÃO quer", briefing_data.get("excluded_colors", ""), field_label_style, field_value_style)
    _add_field(story, "Tipos de logo preferidos", briefing_data.get("logo_types", ""), field_label_style, field_value_style)
    _add_field(story, "Tipos de fontes", briefing_data.get("font_preferences", ""), field_label_style, field_value_style)
    _add_field(story, "Referências visuais (links)", briefing_data.get("visual_references", ""), field_label_style, field_value_style)
    
    # === SEÇÃO 8: INFORMAÇÕES FINAIS ===
    story.append(Paragraph("8. INFORMAÇÕES FINAIS", section_style))
    
    _add_field(story, "Observações adicionais", briefing_data.get("additional_info", ""), field_label_style, field_value_style)
    
    # Rodapé
    story.append(Spacer(1, 15*mm))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER
    )
    story.append(Paragraph(
        "SILVER BRAND HOUSE<br/>brandhousesilver@gmail.com | +55 11 96015 7100",
        footer_style
    ))
    
    # Gerar PDF
    doc.build(story)
    
    return pdf_path


def _add_field(story, label: str, value: str, label_style, value_style):
    """Adiciona campo label + valor ao PDF."""
    if value:
        story.append(Paragraph(f"<b>{label}:</b>", label_style))
        # Escapar caracteres especiais para XML
        safe_value = str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(safe_value, value_style))
    else:
        story.append(Paragraph(f"<b>{label}:</b> <i>(não preenchido)</i>", label_style))
        story.append(Spacer(1, 3*mm))
