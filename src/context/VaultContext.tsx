import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface VaultNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId: string | null;
}

export interface LinkConnection {
  source: string; // File ID
  target: string; // File ID or target name if unresolved
  resolved: boolean;
}

interface VaultContextType {
  nodes: VaultNode[];
  activeFileId: string | null;
  openTabs: string[];
  isUsingBackend: boolean;
  backendStatus: 'connected' | 'offline';
  setActiveFileId: (id: string | null) => void;
  openFileInTab: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  createNode: (name: string, type: 'file' | 'folder', parentId: string | null) => Promise<VaultNode>;
  updateFileContent: (id: string, content: string) => void;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  getBacklinks: (id: string) => VaultNode[];
  getOutlinks: (id: string) => string[];
  getResolvedLinks: () => LinkConnection[];
  getNodePath: (id: string) => string;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const initialNodes: VaultNode[] = [
  { id: 'welcome', name: 'Welcome.md', type: 'file', parentId: null, content: '# Welcome to Obsidian Clone\n\nThis is a faithful clone of Obsidian. You can edit Markdown text on the left and see the preview or interactive graphs.\n\n## Core Features\n- **File System**: Create nested notes and folders in the left sidebar.\n- **Bidirectional Links**: Link notes using `[[Double Brackets]]` (like [[Second Note]] or [[Projects/Project Alpha]]).\n- **Interactive Graph View**: Click on the graph button in the top right to visualize notes connectivity.\n- **Command Palette**: Press `Ctrl+P` (or `Cmd+P`) to search files instantly.\n\nEnjoy editing!' },
  { id: 'second-note', name: 'Second Note.md', type: 'file', parentId: null, content: '# Second Note\n\nThis note is linked from [[Welcome]].\n\nYou can also link back to [[Welcome]] or create a link to a non-existent note like [[My Future Dream]] (unresolved links appear differently in the graph).' },
  { id: 'projects', name: 'Projects', type: 'folder', parentId: null },
  { id: 'project-alpha', name: 'Project Alpha.md', type: 'file', parentId: 'projects', content: '# Project Alpha\n\nStatus: In Progress\n\nPart of [[Welcome]] demonstration. We are collaborating with [[Second Note]] to build a fully agentic AI engine.' }
];

const API_BASE = 'http://localhost:3001/api';

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<VaultNode[]>(initialNodes);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [isUsingBackend, setIsUsingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline'>('offline');
  const saveTimeoutsRef = useRef<Record<string, number>>({});

  // Initial Sync from Backend or LocalStorage
  useEffect(() => {
    async function initVault() {
      try {
        const res = await fetch(`${API_BASE}/notes`);
        if (res.ok) {
          const serverNodes = await res.json();
          setNodes(serverNodes);
          setIsUsingBackend(true);
          setBackendStatus('connected');
          
          const files = serverNodes.filter((n: any) => n.type === 'file');
          if (files.length > 0) {
            const savedActive = localStorage.getItem('obsidian_active_file');
            const activeExists = files.some((f: any) => f.id === savedActive);
            const activeId = activeExists ? savedActive : files[0].id;
            
            setActiveFileId(activeId);
            const savedTabs = localStorage.getItem('obsidian_open_tabs');
            let parsedTabs = savedTabs ? JSON.parse(savedTabs) : [];
            parsedTabs = parsedTabs.filter((tId: string) => serverNodes.some((n: any) => n.id === tId && n.type === 'file'));
            if (parsedTabs.length === 0) parsedTabs = [activeId];
            setOpenTabs(parsedTabs);
          }
          return;
        }
      } catch (err) {
        console.warn('Backend API server not found. Falling back to local storage.', err);
      }

      // Fallback to LocalStorage
      const saved = localStorage.getItem('obsidian_nodes');
      const localNodes = saved ? JSON.parse(saved) : initialNodes;
      setNodes(localNodes);
      setIsUsingBackend(false);
      setBackendStatus('offline');

      const savedActive = localStorage.getItem('obsidian_active_file');
      const files = localNodes.filter((n: any) => n.type === 'file');
      const activeId = files.some((f: any) => f.id === savedActive) ? savedActive : (files[0]?.id || null);
      setActiveFileId(activeId);

      const savedTabs = localStorage.getItem('obsidian_open_tabs');
      let parsedTabs = savedTabs ? JSON.parse(savedTabs) : [];
      parsedTabs = parsedTabs.filter((tId: string) => localNodes.some((n: any) => n.id === tId && n.type === 'file'));
      if (parsedTabs.length === 0 && activeId) parsedTabs = [activeId];
      setOpenTabs(parsedTabs);
    }
    
    initVault();
  }, []);

  // Save to LocalStorage (as backup or offline mode)
  useEffect(() => {
    if (!isUsingBackend) {
      localStorage.setItem('obsidian_nodes', JSON.stringify(nodes));
    }
  }, [nodes, isUsingBackend]);

  useEffect(() => {
    if (activeFileId) {
      localStorage.setItem('obsidian_active_file', activeFileId);
    } else {
      localStorage.removeItem('obsidian_active_file');
    }
  }, [activeFileId]);

  useEffect(() => {
    localStorage.setItem('obsidian_open_tabs', JSON.stringify(openTabs));
  }, [openTabs]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutsRef.current).forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  const openFileInTab = (id: string) => {
    if (!openTabs.includes(id)) {
      setOpenTabs([...openTabs, id]);
    }
    setActiveFileId(id);
  };

  const closeTab = (id: string) => {
    const newTabs = openTabs.filter(t => t !== id);
    setOpenTabs(newTabs);
    if (activeFileId === id) {
      setActiveFileId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const reorderTabs = (fromIndex: number, toIndex: number) => {
    setOpenTabs(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const createNode = async (name: string, type: 'file' | 'folder', parentId: string | null): Promise<VaultNode> => {
    const sanitizedName = type === 'file' && !name.endsWith('.md') ? `${name}.md` : name;
    const tempId = Math.random().toString(36).substring(2, 11);
    const newNode: VaultNode = {
      id: tempId,
      name: sanitizedName,
      type,
      parentId,
      ...(type === 'file' ? { content: `# ${sanitizedName.replace(/\.md$/, '')}\n\nStart writing here...` } : {})
    };

    // UI optimistic update
    setNodes(prev => [...prev, newNode]);
    if (type === 'file') {
      openFileInTab(tempId);
    }

    if (isUsingBackend) {
      try {
        const res = await fetch(`${API_BASE}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: sanitizedName, type, parentId })
        });
        
        if (!res.ok) throw new Error('Create failed');
        
        // Reload nodes from server to sync true IDs
        const getRes = await fetch(`${API_BASE}/notes`);
        if (getRes.ok) {
          const freshNodes = await getRes.json();
          
          // Merge and preserve any locally typed content in the new file before syncing IDs
          setNodes(prev => {
            return freshNodes.map((fn: any) => {
              const localMatch = prev.find(pn => 
                pn.name === fn.name && 
                pn.parentId === fn.parentId && 
                pn.type === fn.type
              );
              if (localMatch && fn.type === 'file') {
                return { ...fn, content: localMatch.content ?? fn.content };
              }
              return fn;
            });
          });

          // Find matching newly created node to activate
          const freshNode = freshNodes.find((n: any) => 
            n.name === sanitizedName && 
            n.parentId === parentId && 
            n.type === type
          );
          if (freshNode && type === 'file') {
            openFileInTab(freshNode.id);
            // Replace temp tab with real tab
            setOpenTabs(prev => prev.map(t => t === tempId ? freshNode.id : t));
          }
        }
      } catch (err) {
        console.error('Error syncing create to backend:', err);
        setBackendStatus('offline');
        setIsUsingBackend(false);
      }
    }

    return newNode;
  };

  const updateFileContent = (id: string, content: string) => {
    // Update React state instantly
    setNodes(prev => prev.map(node => node.id === id ? { ...node, content } : node));

    // Clear active timeout
    if (saveTimeoutsRef.current[id]) {
      clearTimeout(saveTimeoutsRef.current[id]);
    }

    if (isUsingBackend) {
      saveTimeoutsRef.current[id] = window.setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          });
          if (!res.ok) {
            throw new Error('Save failed');
          }
        } catch (err) {
          console.error('Error syncing update to backend:', err);
          setBackendStatus('offline');
          setIsUsingBackend(false);
        }
      }, 400); // 400ms debounce
    }
  };

  const renameNode = async (id: string, newName: string) => {
    let updatedName = newName;
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        if (node.type === 'file' && !newName.endsWith('.md')) {
          updatedName = `${newName}.md`;
        }
        return { ...node, name: updatedName };
      }
      return node;
    }));

    if (isUsingBackend) {
      try {
        const res = await fetch(`${API_BASE}/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: updatedName })
        });
        if (res.ok) {
          const freshRes = await fetch(`${API_BASE}/notes`);
          if (freshRes.ok) {
            setNodes(await freshRes.json());
          }
        }
      } catch (err) {
        console.error('Error syncing rename to backend:', err);
      }
    }
  };

  const deleteNode = async (id: string) => {
    const getChildIds = (parentId: string): string[] => {
      const children = nodes.filter(n => n.parentId === parentId);
      return [...children.map(c => c.id), ...children.flatMap(c => getChildIds(c.id))];
    };

    const idsToDelete = [id, ...(nodes.find(n => n.id === id)?.type === 'folder' ? getChildIds(id) : [])];

    setNodes(prev => prev.filter(n => !idsToDelete.includes(n.id)));
    setOpenTabs(prev => {
      const filtered = prev.filter(tabId => !idsToDelete.includes(tabId));
      return filtered;
    });

    if (activeFileId && idsToDelete.includes(activeFileId)) {
      setActiveFileId(_prevActive => {
        const remainingTabs = openTabs.filter(tabId => !idsToDelete.includes(tabId));
        return remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null;
      });
    }

    if (isUsingBackend) {
      try {
        await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Error syncing delete to backend:', err);
      }
    }
  };

  const getNodePath = (id: string): string => {
    const node = nodes.find(n => n.id === id);
    if (!node) return '';
    if (node.parentId) {
      return `${getNodePath(node.parentId)}/${node.name}`;
    }
    return node.name;
  };

  const getOutlinks = (id: string): string[] => {
    const node = nodes.find(n => n.id === id);
    if (!node || node.type !== 'file' || !node.content) return [];
    
    const regex = /\[\[([^\]]+)\]\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(node.content)) !== null) {
      matches.push(match[1].trim());
    }
    return Array.from(new Set(matches));
  };

  const getResolvedLinks = () => {
    const connections: LinkConnection[] = [];
    const files = nodes.filter(n => n.type === 'file');

    files.forEach(file => {
      const outlinks = getOutlinks(file.id);
      outlinks.forEach(outlink => {
        const cleanOutlink = outlink.endsWith('.md') ? outlink : `${outlink}.md`;
        const targetNode = files.find(n => 
          n.name.toLowerCase() === cleanOutlink.toLowerCase() || 
          n.name.replace(/\.md$/, '').toLowerCase() === outlink.toLowerCase() ||
          getNodePath(n.id).toLowerCase() === cleanOutlink.toLowerCase()
        );

        connections.push({
          source: file.id,
          target: targetNode ? targetNode.id : outlink,
          resolved: !!targetNode
        });
      });
    });

    return connections;
  };

  const getBacklinks = (id: string): VaultNode[] => {
    const targetNode = nodes.find(n => n.id === id);
    if (!targetNode || targetNode.type !== 'file') return [];

    const targetNameClean = targetNode.name.replace(/\.md$/, '').toLowerCase();
    const targetFullName = targetNode.name.toLowerCase();

    return nodes.filter(n => {
      if (n.type !== 'file' || n.id === id) return false;
      const outlinks = getOutlinks(n.id);
      return outlinks.some(link =>
        link.toLowerCase() === targetNameClean ||
        link.toLowerCase() === targetFullName ||
        link.toLowerCase() === getNodePath(id).toLowerCase() ||
        link.toLowerCase() === getNodePath(id).replace(/\.md$/, '').toLowerCase()
      );
    });
  };

  /*
  const moveNode = async (id: string, newParentId: string | null) => {
    // Update React state instantly
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, parentId: newParentId } : node
    ));

    if (isUsingBackend) {
      try {
        // Try to move using the new endpoint
        const res = await fetch(`${API_BASE}/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: newParentId })
        });

        if (!res.ok) {
          throw new Error('Move failed');
        }

        // Reload nodes from server to ensure consistency
        const freshRes = await fetch(`${API_BASE}/notes`);
        if (freshRes.ok) {
          const freshNodes = await freshRes.json();
          setNodes(freshNodes);
        }
      } catch (err) {
        console.error('Error syncing move to backend:', err);
        setBackendStatus('offline');
        setIsUsingBackend(false);
      }
    }
  };
  */

  return (
    <VaultContext.Provider value={{
      nodes,
      activeFileId,
      openTabs,
      isUsingBackend,
      backendStatus,
      setActiveFileId,
      openFileInTab,
      closeTab,
      reorderTabs,
      createNode,
      updateFileContent,
      renameNode,
      deleteNode,
      getBacklinks,
      getOutlinks,
      getResolvedLinks,
      getNodePath
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within VaultProvider');
  return context;
};
