from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import logging
import uuid
import secrets
from typing import Optional

from app.config import get_settings
from app.models import init_db, get_db, Session as DBSession, Message
from app.ai import generate_response
from app.interfaces import SectionId, calculate_overall_progress, suggest_next_section
from app.pdf_generator import generate_briefing_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa banco de dados."""
    init_db()
    logger.info("Banco de dados inicializado")
    yield


app = FastAPI(
    title="Silver Brand Design - Chatbot",
    description="Sistema de chatbot inteligente para coleta de briefing de identidade visual",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url, 
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://localhost:3000",
        "https://silver-brand-chatbot.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === MODELS ===

class CreateSessionRequest(BaseModel):
    client_name: str
    client_email: Optional[str] = None  # Mudado para str para aceitar vazio
    client_phone: Optional[str] = None
    initial_context: Optional[str] = None


class CreateSessionResponse(BaseModel):
    session_id: str
    chat_url: str


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    reply: str
    progress: int
    current_section: str
    is_completed: bool
    options: Optional[list[dict]] = None  # Para checkboxes/botões interativos


class SessionStatusResponse(BaseModel):
    session_id: str
    client_name: str
    progress: int
    current_section: str
    is_completed: bool
    created_at: str
    briefing_data: dict


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    message: str


# === ENDPOINTS ===

@app.get("/")
async def root():
    return {
        "service": "Silver Brand Design Chatbot",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "ok", "ai_provider": settings.ai_provider}


@app.post("/api/session/create", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Cria uma nova sessão de chat para um cliente.
    Designer usa este endpoint para gerar link único.
    """
    session_id = str(uuid.uuid4())
    
    # Popular briefing_data com informações iniciais fornecidas
    initial_briefing_data = {}
    
    if request.client_name:
        initial_briefing_data["client_name"] = request.client_name
    
    if request.client_email:
        initial_briefing_data["client_email"] = request.client_email
    
    if request.client_phone:
        initial_briefing_data["client_phone"] = request.client_phone
    
    # Extrair cidade/estado do initial_context se mencionado
    if request.initial_context:
        context_lower = request.initial_context.lower()
        if any(word in context_lower for word in ["mora em", "vive em", "localizado em", "em "]):
            initial_briefing_data["city_state"] = request.initial_context
    
    new_session = DBSession(
        id=session_id,
        client_name=request.client_name,
        client_email=request.client_email,
        client_phone=request.client_phone,
        initial_context=request.initial_context or "",
        current_section="intro",
        progress_percentage="0",
        briefing_data=initial_briefing_data
    )
    
    db.add(new_session)
    db.commit()
    
    # URL do chat (ajustar para produção)
    chat_url = f"{settings.frontend_url}/chat/{session_id}"
    
    logger.info(f"Nova sessão criada: {session_id} para {request.client_name}")
    
    return CreateSessionResponse(
        session_id=session_id,
        chat_url=chat_url
    )


@app.get("/api/session/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retorna status e dados da sessão."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    return SessionStatusResponse(
        session_id=session.id,
        client_name=session.client_name,
        progress=int(session.progress_percentage),
        current_section=session.current_section,
        is_completed=session.is_completed,
        created_at=session.created_at.isoformat(),
        briefing_data=session.briefing_data or {}
    )


@app.post("/api/chat/{session_id}", response_model=ChatMessageResponse)
async def send_message(
    session_id: str,
    request: ChatMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Envia mensagem do usuário e recebe resposta do bot.
    """
    # Buscar sessão
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    if session.is_completed:
        return ChatMessageResponse(
            reply="Este briefing já foi completado! 🎉 Você pode baixar o PDF na página.",
            progress=100,
            current_section="completed",
            is_completed=True
        )
    
    # Buscar histórico de mensagens
    messages = db.query(Message).filter(
        Message.session_id == session_id
    ).order_by(Message.timestamp).all()
    
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]
    
    # Preparar dados da sessão para a IA
    session_data = {
        "client_name": session.client_name,
        "initial_context": session.initial_context,
        "current_section": session.current_section,
        "briefing_data": session.briefing_data or {}
    }
    
    # Gerar resposta da IA
    ai_response = await generate_response(
        session_data=session_data,
        conversation_history=conversation_history,
        user_message=request.message
    )
    
    # LOG: Debug da resposta da IA
    logger.info(f"🔍 DEBUG - Resposta completa da IA:")
    logger.info(f"   📝 Mensagem: {ai_response.message[:200]}...")
    logger.info(f"   📊 Progresso: {ai_response.context.overall_progress}")
    logger.info(f"   💾 Dados extraídos: {ai_response.context.extracted_data}")
    logger.info(f"   🎛️ Opções interativas: {ai_response.context.interactive_options}")
    logger.info(f"   🔧 Provider: {ai_response.provider_used}")
    
    # Extrair informações da resposta estruturada
    response_text = ai_response.message
    extracted_data = ai_response.context.extracted_data
    interactive_options = ai_response.context.interactive_options
    updated_progress = ai_response.context.overall_progress
    should_advance_section = ai_response.context.should_advance_section
    
    # Salvar mensagens
    user_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=request.message
    )
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=response_text
    )
    
    db.add(user_msg)
    db.add(assistant_msg)
    
    # Atualizar briefing_data se houver dados extraídos
    if extracted_data:
        logger.info(f"📊 Dados extraídos da IA: {extracted_data}")
        current_data = session.briefing_data or {}
        current_data.update(extracted_data)
        session.briefing_data = current_data
        
        # Sugerir próxima seção baseado nos dados atualizados
        try:
            current_section_id = SectionId(session.current_section)
        except ValueError:
            current_section_id = SectionId.CONTATO
            
        next_section_id = suggest_next_section(current_section_id, current_data)
        if should_advance_section and next_section_id != current_section_id:
            session.current_section = next_section_id.value
            logger.info(f"🔄 Avançando para seção: {next_section_id.value}")
    else:
        logger.warning(f"⚠️ Nenhum dado extraído da resposta da IA")
        
        # FALLBACK: Tentar extrair dados básicos da mensagem do usuário
        fallback_data = _extract_fallback_data(request.message, session.current_section)
        if fallback_data:
            logger.info(f"🔄 FALLBACK - Dados extraídos da mensagem do usuário: {fallback_data}")
            current_data = session.briefing_data or {}
            current_data.update(fallback_data)
            session.briefing_data = current_data
    
    # Log do briefing_data atual
    logger.info(f"📋 Briefing data atual: {session.briefing_data}")
    
    # Usar progresso da IA ou calcular localmente
    if updated_progress is not None:
        progress = updated_progress
    else:
        progress = calculate_overall_progress(session.briefing_data or {})
        
    session.progress_percentage = str(progress)
    logger.info(f"📈 Progresso calculado: {progress}%")
    
    # Verificar se completou
    if progress >= 95:
        session.is_completed = True
        from datetime import datetime
        session.completed_at = datetime.utcnow()
    
    db.commit()
    
    return ChatMessageResponse(
        reply=response_text,
        progress=progress,
        current_section=session.current_section,
        is_completed=session.is_completed,
        options=interactive_options
    )


@app.get("/api/chat/{session_id}/history")
async def get_chat_history(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retorna histórico completo da conversa."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    messages = db.query(Message).filter(
        Message.session_id == session_id
    ).order_by(Message.timestamp).all()
    
    return {
        "session_id": session_id,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in messages
        ]
    }


@app.get("/api/briefing/{session_id}")
async def get_briefing_data(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retorna dados coletados do briefing."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    return {
        "session_id": session_id,
        "client_name": session.client_name,
        "progress": int(session.progress_percentage),
        "is_completed": session.is_completed,
        "data": session.briefing_data or {}
    }


@app.post("/api/briefing/{session_id}/generate-pdf")
async def generate_pdf(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Gera PDF do briefing preenchido."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    try:
        pdf_path = generate_briefing_pdf(
            session_id=session_id,
            client_name=session.client_name,
            briefing_data=session.briefing_data or {}
        )
        
        return {"pdf_url": f"/api/briefing/{session_id}/download"}
    
    except Exception as e:
        logger.error(f"Erro ao gerar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")


@app.get("/api/briefing/{session_id}/download")
async def download_pdf(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Download do PDF gerado."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    pdf_path = f"generated_pdfs/{session_id}.pdf"
    
    try:
        return FileResponse(
            path=pdf_path,
            filename=f"briefing_{session.client_name.replace(' ', '_')}.pdf",
            media_type="application/pdf"
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF não encontrado. Gere o PDF primeiro.")


# === ADMIN ENDPOINTS ===

@app.post("/api/admin/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """Login do admin com senha (recebe hash SHA-256)."""
    import hashlib
    
    # Pegar senha do ambiente (ou usar padrão para desenvolvimento)
    admin_password = settings.admin_password if hasattr(settings, 'admin_password') else "silveradmin2024"
    
    # Fazer hash da senha configurada
    admin_password_hash = hashlib.sha256(admin_password.encode()).hexdigest()
    
    # Comparar hashes
    if request.password != admin_password_hash:
        raise HTTPException(status_code=401, detail="Senha incorreta")
    
    # Gerar token simples (em produção, use JWT)
    token = secrets.token_urlsafe(32)
    
    return AdminLoginResponse(
        token=token,
        message="Login realizado com sucesso"
    )


@app.get("/api/admin/sessions")
async def list_all_sessions(db: Session = Depends(get_db)):
    """Lista todas as sessões (para dashboard do designer)."""
    sessions = db.query(DBSession).order_by(DBSession.created_at.desc()).limit(50).all()
    
    return {
        "sessions": [
            {
                "id": s.id,
                "client_name": s.client_name,
                "progress": s.progress_percentage,
                "is_completed": s.is_completed,
                "created_at": s.created_at.isoformat()
            }
            for s in sessions
        ]
    }


@app.put("/api/briefing/{session_id}/update")
async def update_briefing(
    session_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Atualiza dados do briefing (modo fallback manual).
    Permite continuar preenchendo quando chat está offline.
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    # Atualizar briefing_data
    if "briefing_data" in request:
        current_data = session.briefing_data or {}
        current_data.update(request["briefing_data"])
        session.briefing_data = current_data
        
        # Recalcular progresso
        progress = calculate_overall_progress(current_data)
        session.progress_percentage = str(progress)
        
        # Verificar se completou
        if progress >= 95:
            session.is_completed = True
    
    db.commit()
    
    return {
        "success": True,
        "progress": session.progress_percentage,
        "is_completed": session.is_completed
    }


@app.post("/api/briefing/{session_id}/finalize")
async def finalize_briefing(
    session_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """Finaliza o briefing e envia emails de confirmação."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    # Atualizar dados do briefing com os editados
    if "briefing_data" in request:
        session.briefing_data = request["briefing_data"]
    
    # Marcar como completo
    session.is_completed = True
    from datetime import datetime
    session.completed_at = datetime.utcnow()
    session.progress_percentage = "100"
    
    db.commit()
    
    # Enviar emails
    client_email = request.get("client_email") or session.client_email
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Email para o cliente
        msg_client = MIMEMultipart()
        msg_client['From'] = settings.admin_email
        msg_client['To'] = client_email
        msg_client['Subject'] = f'Briefing Recebido - {session.client_name}'
        
        body_client = f"""
Olá {session.client_name},

Recebemos seu briefing de identidade visual com sucesso! 🎉

Nossa equipe da Silver Brand House irá revisar todas as informações e entraremos em contato em breve para dar continuidade ao projeto.

Obrigado pela confiança!

---
Silver Brand House
brandhousesilver@gmail.com
+55 11 96015 7100
        """
        
        msg_client.attach(MIMEText(body_client, 'plain'))
        
        # Email para o admin
        msg_admin = MIMEMultipart()
        msg_admin['From'] = settings.admin_email
        msg_admin['To'] = settings.admin_email
        msg_admin['Subject'] = f'Novo Briefing - {session.client_name}'
        
        body_admin = f"""
Novo briefing recebido!

Cliente: {session.client_name}
Email: {client_email}
Telefone: {session.client_phone or 'Não informado'}

Acesse o painel administrativo para ver os detalhes completos.

Link: {settings.frontend_url}/admin
        """
        
        msg_admin.attach(MIMEText(body_admin, 'plain'))
        
        # Enviar emails (nota: configurar SMTP em produção)
        logger.info(f"Briefing finalizado para {session.client_name}")
        logger.info(f"Emails seriam enviados para: {client_email} e {settings.admin_email}")
        
    except Exception as e:
        logger.error(f"Erro ao enviar emails: {e}")
        # Não falhar a requisição se email falhar
    
    return {
        "success": True,
        "message": "Briefing finalizado com sucesso",
        "session_id": session_id
    }


def _extract_fallback_data(user_message: str, current_section: str) -> dict:
    """
    Extração de fallback quando a IA não retorna dados estruturados.
    Tenta identificar informações básicas na mensagem do usuário.
    """
    import re
    
    data = {}
    message_lower = user_message.lower()
    
    # Detectar email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, user_message)
    if email_match:
        data["client_email"] = email_match.group()
    
    # Detectar telefone (formatos brasileiros e internacionais)
    phone_patterns = [
        r'\+55\s?\d{2}\s?\d{4,5}[-\s]?\d{4}',  # +55 11 99999-9999
        r'\(\d{2}\)\s?\d{4,5}[-\s]?\d{4}',     # (11) 99999-9999
        r'\d{2}\s?\d{4,5}[-\s]?\d{4}',         # 11 99999-9999
        r'\+\d{1,4}\s?\d{2,3}\s?\d{3,4}[-\s]?\d{3,4}'  # Internacional
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, user_message)
        if phone_match:
            data["client_phone"] = phone_match.group()
            break
    
    # Detectar cores (seção visual)
    if current_section == "visuais":
        color_keywords = [
            "azul", "vermelho", "verde", "amarelo", "roxo", "rosa", "laranja", 
            "preto", "branco", "cinza", "dourado", "prata", "marrom"
        ]
        mentioned_colors = [color for color in color_keywords if color in message_lower]
        if mentioned_colors:
            data["preferred_colors"] = ", ".join(mentioned_colors)
    
    # Detectar informações básicas da empresa (seção perfil)
    if current_section == "perfil":
        if any(word in message_lower for word in ["somos", "empresa", "trabalho", "faço", "oferecemos"]):
            # Capturar a frase que descreve a empresa
            sentences = user_message.split(".")
            for sentence in sentences:
                if any(word in sentence.lower() for word in ["somos", "empresa", "trabalho", "oferecemos"]):
                    data["about_company"] = sentence.strip()
                    break
    
    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
