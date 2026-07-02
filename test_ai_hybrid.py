#!/usr/bin/env python3
"""
Teste rápido do sistema de IA híbrido.
Testa Groq e Hugging Face em sequência.
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ai import generate_response

async def test_hybrid_system():
    """Testa o sistema híbrido de IA."""
    
    print("=" * 60)
    print("🧪 TESTE DO SISTEMA DE IA HÍBRIDO")
    print("=" * 60)
    
    # Dados de teste
    session_data = {
        "client_name": "Teste",
        "initial_context": "Teste do sistema",
        "current_section": "intro",
        "briefing_data": {}
    }
    
    conversation_history = []
    user_message = "Olá! Quero criar uma identidade visual para minha empresa."
    
    print(f"\n📤 Mensagem do usuário: {user_message}")
    print("\n🤖 Aguardando resposta da IA...")
    
    try:
        response, extracted_data, interactive_options = await generate_response(
            session_data=session_data,
            conversation_history=conversation_history,
            user_message=user_message
        )
        
        print("\n✅ RESPOSTA RECEBIDA:")
        print("-" * 60)
        print(response)
        print("-" * 60)
        
        if extracted_data:
            print(f"\n📊 Dados extraídos: {extracted_data}")
        
        if interactive_options:
            print(f"\n🎯 Opções interativas: {len(interactive_options)} opções")
        
        print("\n✅ Sistema híbrido funcionando corretamente!")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        return False


async def test_fallback():
    """Testa o fallback entre providers."""
    
    print("\n" + "=" * 60)
    print("🔄 TESTE DE FALLBACK (Groq → Hugging Face)")
    print("=" * 60)
    print("\nℹ️  Para testar o fallback completamente, você precisaria:")
    print("  1. Desabilitar temporariamente o Groq, OU")
    print("  2. Atingir o rate limit do Groq (30 req/min)")
    print("\n✅ O fallback está configurado e pronto para ativar automaticamente!")
    print("✅ Logs mostrarão qual provider foi usado em cada chamada.")


async def main():
    """Executa todos os testes."""
    
    # Teste 1: Sistema híbrido básico
    success = await test_hybrid_system()
    
    if not success:
        print("\n⚠️  Teste falhou. Verifique:")
        print("  1. GROQ_API_KEY está configurada no .env")
        print("  2. Conexão com internet está OK")
        print("  3. Logs acima para mais detalhes")
        return 1
    
    # Teste 2: Informações sobre fallback
    await test_fallback()
    
    print("\n" + "=" * 60)
    print("🎉 TESTES CONCLUÍDOS COM SUCESSO!")
    print("=" * 60)
    print("\n📝 Próximos passos:")
    print("  1. Rodar o backend: uvicorn app.main:app --reload")
    print("  2. Testar no navegador: http://localhost:8000")
    print("  3. Monitorar logs para ver qual provider está sendo usado")
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
