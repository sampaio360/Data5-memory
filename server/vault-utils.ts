import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup vault path
export const VAULT_DIR = path.resolve(__dirname, '..', 'vault');

// Ensure vault directory exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

export interface ServerVaultNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId: string | null;
}

/**
 * Validates that a requested path resides inside VAULT_DIR to prevent path traversal vulnerability.
 * Returns the resolved absolute path.
 */
export function resolveSafePath(relativePath: string): string {
  const resolved = path.resolve(VAULT_DIR, relativePath);
  if (!resolved.startsWith(VAULT_DIR)) {
    throw new Error('Acesso negado: Tentativa de Path Traversal detectada fora do diretório do vault.');
  }
  return resolved;
}

/**
 * Scan vault directory recursively and asynchronously to avoid blocking the event loop.
 */
export async function scanVault(dir: string = VAULT_DIR, parentId: string | null = null, allNodes: ServerVaultNode[] = []): Promise<ServerVaultNode[]> {
  const items = await fs.promises.readdir(dir);
  
  await Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(dir, item);
      const stat = await fs.promises.stat(fullPath);
      const relativePath = path.relative(VAULT_DIR, fullPath).replace(/\\/g, '/');
      const id = Buffer.from(relativePath).toString('base64url'); // Safe base64 without padding problems

      if (stat.isDirectory()) {
        allNodes.push({
          id,
          name: item,
          type: 'folder',
          parentId
        });
        await scanVault(fullPath, id, allNodes);
      } else if (stat.isFile() && item.endsWith('.md')) {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        allNodes.push({
          id,
          name: item,
          type: 'file',
          content,
          parentId
        });
      }
    })
  );

  return allNodes;
}

export function getRelativePathFromNode(id: string, allNodes: ServerVaultNode[]): string {
  const node = allNodes.find(n => n.id === id);
  if (!node) return '';
  if (node.parentId) {
    return path.join(getRelativePathFromNode(node.parentId, allNodes), node.name);
  }
  return node.name;
}
