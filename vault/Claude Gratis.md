# Claude Gratis

O projeto **Claude Gratis** é uma solução local desenvolvida em Node.js para configurar, gerenciar e rodar o **Claude Code** (agente CLI oficial da Anthropic) integrado com provedores de Inteligência Artificial alternativos ou gratuitos (como OpenRouter, Ollama local e Google AI Studio via LiteLLM).

---

## 🚀 Como Funciona o Projeto

O projeto é composto por scripts locais que fornecem uma interface gráfica amigável para gerenciar as configurações do Claude Code, mapear papéis de assistentes a modelos específicos e executar prompts diretamente de um script helper.

### 📁 Principais Componentes e Arquivos

1. **`claude-gui.cjs` (Configurador Visual):**
   * Servidor HTTP local baseado em Node.js que roda na porta **`4141`** (`http://localhost:4141`).
   * Abre automaticamente a interface de configuração no navegador padrão do usuário.
   * Interface Web premium construída com fontes modernas (*Plus Jakarta Sans*), ícones dinâmicos (*Phosphor Icons*) e visual cyberpunk/cinemático.
   * Permite configurar as variáveis de ambiente e alternar entre provedores e modelos de forma gráfica.

2. **`iniciar-configurador.bat`:**
   * Script em lote (.bat) localizado na pasta `claude-gratis`.
   * Inicializa o servidor Node.js da GUI com um clique.

3. **`chamar-modelo.cjs` (Script Helper):**
   * Script de linha de comando para fazer consultas aos modelos configurados.
   * Suporta o argumento `--role <coding|reasoning|general>` para direcionar o prompt ao assistente e modelo corretos conforme definidos em `assistants.json`.

4. **`assistants.json`:**
   * Mapeamento de papéis (`coding`, `reasoning`, `general`) para provedores e modelos específicos de forma individualizada.

5. **`settings.json` (Localizado em `~/.claude/settings.json`):**
   * Arquivo de configuração global do próprio Claude Code. A GUI visual atualiza as chaves em `env` e o modelo global (`model`) diretamente neste arquivo.

---

## 🔌 Provedores e APIs Suportados

*   **Ollama (Local):**
    *   Roda em `http://localhost:11434`.
    *   O configurador consome o endpoint `/api/tags` para listar automaticamente todos os modelos instalados na máquina do usuário.
*   **OpenRouter:**
    *   URL Base: `https://openrouter.ai/api`
    *   Utiliza chaves de API (`Authorization: Bearer sk-or-v1-...`) e permite o uso de modelos gratuitos como `cohere/north-mini-code:free` ou `openrouter/free`.
*   **Google AI Studio (Gemini):**
    *   Roda integrado a um proxy local do LiteLLM em `http://localhost:4000/v1/chat/completions`.

---

## 📡 Endpoints da API Local (`claude-gui.cjs`)

O servidor de configuração expõe as seguintes rotas:
*   `GET /` - Renderiza a interface web principal.
*   `GET /api/settings` e `POST /api/settings` - Lê e escreve as configurações globais do Claude no `settings.json`.
*   `GET /api/assistants` e `POST /api/assistants` - Lê e escreve as associações de funções no `assistants.json`.
*   `GET /api/models` - Consulta os modelos do Ollama local.
*   `POST /api/launch` - Inicia uma nova janela de terminal executando o comando `claude` (Claude CLI).

---

## 🔧 Histórico de Ajustes e Melhorias Recentes

*   **Organização de Pasta:** Todos os arquivos de GUI e execução foram movidos para a pasta dedicada `claude-gratis` no workspace, e os atalhos de execução no Desktop foram atualizados.
*   **Bug de Alternância de Abas:** Corrigida a função `switchProvider` que dava erro ao tentar capitalizar IDs incorretamente (ex. procurando `Openrouter` em vez de `OpenRouter` ou `Aistudio` em vez de `AiStudio`).
*   **Problema de Sobrescrita de Configurações:** Resolvido o comportamento no carregamento da página onde as chamadas assíncronas apagavam o token ou modelo do OpenRouter antes da interface carregar os dados reais.
*   **Desativação de Cache:** Adicionados cabeçalhos HTTP `Cache-Control: no-store` no servidor para evitar que o navegador sirva o script antigo em cache ao alternar de abas.
*   **URL do Ollama:** Ajustada a URL no `settings.json` para remover o `/v1` do Ollama, garantindo o funcionamento do endpoint `/api/chat` de forma compatível.

---
*Relacionado:* [[Projetos Principais]], [[Antigravidade]]

*Nota criada automaticamente pelo Antigravity em 28/06/2026.*
