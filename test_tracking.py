#!/usr/bin/env python3
"""
Teste manual do sistema de tracking robusto.
Simula o fluxo de mensagens sem DATA_COLLECTED.
"""

from app.briefing_form import (
    create_empty_form,
    flatten_form,
    update_form_from_flat,
    infer_data_from_message,
    get_form_summary
)

print("=" * 60)
print("TESTE: Sistema de Tracking Robusto")
print("=" * 60)

# 1. Criar formulário vazio
print("\n1️⃣  Criando formulário vazio...")
form = create_empty_form()
print(f"✅ Formulário criado com {len(form)} seções")
print(f"Seções: {list(form.keys())}")

# 2. Simular mensagens do usuário SEM DATA_COLLECTED da IA
print("\n2️⃣  Simulando conversação sem DATA_COLLECTED...")

mensagens = [
    ("Jose Silva", "intro"),
    ("jose@example.com", "contato"),
    ("(11) 99999-9999", "contato"),
    ("São Paulo, SP", "contato"),
    ("Projeto novo", "basicas"),
    ("Vendo café artesanal premium", "perfil"),
]

briefing_data = {}

for i, (msg, secao) in enumerate(mensagens, 1):
    print(f"\n  📨 Mensagem {i}: '{msg}' (seção: {secao})")
    
    # Atualizar form com dados existentes
    form = update_form_from_flat(form, briefing_data)
    
    # Inferir dados da mensagem
    inferred = infer_data_from_message(msg, secao, form)
    
    if inferred:
        print(f"     ✨ Inferido: {inferred}")
        briefing_data.update(inferred)
        form = update_form_from_flat(form, briefing_data)
    else:
        print(f"     ⚠️  Nada inferido")

# 3. Verificar resultado final
print("\n3️⃣  Estado final do briefing:")
print(f"Dados coletados: {briefing_data}")

# 4. Gerar resumo para IA
print("\n4️⃣  Resumo para incluir no prompt da IA:")
print("-" * 60)
summary = get_form_summary(form)
print(summary)
print("-" * 60)

# 5. Testar flatten
print("\n5️⃣  Convertendo form estruturado para flat...")
flat = flatten_form(form)
print(f"✅ {len([v for v in flat.values() if v])} campos preenchidos de {len(flat)} total")

print("\n" + "=" * 60)
print("✅ TESTE COMPLETO!")
print("=" * 60)
