# Configurando o Servidor MCP do Obsidian

Este guia explica como conectar outras ferramentas de Inteligência Artificial (como Cursor, Claude Desktop ou scripts Python) ao cofre local de notas do seu Obsidian Clone usando o protocolo **MCP (Model Context Protocol)**.

---

## 🚀 Como Iniciar o Servidor
Para que as ferramentas consigam se comunicar via rede ou stdio, certifique-se de que o backend está ativo:
1. Abra um terminal na pasta do projeto.
2. Execute o comando:
   ```bash
   npm run server
   ```
   *(Ou utilize o arquivo invisível `start-hidden.vbs` na raiz).*

---

## 🛠️ Configurações por Cliente

### 1. Cursor Editor
Para dar ao Copilot/Chat do Cursor acesso ao seu cofre:
1. Abra o **Cursor**.
2. Vá em **Settings** (ícone de engrenagem) -> **Features** -> **MCP**.
3. Clique em **+ Add New MCP Server**.
4. Defina:
   - **Name**: `meu-obsidian`
   - **Type**: `command`
   - **Command**: `npx tsx c:/Users/Nailton/Desktop/Antigravity/Data5-Memory/server/mcp.ts`
5. Clique em **Save**. O indicador ficará verde indicando conexão ativa!

---

### 2. Claude Desktop
Para que a IA oficial da Anthropic leia suas notas:
1. Pressione `Win + R`, digite `%APPDATA%\Claude` e aperte Enter.
2. Crie ou edite o arquivo `claude_desktop_config.json`.
3. Insira a seguinte estrutura:
```json
{
  "mcpServers": {
    "meu-obsidian": {
      "command": "npx",
      "args": ["tsx", "c:/Users/Nailton/Desktop/Antigravity/Data5-Memory/server/mcp.ts"],
      "cwd": "c:/Users/Nailton/Desktop/Antigravity/Data5-Memory"
    }
  }
}
```
4. Salve e reinicie o Claude Desktop.

---

### 3. Integração com Script Python
Se você criar um agente autônomo local e quiser conectá-lo ao cofre:
```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="npx",
    args=["tsx", "c:/Users/Nailton/Desktop/Antigravity/Data5-Memory/server/mcp.ts"],
    cwd="c:/Users/Nailton/Desktop/Antigravity/Data5-Memory"
)

async def run():
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool("list_notes")
            print("Notas no Cofre:\n", result.content[0].text)

asyncio.run(run())
```
