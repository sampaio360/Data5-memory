import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase client creators
function getSupabaseClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

function getAuthToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Sync engine: synchronizes local vault folder with Supabase database
async function syncVaultWithSupabase(token: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const supabase = getSupabaseClient(token);

  try {
    // 1. Scan local files
    const localNodes = await scanVault(VAULT_DIR);
    
    // 2. Fetch remote files
    const { data: remoteNodes, error } = await supabase
      .from('notes')
      .select('*');

    if (error) {
      console.error('Error fetching notes from Supabase during sync:', error);
      return;
    }

    const remoteMap = new Map<string, any>(remoteNodes.map(node => [node.id, node]));
    const localMap = new Map<string, any>(localNodes.map(node => [node.id, node]));

    // 3. Process remote nodes (Download or update locally)
    for (const remote of remoteNodes) {
      const local = localMap.get(remote.id);

      // Handle soft delete
      if (remote.deleted) {
        if (local) {
          const relativePath = getRelativePathFromNode(remote.id, localNodes);
          const targetPath = resolveSafePath(relativePath);
          if (fs.existsSync(targetPath)) {
            await fs.promises.rm(targetPath, { recursive: true, force: true });
          }
        }
        continue;
      }

      // Reconstruct folder path for remote nodes
      const relativePath = getRelativePathFromNode(remote.id, remoteNodes);
      if (!relativePath) continue;
      
      const targetPath = resolveSafePath(relativePath);

      if (!local) {
        // Doesn't exist locally: create it
        if (remote.type === 'folder') {
          await fs.promises.mkdir(targetPath, { recursive: true });
        } else {
          await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.promises.writeFile(targetPath, remote.content || '', 'utf8');
        }
        // Force timestamp matching
        const time = new Date(remote.updated_at);
        await fs.promises.utimes(targetPath, time, time);
      } else {
        // Exists in both: compare modified times
        const stat = await fs.promises.stat(targetPath);
        const localTime = stat.mtime.getTime();
        const remoteTime = new Date(remote.updated_at).getTime();

        if (remoteTime > localTime + 2000) { // allow 2 seconds threshold
          // Cloud is newer: update local file
          if (remote.type === 'file') {
            await fs.promises.writeFile(targetPath, remote.content || '', 'utf8');
          }
          const time = new Date(remote.updated_at);
          await fs.promises.utimes(targetPath, time, time);
        } else if (localTime > remoteTime + 2000) {
          // Local is newer: update cloud
          await supabase.from('notes').upsert({
            id: local.id,
            name: local.name,
            content: local.content || '',
            type: local.type,
            parent_id: local.parentId,
            updated_at: stat.mtime.toISOString(),
            deleted: false
          });
        }
      }
    }

    // 4. Process local nodes (Upload new ones to cloud)
    for (const local of localNodes) {
      const remote = remoteMap.get(local.id);
      if (!remote) {
        const relativePath = getRelativePathFromNode(local.id, localNodes);
        const targetPath = resolveSafePath(relativePath);
        const stat = await fs.promises.stat(targetPath);

        await supabase.from('notes').upsert({
          id: local.id,
          name: local.name,
          content: local.content || '',
          type: local.type,
          parent_id: local.parentId,
          updated_at: stat.mtime.toISOString(),
          deleted: false
        });
      }
    }
  } catch (syncErr) {
    console.error('Error executing sync process:', syncErr);
  }
}

// REST endpoints for React frontend
app.get('/api/notes', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (token) {
      // Synchronize in background before returning local state
      await syncVaultWithSupabase(token);
    }
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

    // Sync to Supabase in background if token exists
    const token = getAuthToken(req);
    if (token) {
      const supabase = getSupabaseClient(token);
      const stat = await fs.promises.stat(itemPath);
      const id = Buffer.from(relativeTarget.replace(/\\/g, '/')).toString('base64url');
      
      await supabase.from('notes').upsert({
        id,
        name: type === 'file' && !name.endsWith('.md') ? `${name}.md` : name,
        content: type === 'file' ? `# ${name.replace(/\.md$/, '')}\n\nStart writing here...` : null,
        type,
        parent_id: parentId,
        updated_at: stat.mtime.toISOString(),
        deleted: false
      });
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
    let updatedName = node.name;
    if (name !== undefined) {
      updatedName = node.type === 'file' && !name.endsWith('.md') ? `${name}.md` : name;
      const parentPath = node.parentId ? getRelativePathFromNode(node.parentId, allNodes) : '';
      const relativeNewPath = path.join(parentPath, updatedName);
      targetPath = resolveSafePath(relativeNewPath);
      await fs.promises.rename(currentPath, targetPath);
    }

    // Handle move to different folder (parentId change)
    let finalParentId = node.parentId;
    if (parentId !== undefined && parentId !== node.parentId) {
      finalParentId = parentId;
      const newParentPath = parentId ? getRelativePathFromNode(parentId, allNodes) : '';
      const relativeNewPath = path.join(newParentPath, path.basename(targetPath));
      const newPath = resolveSafePath(relativeNewPath);

      // Ensure target directory exists
      await fs.promises.mkdir(path.dirname(newPath), { recursive: true });
      await fs.promises.rename(targetPath, newPath);
      targetPath = newPath;
    }

    // Sync to Supabase in background if token exists
    const token = getAuthToken(req);
    if (token) {
      const supabase = getSupabaseClient(token);
      const stat = await fs.promises.stat(targetPath);
      
      await supabase.from('notes').upsert({
        id,
        name: updatedName,
        content: content !== undefined ? content : (node.type === 'file' ? await fs.promises.readFile(targetPath, 'utf8') : null),
        type: node.type,
        parent_id: finalParentId,
        updated_at: stat.mtime.toISOString(),
        deleted: false
      });
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

    // Sync to Supabase in background if token exists
    const token = getAuthToken(req);
    if (token) {
      const supabase = getSupabaseClient(token);
      await supabase.from('notes').upsert({
        id,
        name: node.name,
        type: node.type,
        parent_id: node.parentId,
        updated_at: new Date().toISOString(),
        deleted: true
      });
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

const PORT = process.env.PORT || 3001;
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

