from sqlalchemy import Column, String, DateTime, Text, Boolean, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

from app.config import get_settings

settings = get_settings()

Base = declarative_base()


class Session(Base):
    """Sessão de chat com cliente."""
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True)  # UUID
    client_name = Column(String, nullable=False)
    client_email = Column(String)
    client_phone = Column(String)
    initial_context = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    
    # Dados coletados (JSON)
    briefing_data = Column(JSON, default=dict)
    
    # Progresso (1-8 seções)
    current_section = Column(String, default="intro")
    progress_percentage = Column(String, default="0")


class Message(Base):
    """Mensagens da conversa."""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Metadados opcionais
    msg_metadata = Column(JSON, default=dict)


# Database setup
os.makedirs("database", exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Cria as tabelas no banco."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency para obter sessão do banco."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
