# 🔌 Integração Base44 (Agent API)

Este documento centraliza as informações de integração com os agentes hospedados no **Base44**.

---

## 🔑 Credenciais e Agentes Ativos

### 🏦 1. Agente de Saldos e Automações (IBGR)
* **ID do Agente:** `69ce6d99e316a867c948f87c`
* **Chave de API:** `01df29c799f74d51aaf16ce02fc73cc9`
* **URL Base:** `https://app.base44.com/api/agents/69ce6d99e316a867c948f87c`
* **Configuração Local:** Salva no `.env` do `Data5-Agent` sob a variável `BASE44_API_KEY`.

### 🤖 2. Agente AGY 01 (Assistente Pessoal DPS Japão)
* **ID do Agente:** `6a47553b7df311e0c8fc2b82`
* **Chave de API:** `e68fa784a0424824b43b844844c6ca7b`
* **URL Base:** `https://app.base44.com/api/agents/6a47553b7df311e0c8fc2b82`
* **ID Conversa Padrão:** `6a47553d110fe595b97c5cb4`
* **Foco:** Assistente para tarefas agendadas, conexões, debug, código e automações no Google Antigravity.

### 🤖 3. Agente Portugual-01
* **ID do Agente:** `6a4765821ba865e12348dca4`
* **Chave de API:** `1ff9ebde0831438492c9e2aaa9546d04`
* **URL Base:** `https://app.base44.com/api/agents/6a4765821ba865e12348dca4`
* **ID Conversa Exemplo:** `6a476584110fe595b9818cfa`
* **Foco:** Braço externo de execução do Antigravity para tarefas locais/remotas e processamento paralelo.

---

## 📡 Protocolo de Comunicação Validado

Nos testes realizados em 03/07/2026, descobrimos detalhes cruciais sobre a estrutura de requisições que divergem da instrução inicial do agente.

### 🛑 O que NÃO funciona (Erros mapeados):
1. **Endpoint com `/default/`:** A URL `/conversations/default/messages` retorna erro `500 ObjectNotFoundError` (o backend exige um UUID de conversa válido).
2. **Payload com `{"message": "..."}`:** Retorna erro `422 Unprocessable Entity` ("Extra inputs are not permitted").

###  O que FUNCIONA (Sucesso 200 OK):
* **Endpoint:** `POST https://app.base44.com/api/agents/69ce6d99e316a867c948f87c/conversations/69ce6d9b6e1663b65387fee0/messages`
* **Headers:**
  * `api_key: 01df29c799f74d51aaf16ce02fc73cc9`
  * `Content-Type: application/json`
* **Body:**
  ```json
  {
    "role": "user",
    "content": "Gere o resumo de saldos do IBGR"
  }
  ```

---

## 🛠️ Execução e Script Local

Foi criado um script nativo Node.js no projeto `Data5-Agent` para facilitar disparos diretos e testes:
* **Arquivo:** [base44-agent.js](file:///c:/Users/Nailton/Desktop/Data5-Agent/scripts/base44-agent.js)

### Como rodar:
```bash
# Executa com a mensagem padrão ("Gere o resumo de saldos do IBGR")
node scripts/base44-agent.js

# Executa com uma mensagem customizada
node scripts/base44-agent.js "Sua pergunta personalizada aqui"
```

---

## 📜 Histórico de Resumos de Sessão
* [[Resumo - Agentes Ba44 - Montagem do Telegram Bridge e AssistentePC]] *(03/07/2026)*
* [[Resumo - Agentes Ba44 - Integracao Telegram Bridge e Canal Direto]] *(03/07/2026)*
* [[Resumo - Agentes Ba44 - Integracao Portugual-01 e Skill Base44-Control]] *(03/07/2026)*
* [[Resumo - Data5-Agent - Integracao Base44 e Protocolo]] *(03/07/2026)*
* [[Resumo - Data5-Agent - Planejamento Ecossistema Base44 e GitHub]] *(03/07/2026)*

---
*Nota mantida pelo Antigravity em 03/07/2026.*
