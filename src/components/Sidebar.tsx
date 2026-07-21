import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import type { VaultNode } from '../context/VaultContext';
import { Folder, FileText, ChevronDown, ChevronRight, Plus, Trash2, Edit, Search, HardDrive, Settings } from 'lucide-react';

export const Sidebar: React.FC<{ onOpenCommandPalette: () => void; onOpenSettings: () => void }> = ({ onOpenCommandPalette, onOpenSettings }) => {
  const { nodes, activeFileId, openFileInTab, createNode, renameNode, deleteNode, backendStatus } = useVault();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'projects': true });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newNodeParentId, setNewNodeParentId] = useState<string | null>(null);
  const [newNodeType, setNewNodeType] = useState<'file' | 'folder' | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (node: VaultNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditName(node.name.replace(/\.md$/, ''));
  };

  const handleSaveRename = (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    if (editName.trim()) {
      renameNode(id, editName.trim());
    }
    setEditingNodeId(null);
    setIsSaving(false);
  };

  const handleCreateNode = () => {
    if (isSaving) return;
    setIsSaving(true);
    if (newNodeName.trim() && newNodeType) {
      createNode(newNodeName.trim(), newNodeType, newNodeParentId);
      if (newNodeParentId) {
        setExpandedFolders(prev => ({ ...prev, [newNodeParentId]: true }));
      }
    }
    setNewNodeType(null);
    setNewNodeName('');
    setIsSaving(false);
  };

  const renderTree = (parentId: string | null, depth = 0) => {
    const currentNodes = nodes.filter(n => n.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return (
      <div className="tree-container">
        {newNodeType !== null && newNodeParentId === parentId && (
          <div className="tree-node" style={{ paddingLeft: `${depth * 16 + 12}px` }}>
            {newNodeType === 'folder' ? <Folder size={16} /> : <FileText size={16} />}
            <input
              type="text"
              autoFocus
              className="tree-input"
              value={newNodeName}
              placeholder={newNodeType === 'folder' ? 'Nova pasta...' : 'Nova nota...'}
              onChange={e => setNewNodeName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateNode();
                if (e.key === 'Escape') {
                  setNewNodeType(null);
                  setNewNodeName('');
                }
              }}
              onBlur={handleCreateNode}
            />
          </div>
        )}

        {currentNodes.map(node => {
          const isFolder = node.type === 'folder';
          const isExpanded = expandedFolders[node.id];
          const isActive = activeFileId === node.id;

          return (
            <div key={node.id}>
              {editingNodeId === node.id ? (
                <div className="tree-node" style={{ paddingLeft: `${depth * 16 + 12}px` }}>
                  {isFolder ? <Folder size={16} /> : <FileText size={16} />}
                  <input
                    type="text"
                    autoFocus
                    className="tree-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename(node.id);
                      if (e.key === 'Escape') setEditingNodeId(null);
                    }}
                    onBlur={() => handleSaveRename(node.id)}
                  />
                </div>
              ) : (
                <div
                  className={`tree-node ${isActive ? 'active' : ''}`}
                  style={{ paddingLeft: `${depth * 16 + 12}px` }}
                  onClick={() => isFolder ? toggleFolder(node.id) : openFileInTab(node.id)}
                  aria-expanded={isFolder ? isExpanded : undefined}
                >
                  {isFolder ? (
                    <>
                      {isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                      <Folder size={16} className="text-accent" />
                    </>
                  ) : (
                    <FileText size={16} className="text-muted" />
                  )}
                  <span className="truncate">{node.name.replace(/\.md$/, '')}</span>

                  <div className="tree-node-actions">
                    {isFolder && (
                      <button
                        className="icon-btn"
                        title="Nova Nota"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewNodeParentId(node.id);
                          setNewNodeType('file');
                          setExpandedFolders(prev => ({ ...prev, [node.id]: true }));
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      title="Renomear"
                      onClick={(e) => handleStartRename(node, e)}
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      className="icon-btn text-danger-hover"
                      title="Excluir"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nodeTypeLabel = isFolder ? 'pasta' : 'nota';
                        const nameLabel = isFolder ? node.name : node.name.replace(/\.md$/, '');
                        const confirmMsg = isFolder
                          ? `Excluir a ${nodeTypeLabel} "${nameLabel}" e tudo que está dentro dela permanentemente?`
                          : `Excluir a ${nodeTypeLabel} "${nameLabel}" permanentemente?`;
                        if (window.confirm(confirmMsg)) {
                          deleteNode(node.id);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {isFolder && isExpanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <HardDrive size={16} className="text-accent animate-pulse-slow" />
          <span>VAULT</span>
          {backendStatus === 'offline' && (
            <span className="badge-offline" title="Servidor offline. Usando armazenamento local.">LOCAL</span>
          )}
        </div>
        <div className="sidebar-actions">
          <button
            className="icon-btn"
            title="Procurar (Ctrl+P)"
            onClick={onOpenCommandPalette}
          >
            <Search size={16} />
          </button>
          <button
            className="icon-btn"
            title="Nova Nota na Raiz"
            onClick={() => {
              setNewNodeParentId(null);
              setNewNodeType('file');
            }}
          >
            <Plus size={16} />
          </button>
          <button
            className="icon-btn"
            title="Nova Pasta na Raiz"
            onClick={() => {
              setNewNodeParentId(null);
              setNewNodeType('folder');
            }}
          >
            <Folder size={16} />
          </button>
          <button
            className="icon-btn"
            title="Configurações (Ctrl+,)"
            onClick={onOpenSettings}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        {renderTree(null)}
      </div>
    </aside>
  );
};
