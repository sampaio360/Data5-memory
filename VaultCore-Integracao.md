# VaultCore — Sistema Central de Segredos do Ecossistema

## O que é

VaultCore é o cofre central de credenciais do ecossistema Base44 do Nailton Sampaio.
Todos os agentes consultam este sistema para obter chaves de API, senhas e tokens.

## Dados do Sistema

- **App ID:** 6a63972211ae316341ddb11a
- **Nome:** VaultCore
- **Entidades:** Secret (11 registros), Agent (6 agentes), AccessLog
- **API Key:** BASE44_API_KEY_4 (variável de ambiente no S360)

## Como Consultar (para TODOS os Superagents)

### Método Recomendado: read_entities (nativo)

Qualquer Superagent do Nailton pode usar a tool `read_entities` para consultar segredos:

**Listar todos os segredos:**
```
Tool: read_entities
app_id: "6a63972211ae316341ddb11a"
entity_name: "Secret"
fields: ["id", "name", "provider", "type", "category", "status", "description"]
```

**Buscar um segredo específico:**
```
Tool: read_entities
app_id: "6a63972211ae316341ddb11a"
entity_name: "Secret"
query: {"name": "GITHUB_TOKEN"}
```

### Método Alternativo: Backend Function vaultApi (via S360)

A function `vaultApi` está deployada no S360 (6a5122652bc707975644f0fd):

```
Tool: call_base44_backend_function
app_id: "6a5122652bc707975644f0fd"
function_name: "vaultApi"
payload: {"action": "get", "name": "GITHUB_TOKEN", "agent": "NomeDoAgente"}
```

### Ações disponíveis na function vaultApi:

| Ação | Parâmetros | Retorna |
|------|-----------|---------|
| list | — | Lista de segredos (sem valores) |
| get | name, agent? | Valor do segredo + metadados |
| create | name, value, type?, provider?, category?, description? | ID criado |
| seed | secrets[] (array) | Contagem de criados/pulados/erros |
| update | name, value?/status?/is_active?/description? | Confirmação |
| delete | name | Confirmação |
| dedup | — | Remove duplicados |
| list_agents | — | Lista agentes registrados |

## Segredos Disponíveis (11)

| Nome | Categoria | Provider | Descrição |
|------|-----------|----------|-----------|
| GITHUB_TOKEN | Desenvolvimento | GitHub | Token de acesso aos repos sampaio360 |
| OPENROUTER_API_KEY | IA | OpenRouter | Chave para modelos de IA |
| GEMINI_API_KEY | IA | Google AI Studio | Auth key do Gemini |
| SUPABASE_ANON_KEY | Infraestrutura | Supabase | Chave anon do Supabase |
| BASE44_API_KEY_GMAIL | Plataforma | Base44 | API key Gmail Brasil Map |
| BASE44_API_KEY_TASKFLOW | Plataforma | Base44 | API key TaskFlow |
| BASE44_API_KEY_PASSGUARD | Plataforma | Base44 | API key PassGuard |
| BASE44_API_KEY_VAULTCORE | Plataforma | Base44 | API key VaultCore |
| TABILI_PASSWORD | Sistemas | Tabili | Senha do sistema Tabili |
| GMAIL_PASSWORD | Email | Google | Senha da conta Gmail |
| FB_PAGE_TOKEN | Social | Facebook | Token da Facebook Pages API |

## Agentes Registrados (6)

| Agente | ID | Função |
|--------|----|--------|
| Sampaio360 | 6a5122652bc707975644f0fd | Principal (hospeda vaultApi) |
| Lyra | 6a5fc873001ac4b905c6face | Maestro |
| CF-Master | 69ce6d99e316a867c948f87c | Comandos |
| Gmail | 6a6066d45dbb2f5905fac87f | E-mails |
| Viralis | 6a605fb8b877ca52732a49ff | Marketing |
| Nutricionista | 6a25f50d3f34f1ee0cd81926 | Nutrição |

## Atualização de Segredos

Para atualizar uma chave (todos os agentes passam a usar a nova):

```
Tool: call_base44_backend_function
app_id: "6a5122652bc707975644f0fd"
function_name: "vaultApi"
payload: {"action": "update", "name": "GITHUB_TOKEN", "value": "nova_chave"}
```

Ou via update_entities:
```
Tool: update_entities
app_id: "6a63972211ae316341ddb11a"
entity_name: "Secret"
query: {"name": "GITHUB_TOKEN"}
data: {"value": "nova_chave"}
```
