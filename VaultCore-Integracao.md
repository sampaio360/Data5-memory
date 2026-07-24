# VaultCore — Sistema Central de Segredos

## O que é
VaultCore é o cofre central de credenciais do ecossistema Base44 do Nailton Sampaio.
Todos os agentes consultam este sistema para obter chaves de API, senhas e tokens.

## App
- **ID:** 6a63972211ae316341ddb11a
- **Nome:** VaultCore
- **Entidades:** Secret (11 registros), Agent (6 agentes), AccessLog

## Como Consultar (para Superagents)

### Método 1: read_entities (nativo — recomendado)

Qualquer Superagent do Nailton pode usar a tool `read_entities`:

```
Tool: read_entities
app_id: "6a63972211ae316341ddb11a"
entity_name: "Secret"
query: {"name": "NOME_DO_SEGREDO"}
```

### Método 2: Backend Function vaultApi (via S360)

A function `vaultApi` está deployada no S360 (6a5122652bc707975644f0fd).

Chamar via `call_base44_backend_function`:
```
app_id: "6a5122652bc707975644f0fd"
function_name: "vaultApi"
payload: {"action": "get", "name": "GITHUB_TOKEN", "agent": "NomeDoAgente"}
```

## Segredos Disponíveis

1. GITHUB_TOKEN — token do GitHub para repos sampaio360
2. OPENROUTER_API_KEY — chave do OpenRouter (IA gratuita/paga)
3. GEMINI_API_KEY — auth key do Google AI Studio
4. SUPABASE_ANON_KEY — chave anon do Supabase (Cabide Digital/Tabili)
5. BASE44_API_KEY_GMAIL — API key do app Gmail Brasil Map
6. BASE44_API_KEY_TASKFLOW — API key do app TaskFlow
7. BASE44_API_KEY_PASSGUARD — API key do app PassGuard
8. BASE44_API_KEY_VAULTCORE — API key do app VaultCore
9. TABILI_PASSWORD — senha do sistema Tabili
10. GMAIL_PASSWORD — senha da conta Gmail
11. FB_PAGE_TOKEN — token da Facebook Pages API

## Agentes Registrados

1. Sampaio360 (6a5122652bc707975644f0fd) — principal
2. Lyra (6a5fc873001ac4b905c6face) — maestro
3. CF-Master (69ce6d99e316a867c948f87c) — comandos
4. Gmail (6a6066d45dbb2f5905fac87f) — e-mails
5. Viralis (6a605fb8b877ca52732a49ff) — marketing
6. Nutricionista (6a25f50d3f34f1ee0cd81926) — nutrição

## Atualização de Segredos

Para atualizar uma chave (todos os agentes passam a usar a nova):

```bash
# Via function vaultApi
curl -X POST ... -d '{"action":"update","name":"GITHUB_TOKEN","value":"nova_chave"}'
```
