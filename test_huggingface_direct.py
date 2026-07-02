#!/usr/bin/env python3
"""
Teste direto da API do Hugging Face
"""

import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

settings = get_settings()


async def test_huggingface_direct():
    """Testa API do Hugging Face diretamente."""
    
    print("=" * 60)
    print("🧪 TESTE DIRETO DA API HUGGING FACE")
    print("=" * 60)
    
    # URL da API
    url = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions"
    
    # Headers
    headers = {
        "Content-Type": "application/json"
    }
    
    if settings.huggingface_api_key:
        headers["Authorization"] = f"Bearer {settings.huggingface_api_key}"
        print(f"\n✅ Usando API Key: {settings.huggingface_api_key[:10]}...")
    else:
        print("\n⚠️  Sem API Key (usando acesso público - pode ter limites)")
    
    # Payload de teste
    payload = {
        "model": "meta-llama/Llama-3.2-3B-Instruct",
        "messages": [
            {
                "role": "system",
                "content": "Você é um assistente prestativo e responde em português."
            },
            {
                "role": "user",
                "content": "Olá! Me diga uma frase curta sobre design de marcas."
            }
        ],
        "max_tokens": 150,
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 Enviando requisição para Hugging Face...")
    print(f"🔗 URL: {url}")
    print(f"📦 Modelo: Llama-3.2-3B-Instruct")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            print(f"\n📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                message = data["choices"][0]["message"]["content"]
                
                print("\n✅ RESPOSTA RECEBIDA:")
                print("-" * 60)
                print(message)
                print("-" * 60)
                
                # Informações adicionais
                if "usage" in data:
                    print(f"\n📈 Tokens usados: {data['usage']}")
                
                print("\n🎉 Hugging Face funcionando perfeitamente!")
                return True
                
            elif response.status_code == 503:
                print("\n⚠️  Modelo ainda carregando (503 Service Unavailable)")
                print("Isso é normal na primeira chamada. O modelo demora ~20s para carregar.")
                print("Tente novamente em alguns segundos.")
                print(f"\nResposta: {response.text}")
                return False
                
            else:
                print(f"\n❌ Erro HTTP {response.status_code}")
                print(f"Resposta: {response.text}")
                return False
                
    except httpx.TimeoutException:
        print("\n❌ Timeout! A API demorou mais de 60 segundos.")
        print("Isso pode acontecer se o modelo estiver carregando pela primeira vez.")
        print("Tente novamente em alguns segundos.")
        return False
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        print(f"Tipo: {type(e).__name__}")
        return False


async def main():
    success = await test_huggingface_direct()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ API DO HUGGING FACE ESTÁ FUNCIONANDO!")
        print("=" * 60)
        print("\n📝 O fallback automático deve funcionar quando Groq falhar.")
        return 0
    else:
        print("\n" + "=" * 60)
        print("❌ TESTE FALHOU")
        print("=" * 60)
        print("\n🔍 Possíveis causas:")
        print("  1. Modelo está carregando (aguarde 20-30s e tente novamente)")
        print("  2. Rate limit atingido (configure HUGGINGFACE_API_KEY)")
        print("  3. Problema de rede")
        print("  4. API Key inválida")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
