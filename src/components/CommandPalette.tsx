import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { FileText, Search, Hash, Clock } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { nodes, openFileInTab } = useVault();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const files = useMemo(() => nodes.filter(n => n.type === 'file'), [nodes]);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      // Show recently opened (first 20 files when empty)
      return files.slice(0, 20);
    }
    const q = search.toLowerCase();
    return files.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.content && f.content.toLowerCase().includes(q))
    );
  }, [files, search]);

  // Extract context snippet around match
  const getSnippet = (content: string, query: string): string | null => {
    if (!query || !content) return null;
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return null;
    const start = Math.max(0, idx - 15);
    const end = Math.min(content.length, idx + query.length + 30);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet += '...';
    return snippet;
  };

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          openFileInTab(filtered[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            className="text-muted"
            style={{ position: 'absolute', left: '16px', top: '16px', zIndex: 1 }}
          />
          <input
            ref={inputRef}
            type="text"
            className="modal-search-input"
            style={{ paddingLeft: '48px' }}
            placeholder="Buscar notas pelo título ou conteúdo..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="modal-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }} className="text-muted">
              Nenhuma nota encontrada.
            </div>
          ) : (
            filtered.map((file, idx) => {
              const snippet = search.trim()
                ? getSnippet(file.content || '', search)
                : null;
              return (
                <div
                  key={file.id}
                  className={`modal-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    openFileInTab(file.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={14} className="text-muted" style={{ flexShrink: 0 }} />
                    <span className="modal-item-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name.replace('.md', '')}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginLeft: 'auto', paddingLeft: '8px', flexShrink: 0
                  }}>
                    {snippet && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {snippet}
                      </span>
                    )}
                    {file.content?.toLowerCase().includes(search.toLowerCase()) && (
                      <span title="Correspondência no conteúdo">
                        <Hash size={10} className="text-accent" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {!search.trim() && (
          <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} /> Notas recentes
          </div>
        )}
      </div>
    </div>
  );
};
