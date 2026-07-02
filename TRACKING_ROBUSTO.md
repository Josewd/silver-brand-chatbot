# Sistema de Tracking Robusto de Briefing

## 📋 Visão Geral

Sistema aprimorado de coleta e rastreamento de dados do briefing que combina:

1. **Extração explícita** via marcador `DATA_COLLECTED` nas respostas da IA
2. **Inferência automática** como fallback quando a IA não gera `DATA_COLLECTED`
3. **Formulário estruturado** completo mantido em paralelo ao histórico de mensagens

## 🎯 Objetivos

- **Robustez**: Garantir que nenhum dado seja perdido, mesmo se a IA falhar
- **Progresso contínuo**: Barra de progresso sempre atualiza, mesmo sem `DATA_COLLECTED`
- **Independência**: Frontend pode sincronizar diretamente com o formulário estruturado
- **Manutenibilidade**: Histórico de mensagens permanece intacto

## 🏗️ Arquitetura

### Arquivo: `app/briefing_form.py`

Novo módulo que gerencia o formulário estruturado:

```python
create_empty_form()          # Cria estrutura completa com 8 seções
flatten_form()               # Converte estruturado → flat (compatibilidade)
update_form_from_flat()      # Atualiza estruturado com dados flat
infer_data_from_message()    # Fallback: infere dados da mensagem do usuário
get_form_summary()           # Resumo conciso para incluir no prompt da IA
```

### Estrutura do Formulário

```json
{
  "contato": {
    "client_name": "",
    "client_email": "",
    "client_phone": "",
    "city_state": "",
    "website": ""
  },
  "basicas": {
    "project_type": "",
    "deadline": ""
  },
  "entrega": {
    "deliverables_confirmed": "",
    "extra_items": ""
  },
  "perfil": {
    "about_company": "",
    "products_services": "",
    "diferencial": "",
    "mission_vision_values": "",
    "main_objectives": ""
  },
  "posicionamento": {
    "positioning": "",
    "keywords": "",
    "differentiation": "",
    "personality_scales": {}
  },
  "concorrentes": {
    "competitors": "",
    "references": "",
    "what_you_like": ""
  },
  "visuais": {
    "preferred_colors": "",
    "excluded_colors": "",
    "logo_types": "",
    "font_preferences": "",
    "visual_references": ""
  },
  "final": {
    "additional_info": ""
  }
}
```

## 🔄 Fluxo de Dados

### Mensagem do Usuário → Backend

```
1. Usuário envia mensagem
   ↓
2. IA gera resposta
   ↓
3. Backend extrai DATA_COLLECTED (se presente)
   ↓
4. SE não houver DATA_COLLECTED:
   └─> Chama infer_data_from_message()
       └─> Infere campo vazio da seção atual
   ↓
5. Atualiza session.briefing_data (formato flat)
   ↓
6. Calcula progresso
   ↓
7. Retorna para frontend
```

### IA recebe contexto atualizado

No prompt da IA (`_build_system_prompt`):

```
## Estado do Formulário (campos preenchidos):
CONTATO: 4/5 campos
  - client_name: Jose Silva
  - client_email: jose@example.com
  - client_phone: (11) 99999-9999
  - city_state: São Paulo, SP
BASICAS: 1/2 campos
  - project_type: Projeto novo
```

## 🛡️ Mecanismo de Fallback

### Lógica de Inferência

A função `infer_data_from_message()` atua quando `DATA_COLLECTED` está ausente:

1. **Identifica a seção atual** (intro, contato, perfil, etc.)
2. **Mapeia campos vazios** dessa seção
3. **Atribui a mensagem do usuário ao primeiro campo vazio**
4. **Log** da inferência para debug

### Exemplo Prático

```
Seção: "contato"
Campos vazios: ["client_email", "client_phone"]
Mensagem: "jose@example.com"
Inferência: {"client_email": "jose@example.com"}
```

## 📊 Benefícios

### Antes (Sistema Antigo)

- ❌ Se IA esquecer `DATA_COLLECTED`, dados perdidos
- ❌ Progresso travado se nada for extraído
- ❌ Frontend dependente 100% da extração da IA
- ❌ Debug difícil de falhas de extração

### Agora (Sistema Robusto)

- ✅ Fallback automático se `DATA_COLLECTED` ausente
- ✅ Progresso sempre atualiza
- ✅ Frontend pode sincronizar independentemente
- ✅ Logs detalhados para debug
- ✅ Formulário estruturado facilita manutenção
- ✅ Histórico de mensagens preservado

## 🧪 Testes

Execute o teste manual:

```bash
python3 test_tracking.py
```

Verifica:
- Criação do formulário vazio
- Inferência de dados sem `DATA_COLLECTED`
- Atualização progressiva do formulário
- Geração de resumo para IA
- Conversão estruturado ↔ flat

## 📝 Logs Importantes

No `main.py`:

```python
logger.info(f"📊 Dados extraídos da IA: {extracted_data}")
logger.warning(f"⚠️ Nenhum dado extraído da resposta da IA")
logger.info(f"✨ Dados inferidos (fallback): {inferred_data}")
logger.info(f"📋 Briefing data atual: {session.briefing_data}")
```

No `briefing_form.py`:

```python
logger.info(f"🔍 Inferindo dados: {first_empty_field} = {user_message[:50]}...")
```

## 🔮 Melhorias Futuras

1. **Machine Learning**: Treinar modelo para inferir campos com mais precisão
2. **Validação**: Validar formato de email, telefone, etc.
3. **Autocompletar**: Sugerir valores baseados em briefings anteriores
4. **Correção automática**: Detectar e corrigir erros comuns
5. **Campos derivados**: Gerar automaticamente campos relacionados

## 🚀 Deploy

Nenhuma mudança necessária no processo de deploy. O sistema é **backward compatible**:

- Sessões antigas (formato flat) continuam funcionando
- Novas sessões usam o sistema robusto automaticamente
- `briefing_data` mantém formato flat para compatibilidade

## 🔗 Arquivos Relacionados

- `app/briefing_form.py` - Novo módulo de formulário estruturado
- `app/main.py` - Integração do fallback no endpoint `/api/chat`
- `app/ai.py` - Inclusão do resumo do formulário no prompt
- `test_tracking.py` - Teste manual do sistema
