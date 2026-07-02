#!/usr/bin/env python3
"""
Script de teste para verificar se a comunicação IA/Frontend está funcionando.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.interfaces import *
from app.ai import generate_response
import asyncio

async def test_ai_response():
    """Testa se a IA está retornando dados estruturados."""
    
    # Dados de teste da sessão
    session_data = {
        "client_name": "Teste Cliente",
        "current_section": "contato",
        "briefing_data": {
            "client_name": "Teste Cliente"
        }
    }
    
    # Histórico vazio
    conversation_history = []
    
    # Mensagem de teste simulando cliente fornecendo email
    user_message = "Meu email é teste@email.com"
    
    print("🚀 Testando geração de resposta da IA...")
    print(f"📝 Mensagem do usuário: {user_message}")
    
    try:
        # Gerar resposta
        ai_response = await generate_response(
            session_data=session_data,
            conversation_history=conversation_history,
            user_message=user_message
        )
        
        print(f"\n✅ Resposta gerada com sucesso!")
        print(f"🤖 Mensagem: {ai_response.message[:200]}...")
        print(f"📊 Progresso: {ai_response.context.overall_progress}%")
        print(f"📋 Seção atual: {ai_response.context.section_info.current_section}")
        print(f"💾 Dados extraídos: {ai_response.context.extracted_data}")
        print(f"🎛️ Opções interativas: {len(ai_response.context.interactive_options) if ai_response.context.interactive_options else 0}")
        print(f"🔧 Provider usado: {ai_response.provider_used}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao gerar resposta: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_data_extraction():
    """Testa especificamente a extração de dados."""
    from app.ai import _extract_structured_data
    
    print("\n🧪 Testando extração de dados...")
    
    # Resposta simulada da IA com DATA_COLLECTED
    test_response = """Perfeito! Qual seu telefone?



DATA_COLLECTED:{"client_email": "teste@email.com"}"""
    
    extracted = _extract_structured_data(test_response, "contato")
    
    if extracted:
        print(f"✅ Extração funcionando: {extracted}")
        return True
    else:
        print(f"❌ Extração falhou para: {test_response}")
        return False

async def main():
    """Função principal de teste."""
    print("=" * 60)
    print("🧪 TESTE DO SISTEMA DE COMUNICAÇÃO IA/FRONTEND")
    print("=" * 60)
    
    # Teste 1: Extração de dados
    extraction_ok = await test_data_extraction()
    
    # Teste 2: Resposta completa da IA
    response_ok = await test_ai_response()
    
    print("\n" + "=" * 60)
    print("📊 RESULTADOS DOS TESTES:")
    print(f"Extração de dados: {'✅ OK' if extraction_ok else '❌ FALHOU'}")
    print(f"Resposta da IA: {'✅ OK' if response_ok else '❌ FALHOU'}")
    
    if extraction_ok and response_ok:
        print("\n🎉 Todos os testes passaram! O sistema está funcionando.")
    else:
        print("\n⚠️ Alguns testes falharam. Verifique os logs acima.")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())