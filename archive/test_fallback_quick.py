#!/usr/bin/env python3
"""Teste simplificado do fallback"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_fallback_simple():
    from app.ai import _generate_huggingface
    
    print("🧪 Testando Hugging Face (fallback)...\n")
    
    messages = [
        {"role": "system", "content": "Você é um consultor de design."},
        {"role": "user", "content": "Olá!"}
    ]
    
    try:
        response = await _generate_huggingface(messages)
        print(f"✅ Resposta: {response}\n")
        print("🎉 Fallback funcionando!")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_fallback_simple())
    sys.exit(0 if success else 1)
