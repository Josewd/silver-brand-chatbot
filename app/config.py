from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # IA
    gemini_api_key: str = ""
    groq_api_key: str = ""
    ai_provider: str = "gemini"  # "gemini" ou "groq"
    
    # Database
    database_url: str = "sqlite:///./database/sessions.db"
    
    # Empresa
    admin_email: str = "brandhousesilver@gmail.com"
    admin_phone: str = "+5511960157100"
    company_name: str = "Silver Brand House"
    
    # Frontend
    frontend_url: str = "http://localhost:5173"
    
    # Security
    session_secret: str = "change-this-to-random-string"
    admin_password: str = "silveradmin2024"  # Senha padrão do admin
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância única das configurações."""
    return Settings()
