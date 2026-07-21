import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  VAULT_DIR,
  scanVault,
  getRelativePathFromNode,
  resolveSafePath
} from './vault-utils.js';

// Model Context Protocol (MCP) Server Setup
const mcpServer = new Server(
  {
    name: 'obsidian-clone-vault',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register MCP Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_notes',
        description: 'Retorna a lista de todas as notas Markdown disponíveis no cofre.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_note',
        description: 'Lê o conteúdo de uma nota Markdown específica.',
        inputSchema: {
          type: 'object',
          properties: {
            noteName: { type: 'string', description: 'Nome da nota ou caminho relativo (ex: Welcome.md ou Projects/Project Alpha.md)' },
          },
          required: ['noteName'],
        },
      },
      {
        name: 'write_note',
        description: 'Cria ou sobrescreve uma nota Markdown com novo conteúdo.',
        inputSchema: {
          type: 'object',
          properties: {
            noteName: { type: 'string', description: 'Nome da nota ou caminho relativo (ex: Welcome.md ou Projects/Alpha.md)' },
            content: { type: 'string', description: 'Conteúdo em markdown a ser gravado' },
          },
          required: ['noteName', 'content'],
        },
      },
      {
        name: 'delete_note',
        description: 'Exclui permanentemente uma nota Markdown do cofre.',
        inputSchema: {
          type: 'object',
          properties: {
            noteName: { type: 'string', description: 'Nome da nota ou caminho relativo' },
          },
          required: ['noteName'],
        },
      },
      {
        name: 'search_notes',
        description: 'Procura por um termo ou palavra-chave no título e no conteúdo das notas.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'O termo de pesquisa' },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// Handle MCP Tool Calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const allNodes = await scanVault(VAULT_DIR);

  try {
    switch (name) {
      case 'list_notes': {
        const files = allNodes.filter(n => n.type === 'file');
        const listText = files.map(f => {
          const relativePath = getRelativePathFromNode(f.id, allNodes);
          return `- **${f.name.replace(/\.md$/, '')}** (${relativePath})`;
        }).join('\n');
        return {
          content: [{ type: 'text', text: listText || 'Nenhuma nota encontrada no cofre.' }],
        };
      }

      case 'read_note': {
        const rawNoteName = args?.noteName;
        if (typeof rawNoteName !== 'string') {
          throw new Error("Parâmetro 'noteName' deve ser uma string.");
        }
        const noteName = rawNoteName.trim();
        const cleanName = noteName.toLowerCase().endsWith('.md') ? noteName : `${noteName}.md`;
        
        const fileNode = allNodes.find(n => 
          n.type === 'file' && (
            n.name.toLowerCase() === cleanName.toLowerCase() ||
            getRelativePathFromNode(n.id, allNodes).toLowerCase() === cleanName.toLowerCase()
          )
        );

        if (!fileNode) {
          throw new Error(`Nota '${noteName}' não encontrada no cofre.`);
        }

        const relativePath = getRelativePathFromNode(fileNode.id, allNodes);
        const filePath = resolveSafePath(relativePath);
        const content = await fs.promises.readFile(filePath, 'utf8');

        return {
          content: [{ type: 'text', text: content || '' }],
        };
      }

      case 'write_note': {
        const rawNoteName = args?.noteName;
        const rawContent = args?.content;
        if (typeof rawNoteName !== 'string' || typeof rawContent !== 'string') {
          throw new Error("Parâmetros 'noteName' e 'content' são obrigatórios e devem ser strings.");
        }
        const noteName = rawNoteName.trim();
        const content = rawContent;
        const cleanName = noteName.toLowerCase().endsWith('.md') ? noteName : `${noteName}.md`;
        const filePath = resolveSafePath(cleanName);

        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, 'utf8');

        return {
          content: [{ type: 'text', text: `Nota '${noteName}' gravada com sucesso.` }],
        };
      }

      case 'delete_note': {
        const rawNoteName = args?.noteName;
        if (typeof rawNoteName !== 'string') {
          throw new Error("Parâmetro 'noteName' deve ser uma string.");
        }
        const noteName = rawNoteName.trim();
        const cleanName = noteName.toLowerCase().endsWith('.md') ? noteName : `${noteName}.md`;
        const filePath = resolveSafePath(cleanName);

        if (!fs.existsSync(filePath)) {
          throw new Error(`Nota '${noteName}' não encontrada no disco.`);
        }

        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
          throw new Error(`O caminho especificado '${noteName}' é um diretório. Exclusão permitida apenas para arquivos.`);
        }

        await fs.promises.unlink(filePath);
        return {
          content: [{ type: 'text', text: `Nota '${noteName}' excluída com sucesso.` }],
        };
      }

      case 'search_notes': {
        const rawQuery = args?.query;
        if (typeof rawQuery !== 'string') {
          throw new Error("Parâmetro 'query' deve ser uma string.");
        }
        const query = rawQuery.toLowerCase();
        const files = allNodes.filter(n => n.type === 'file');
        const results = files.filter(f => 
          f.name.toLowerCase().includes(query) || 
          (f.content && f.content.toLowerCase().includes(query))
        );

        const listText = results.map(f => {
          const relativePath = getRelativePathFromNode(f.id, allNodes);
          return `- **${f.name.replace(/\.md$/, '')}** (${relativePath})`;
        }).join('\n');

        return {
          content: [{ type: 'text', text: listText || 'Nenhum resultado correspondente no cofre.' }],
        };
      }

      default:
        throw new Error(`Ferramenta MCP desconhecida: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Erro ao executar ferramenta ${name}: ${err.message}` }],
    };
  }
});

async function runMcp() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('Obsidian MCP server connected via stdio');
}

runMcp().catch((err) => {
  console.error('Failed to run MCP Server:', err);
});
