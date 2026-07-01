#!/usr/bin/env python3
"""
Script de teste rápido para validar o sistema Silver Brand Chatbot.
"""

import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Testa se todas as dependências estão instaladas."""
    print("🔍 Testando imports...")
    
    try:
        import fastapi
        print("  ✅ FastAPI")
    except ImportError:
        print("  ❌ FastAPI não instalado")
        return False
    
    try:
        import sqlalchemy
        print("  ✅ SQLAlchemy")
    except ImportError:
        print("  ❌ SQLAlchemy não instalado")
        return False
    
    try:
        from reportlab.lib import pagesizes
        print("  ✅ ReportLab")
    except ImportError:
        print("  ❌ ReportLab não instalado")
        return False
    
    try:
        from app.config import get_settings
        settings = get_settings()
        print("  ✅ Configurações carregadas")
        
        if settings.gemini_api_key:
            print(f"  ✅ GEMINI_API_KEY configurada ({settings.gemini_api_key[:10]}...)")
        elif settings.groq_api_key:
            print(f"  ✅ GROQ_API_KEY configurada ({settings.groq_api_key[:10]}...)")
        else:
            print("  ⚠️  Nenhuma API key configurada (configurar .env)")
            
    except Exception as e:
        print(f"  ❌ Erro ao carregar configurações: {e}")
        return False
    
    return True


def test_database():
    """Testa conexão e criação do banco."""
    print("\n🗄️  Testando banco de dados...")
    
    try:
        from app.models import init_db, engine
        init_db()
        print("  ✅ Banco de dados inicializado")
        
        # Testar conexão
        with engine.connect() as conn:
            print("  ✅ Conexão com banco OK")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erro no banco: {e}")
        return False


def test_api():
    """Testa se a API inicia corretamente."""
    print("\n🚀 Testando API...")
    
    try:
        from app.main import app
        print("  ✅ API carregada com sucesso")
        return True
    except Exception as e:
        print(f"  ❌ Erro ao carregar API: {e}")
        return False


def test_pdf_generation():
    """Testa geração de PDF."""
    print("\n📄 Testando geração de PDF...")
    
    try:
        from app.pdf_generator import generate_briefing_pdf
        import os
        
        # Dados de teste
        test_data = {
            "client_name": "Teste Cliente",
            "client_email": "teste@email.com",
            "company_description": "Empresa de teste",
            "keywords": "Teste, Demo, Exemplo"
        }
        
        pdf_path = generate_briefing_pdf(
            session_id="test-123",
            client_name="Teste Cliente",
            briefing_data=test_data
        )
        
        if os.path.exists(pdf_path):
            print(f"  ✅ PDF gerado: {pdf_path}")
            # Limpar arquivo de teste
            os.remove(pdf_path)
            print("  ✅ Arquivo de teste removido")
            return True
        else:
            print("  ❌ PDF não foi criado")
            return False
            
    except Exception as e:
        print(f"  ❌ Erro ao gerar PDF: {e}")
        return False


def test_ai_provider():
    """Testa conexão com provedor de IA."""
    print("\n🤖 Testando provedor de IA...")
    
    try:
        from app.ai import _get_ai_client
        client, provider = _get_ai_client()
        print(f"  ✅ Provedor configurado: {provider}")
        return True
    except ValueError as e:
        print(f"  ⚠️  {e}")
        print("  ℹ️  Configure GEMINI_API_KEY ou GROQ_API_KEY no .env")
        return False
    except Exception as e:
        print(f"  ❌ Erro ao conectar com IA: {e}")
        return False


def main():
    """Executa todos os testes."""
    print("=" * 60)
    print("🧪 TESTE DO SISTEMA SILVER BRAND CHATBOT")
    print("=" * 60)
    
    results = {
        "Imports": test_imports(),
        "Banco de Dados": test_database(),
        "API": test_api(),
        "Geração de PDF": test_pdf_generation(),
        "Provedor de IA": test_ai_provider(),
    }
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test}")
    
    print(f"\n✨ {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n🎉 Sistema pronto para uso!")
        print("\n📝 Próximos passos:")
        print("  1. Configurar .env com API keys")
        print("  2. Rodar: uvicorn app.main:app --reload")
        print("  3. Acessar: http://localhost:8000")
        return 0
    else:
        print("\n⚠️  Alguns testes falharam. Verifique os erros acima.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
