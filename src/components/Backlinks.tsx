import React from 'react';
import { useVault } from '../context/VaultContext';
import { Link, Link2, AlertCircle } from 'lucide-react';

export const Backlinks: React.FC = () => {
  const { activeFileId, nodes, getBacklinks, getOutlinks, openFileInTab } = useVault();

  const activeNode = nodes.find(n => n.id === activeFileId);
  
  if (!activeNode || activeNode.type !== 'file') {
    return (
      <aside className="right-sidebar">
        <div className="right-sidebar-header">
          <span className="sidebar-section-title">Metadados</span>
        </div>
        <div className="right-sidebar-content">
          <div className="empty-state" style={{ height: 'auto', padding: '12px' }}>
            <AlertCircle size={24} className="text-muted" />
            <p style={{ fontSize: '12px' }}>Sem nota selecionada</p>
          </div>
        </div>
      </aside>
    );
  }

  const backlinks = getBacklinks(activeNode.id);
  const outlinks = getOutlinks(activeNode.id);

  return (
    <aside className="right-sidebar">
      <div className="right-sidebar-header">
        <div className="sidebar-title">
          <Link size={14} className="text-accent" />
          <span>VÍNCULOS</span>
        </div>
      </div>
      <div className="right-sidebar-content">
        {/* Backlinks */}
        <div className="sidebar-section-title">Backlinks ({backlinks.length})</div>
        {backlinks.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '20px' }}>
            Nenhuma nota linka para esta.
          </p>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {backlinks.map(node => (
              <div
                key={node.id}
                className="backlink-item"
                onClick={() => openFileInTab(node.id)}
              >
                <div style={{ fontWeight: 500 }}>{node.name.replace('.md', '')}</div>
                <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.content?.slice(0, 60)}...
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outlinks */}
        <div className="sidebar-section-title">Links de Saída ({outlinks.length})</div>
        {outlinks.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '12px' }}>
            Nenhum link nesta nota.
          </p>
        ) : (
          <div>
            {outlinks.map((linkName, idx) => {
              // Find matching node ID to see if it is resolved
              const cleanLink = linkName.endsWith('.md') ? linkName : `${linkName}.md`;
              const targetNode = nodes.find(n => 
                n.type === 'file' && (
                  n.name.toLowerCase() === cleanLink.toLowerCase() ||
                  n.name.replace('.md', '').toLowerCase() === linkName.toLowerCase()
                )
              );

              return (
                <div
                  key={idx}
                  className="backlink-item"
                  onClick={() => targetNode && openFileInTab(targetNode.id)}
                  style={{ opacity: targetNode ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Link2 size={12} className={targetNode ? 'text-accent' : ''} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{linkName}</div>
                    <div className="text-muted" style={{ fontSize: '10px' }}>
                      {targetNode ? 'Resolvido' : 'Não criado (Clique para criar)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
