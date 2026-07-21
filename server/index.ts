import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {
  VAULT_DIR,
  scanVault,
  getRelativePathFromNode,
  resolveSafePath
} from './vault-utils.js';

// Express API Server Setup
const app = express();

// Allow CORS from any origin for local dev
app.use(cors());
app.use(express.json());

// REST endpoints for React frontend
app.get('/api/notes', async (req, res) => {
  try {
    const nodes = await scanVault(VAULT_DIR);
    res.json(nodes);
  } catch (err: any) {
    console.error('Error scanning vault:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { name, type, parentId } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const allNodes = await scanVault(VAULT_DIR);
    let parentPath = '';
    if (parentId) {
      parentPath = getRelativePathFromNode(parentId, allNodes);
    }

    const relativeTarget = path.join(parentPath, type === 'file' && !name.endsWith('.md') ? `${name}.md` : name);
    const itemPath = resolveSafePath(relativeTarget);

    if (type === 'folder') {
      await fs.promises.mkdir(itemPath, { recursive: true });
    } else {
      await fs.promises.mkdir(path.dirname(itemPath), { recursive: true });
      await fs.promises.writeFile(itemPath, `# ${name.replace(/\.md$/, '')}\n\nStart writing here...`, 'utf8');
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error creating node:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, name, parentId } = req.body;
    const allNodes = await scanVault(VAULT_DIR);
    const node = allNodes.find(n => n.id === id);

    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const relativePath = getRelativePathFromNode(id, allNodes);
    const currentPath = resolveSafePath(relativePath);

    // Handle content update
    if (content !== undefined && node.type === 'file') {
      await fs.promises.writeFile(currentPath, content, 'utf8');
    }

    // Handle name update
    let targetPath = currentPath;
    if (name !== undefined) {
      const cleanName = node.type === 'file' && !name.endsWith('.md') ? `${name}.md` : name;
      const parentPath = node.parentId ? getRelativePathFromNode(node.parentId, allNodes) : '';
      const relativeNewPath = path.join(parentPath, cleanName);
      targetPath = resolveSafePath(relativeNewPath);
      await fs.promises.rename(currentPath, targetPath);
    }

    // Handle move to different folder (parentId change)
    if (parentId !== undefined && parentId !== node.parentId) {
      const newParentPath = parentId ? getRelativePathFromNode(parentId, allNodes) : '';
      const relativeNewPath = path.join(newParentPath, path.basename(targetPath));
      const newPath = resolveSafePath(relativeNewPath);

      // Ensure target directory exists
      await fs.promises.mkdir(path.dirname(newPath), { recursive: true });
      await fs.promises.rename(targetPath, newPath);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating node:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allNodes = await scanVault(VAULT_DIR);
    const node = allNodes.find(n => n.id === id);

    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const relativePath = getRelativePathFromNode(id, allNodes);
    const targetPath = resolveSafePath(relativePath);

    if (fs.existsSync(targetPath)) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting node:', err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy routes for local Ollama server (running on port 11434)
app.get('/api/ai/models', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }
    const data: any = await response.json();
    const models = data.models ? data.models.map((m: any) => m.name) : [];
    res.json({ models });
  } catch (err: any) {
    console.error('Error fetching models from Ollama:', err.message);
    res.status(503).json({ error: 'Ollama offline' });
  }
});

app.post('/api/ai/complete', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    if (!model || !prompt) {
      res.status(400).json({ error: 'Model and Prompt are required' });
      return;
    }

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${errorText}`);
    }

    const data: any = await response.json();
    res.json({ response: data.response });
  } catch (err: any) {
    console.error('Error in Ollama completion:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
const serverInstance = app.listen(PORT, () => {
  console.log(`Express API server running on port ${PORT}`);
});

serverInstance.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERRO CRÍTICO] A porta ${PORT} está ocupada por outro processo.`);
    console.error(`Por favor execute 'stop-servers.bat' no Windows para liberar a porta antes de iniciar.\n`);
  } else {
    console.error('Erro ao iniciar servidor Express:', err);
  }
  process.exit(1);
});
