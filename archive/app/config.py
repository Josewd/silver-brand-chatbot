from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # IA (Sistema híbrido: Groq -> Hugging Face)
    groq_api_key: str = ""
    huggingface_api_key: str = ""  # Opcional, melhora rate limits
    
    # Database
    database_url: str = "sqlite:///./database/sessions.db"
    
    # Empresa
    admin_email: str = "brandhousesilver@gmail.com"
    admin_phone: str = "+5511960157100"
    company_name: str = "Silver Brand House"
    
    # Frontend
    frontend_url: str = "http://localhost:5173"
    
    # Provider
    ai_provider: str = "groq"  # Provedor padrão
    
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
