# Data5-Memory

## Contexto e Objetivo
Integração de modelos de linguagem locais do **Ollama** diretamente no editor e na visualização de grafos de notas do **Obsidian Clone**, permitindo completação de texto, resumos e geração de insights de forma 100% offline.

## Arquitetura e Decisões Técnicas

### Backend Híbrido (REST + MCP)
- O arquivo `server/index.ts` unifica duas funções simultâneas:
  - Servidor HTTP Express para o frontend React.
  - Servidor de Protocolo MCP (Stdio) para agentes de IA ler/escrever notas.
- Todos os logs do backend saem em `console.error` para não quebrar a comunicação JSON-RPC do canal `stdout` do MCP.

### Integração com Ollama
- Endpoints de proxy expostos:
  - `GET /api/ai/models` (lista modelos locais disponíveis).
  - `POST /api/ai/complete` (processa completions e resumos).
- Resolve problemas de CORS e centraliza a comunicação com a porta `11434`.

### Visualização e Interface (React + Canvas)
- Grafo de notas renderizado em Canvas com simulação física *force-directed*, para alta performance.
- Painel assistente lateral no Editor com ações rápidas para resumir, categorizar ou gerar ideias.
- Links bidirecionais estilo `[[wiki-links]]` integrados para criação ágil de notas vazias ao clicar.

---
**Tags:** #projeto #data5-memory #mcp #ollama #obsidian
