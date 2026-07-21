import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVault } from '../context/VaultContext';
import { FileText, Eye, Edit3, Columns, X, Network, Sparkles, Cpu, Send, Check, AlertCircle, Copy, Download, Link, Hash } from 'lucide-react';

interface EditorProps {
  onToggleGraph: () => void;
  showGraph: boolean;
}

export const Editor: React.FC<EditorProps> = ({ onToggleGraph, showGraph }) => {
  const {
    nodes,
    activeFileId,
    openTabs,
    setActiveFileId,
    closeTab,
    reorderTabs,
    updateFileContent,
    createNode,
    getNodePath
  } = useVault();

  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const activeNode = nodes.find(n => n.id === activeFileId);

  // Sync cursor/textarea content
  const [content, setContent] = useState('');

  // AI Assistant States
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [promptText, setPromptText] = useState('');
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  // Wiki-link autocomplete state
  const [showLinkAutocomplete, setShowLinkAutocomplete] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [linkAutocompletePos, setLinkAutocompletePos] = useState({ top: 0, left: 0 });
  const [linkSelectedIndex, setLinkSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Tab drag & drop state
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // Tag search
  const [tagSearchQuery, setTagSearchQuery] = useState<string | null>(null);
  const [showTagSearch, setShowTagSearch] = useState(false);

  const onSearchTag = useCallback((tagName: string) => {
    setTagSearchQuery(tagName);
    setShowTagSearch(true);
  }, []);

  const fileNodes = nodes.filter(n => n.type === 'file');

  const tagFilteredFiles = tagSearchQuery
    ? fileNodes.filter(f =>
        f.content?.toLowerCase().includes(`#${tagSearchQuery.toLowerCase()}`) ||
        f.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
      )
    : [];

  const linkSuggestions = fileNodes.filter(f =>
    f.name.replace(/\.md$/, '').toLowerCase().includes(linkQuery.toLowerCase())
  ).slice(0, 20);

  const applyLinkSuggestion = useCallback((withAlias?: boolean) => {
    if (!showLinkAutocomplete || linkSuggestions.length === 0) return;
    const selected = linkSuggestions[linkSelectedIndex];
    if (!selected) return;
    const noteName = selected.name.replace(/\.md$/, '');
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBefore = content.slice(0, cursorPos);
    const lastOpen = textBefore.lastIndexOf('[[');
    if (lastOpen === -1) return;
    const beforeLink = content.slice(0, lastOpen);
    const afterCursor = content.slice(cursorPos);
    // If withAlias, insert [[NoteName| and let user type the alias
    const linkText = withAlias ? `[[${noteName}|` : `[[${noteName}]]`;
    const newContent = `${beforeLink}${linkText}${withAlias ? '' : ''}${afterCursor}`;
    setContent(newContent);
    if (activeFileId) updateFileContent(activeFileId, newContent);
    setShowLinkAutocomplete(false);
    requestAnimationFrame(() => {
      const newPos = lastOpen + linkText.length;
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    });
  }, [showLinkAutocomplete, linkSuggestions, linkSelectedIndex, content, activeFileId, updateFileContent]);

  const detectLinkAutocomplete = useCallback((val: string, cursorPos: number) => {
    const textBefore = val.slice(0, cursorPos);
    const lastOpen = textBefore.lastIndexOf('[[');
    if (lastOpen === -1) {
      setShowLinkAutocomplete(false);
      return;
    }
    const afterBrackets = textBefore.slice(lastOpen + 2);
    if (afterBrackets.includes(']]') || afterBrackets.includes('\n') || afterBrackets.includes('[')) {
      setShowLinkAutocomplete(false);
      return;
    }

    // Handle alias: if user typed [[NoteName|, close autocomplete (target resolved)
    const pipeIdx = afterBrackets.indexOf('|');
    const query = pipeIdx !== -1 ? afterBrackets.slice(0, pipeIdx) : afterBrackets;
    setLinkQuery(query);
    setLinkSelectedIndex(0);

    // If pipe exists and there's a query before it, close autocomplete (alias mode)
    if (pipeIdx !== -1) {
      setShowLinkAutocomplete(false);
      return;
    }

    // Position the dropdown near the cursor
    if (textareaRef.current) {
      const ta = textareaRef.current;
      const rect = ta.getBoundingClientRect();
      const textBeforeCursor = val.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const lineNum = lines.length - 1;
      const colNum = lines[lineNum]?.length || 0;
      const lineHeight = 20;
      const charWidth = 8.4;
      const top = rect.top + (lineNum + 1) * lineHeight + ta.scrollTop - ta.scrollTop;
      const left = rect.left + colNum * charWidth;
      setLinkAutocompletePos({ top, left });
    }

    setShowLinkAutocomplete(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showLinkAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLinkSelectedIndex(prev => (prev + 1) % linkSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLinkSelectedIndex(prev => (prev - 1 + linkSuggestions.length) % linkSuggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        applyLinkSuggestion();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        applyLinkSuggestion(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowLinkAutocomplete(false);
      }
    }
  }, [showLinkAutocomplete, linkSuggestions, applyLinkSuggestion]);

  /*
  const insertLinkAliasClose = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBefore = content.slice(0, cursorPos);
    const lastOpen = textBefore.lastIndexOf('[[');
    if (lastOpen === -1) return;
    const afterOpen = textBefore.slice(lastOpen + 2);
    if (afterOpen.includes(']]')) return;
    const beforeLink = content.slice(0, cursorPos);
    const afterCursor = content.slice(cursorPos);
    const newContent = `${beforeLink}]]${afterCursor}`;
    setContent(newContent);
    if (activeFileId) updateFileContent(activeFileId, newContent);
    requestAnimationFrame(() => {
      const newPos = cursorPos + 2;
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    });
  }, [content, activeFileId, updateFileContent]);
  */

  // Sync content only when active file changes, preventing jumps on background saves
  useEffect(() => {
    if (activeNode) {
      setContent(activeNode.content || '');
    } else {
      setContent('');
    }
  }, [activeFileId]);

  // Fetch Ollama models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('http://localhost:3001/api/ai/models');
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.models || []);
          if (data.models && data.models.length > 0) {
            setSelectedModel(data.models[0]);
          }
        }
      } catch (err) {
        console.warn('Ollama local server not found.', err);
      }
    }
    fetchModels();
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleRunAIPrompt = async (presetPrompt?: string) => {
    if (!selectedModel) {
      setAIError('Nenhum modelo selecionado ou Ollama está offline. Certifique-se de que o app está ativo.');
      return;
    }
    
    setAIError('');
    setAIResponse('');
    setAILoading(true);

    const actualPrompt = presetPrompt || promptText;
    const finalPrompt = `Nota Atual:\n"""\n${content}\n"""\n\nInstrução:\n${actualPrompt}`;

    try {
      const res = await fetch('http://localhost:3001/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: finalPrompt
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro na requisição');
      }

      const data = await res.json();
      setAIResponse(data.response);
    } catch (err: any) {
      setAIError(err.message || 'Erro ao conectar ao servidor do Ollama.');
    } finally {
      setAILoading(false);
    }
  };

  const handleInsertAIContent = (mode: 'append' | 'replace') => {
    if (!aiResponse) return;
    let newContent = content;
    if (mode === 'append') {
      newContent = `${content}\n\n### Resposta do Assistente IA (${selectedModel.split(':')[0]})\n${aiResponse}`;
    } else {
      newContent = aiResponse;
    }
    setContent(newContent);
    if (activeFileId) {
      updateFileContent(activeFileId, newContent);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (activeFileId) {
      updateFileContent(activeFileId, val);
    }
    // Detect wiki-link autocomplete
    const cursorPos = e.target.selectionStart;
    detectLinkAutocomplete(val, cursorPos);
  };

  // Improved Markdown parser to support grouped lists correctly
  const renderMarkdown = (markdownText: string) => {
    if (!markdownText) return <p className="text-muted">Comece a digitar...</p>;

    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let insideCodeBlock = false;
    let codeContent = '';
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushList = (key: number) => {
      if (!currentList) return null;
      const listElement = currentList.type === 'ul' ? (
        <ul key={`list-${key}`}>
          {currentList.items.map((item, idx) => (
            <li key={idx}>{renderLineContent(item)}</li>
          ))}
        </ul>
      ) : (
        <ol key={`list-${key}`}>
          {currentList.items.map((item, idx) => (
            <li key={idx}>{renderLineContent(item)}</li>
          ))}
        </ol>
      );
      currentList = null;
      return listElement;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks toggle
      if (line.trim().startsWith('```')) {
        const flushed = flushList(i);
        if (flushed) elements.push(flushed);

        if (insideCodeBlock) {
          insideCodeBlock = false;
          const currentCode = codeContent;
          codeContent = '';
          elements.push(
            <pre key={`code-${i}`}>
              <code>{currentCode}</code>
            </pre>
          );
        } else {
          insideCodeBlock = true;
        }
        continue;
      }

      if (insideCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      // Lists (Unordered)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemContent = line.slice(2);
        if (currentList && currentList.type === 'ul') {
          currentList.items.push(itemContent);
        } else {
          const flushed = flushList(i);
          if (flushed) elements.push(flushed);
          currentList = { type: 'ul', items: [itemContent] };
        }
        continue;
      }

      // Lists (Ordered)
      if (/^\d+\.\s/.test(line)) {
        const itemContent = line.replace(/^\d+\.\s/, '');
        if (currentList && currentList.type === 'ol') {
          currentList.items.push(itemContent);
        } else {
          const flushed = flushList(i);
          if (flushed) elements.push(flushed);
          currentList = { type: 'ol', items: [itemContent] };
        }
        continue;
      }

      // Flush open lists when encountering non-list elements
      const flushed = flushList(i);
      if (flushed) elements.push(flushed);

      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={i}>{renderLineContent(line.slice(2))}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i}>{renderLineContent(line.slice(3))}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={i}>{renderLineContent(line.slice(4))}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={i}>{renderLineContent(line.slice(2))}</blockquote>);
      } else if (line.trim() === '') {
        elements.push(<div key={i} style={{ height: '0.8em' }}></div>);
      } else {
        elements.push(<p key={i}>{renderLineContent(line)}</p>);
      }
    }

    const flushed = flushList(lines.length);
    if (flushed) elements.push(flushed);

    return elements;
  };

  const renderLineContent = (text: string) => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;
    const boldRegex = /\*\*([^*]+)\*\*/;
    const italicRegex = /\*([^*]+)\*/;
    const codeRegex = /`([^`]+)`/;
    const tagRegex = /(?:^|\s)(#(?:[\w\u00C0-\u024F][\w\u00C0-\u024F/-]*[\w\u00C0-\u024F]|[\w\u00C0-\u024F]))(?=\s|$|[.,!?;:])/;

    while (remaining.length > 0) {
      const matchWiki = wikiRegex.exec(remaining);
      const matchBold = boldRegex.exec(remaining);
      const matchItalic = italicRegex.exec(remaining);
      const matchCode = codeRegex.exec(remaining);
      const matchTag = tagRegex.exec(remaining);

      const matches = [
        { type: 'wiki', match: matchWiki },
        { type: 'bold', match: matchBold },
        { type: 'italic', match: matchItalic },
        { type: 'code', match: matchCode },
        { type: 'tag', match: matchTag }
      ].filter(m => m.match !== null);

      if (matches.length === 0) {
        tokens.push(<span key={keyIndex++}>{remaining}</span>);
        break;
      }

      matches.sort((a, b) => (a.match?.index ?? 0) - (b.match?.index ?? 0));
      const firstMatch = matches[0];
      const matchIdx = firstMatch.match!.index;

      if (matchIdx > 0) {
        tokens.push(<span key={keyIndex++}>{remaining.slice(0, matchIdx)}</span>);
      }

      const matchText = firstMatch.match![0];
      const matchVal = firstMatch.match![1];

      if (firstMatch.type === 'wiki') {
        const label = firstMatch.match![2] || matchVal;
        tokens.push(renderWikiLink(matchVal.trim(), label, keyIndex++));
      } else if (firstMatch.type === 'tag') {
        const tagName = matchVal.startsWith('#') ? matchVal.slice(1) : matchVal;
        const prefix = matchText.startsWith(' ') ? ' ' : '';
        tokens.push(
          <React.Fragment key={keyIndex++}>
            {prefix}
            <span className="tag-badge" onClick={() => onSearchTag(tagName)} title={`Buscar notas com #${tagName}`}>
              <Hash size={10} />
              {tagName}
            </span>
          </React.Fragment>
        );
      } else if (firstMatch.type === 'bold') {
        tokens.push(<strong key={keyIndex++}>{matchVal}</strong>);
      } else if (firstMatch.type === 'italic') {
        tokens.push(<em key={keyIndex++}>{matchVal}</em>);
      } else if (firstMatch.type === 'code') {
        tokens.push(<code key={keyIndex++}>{matchVal}</code>);
      }

      remaining = remaining.slice(matchIdx + matchText.length);
    }

    return tokens;
  };

  const renderWikiLink = (targetName: string, label: string, key: number) => {
    const targetClean = targetName.endsWith('.md') ? targetName : `${targetName}.md`;
    const targetFile = nodes.find(n => 
      n.type === 'file' && (
        n.name.toLowerCase() === targetClean.toLowerCase() ||
        n.name.replace(/\.md$/, '').toLowerCase() === targetName.toLowerCase() ||
        getNodePath(n.id).toLowerCase() === targetClean.toLowerCase()
      )
    );

    const handleLinkClick = async () => {
      if (targetFile) {
        setActiveFileId(targetFile.id);
      } else {
        const newFile = await createNode(targetName, 'file', null);
        setActiveFileId(newFile.id);
      }
    };

    return (
      <span
        key={key}
        className={`wiki-link ${!targetFile ? 'unresolved' : ''}`}
        onClick={handleLinkClick}
        title={targetFile ? `Abrir nota: ${targetName}` : `Criar nota: ${targetName} (não resolvida)`}
      >
        {label}
      </span>
    );
  };

  if (showGraph) {
    return null;
  }

  if (!activeNode) {
    return (
      <div className="main-panel">
        <div className="empty-state">
          <FileText size={48} className="text-muted animate-pulse-slow" />
          <h2 className="empty-state-title">Nenhuma nota ativa</h2>
          <p>Selecione uma nota na barra lateral ou crie uma nova para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-panel">
      {/* Tabs */}
      <div className="tabs-bar">
        {openTabs.map((tabId) => {
          const tabNode = nodes.find(n => n.id === tabId);
          if (!tabNode) return null;
          const isDragOver = dragOverTabId === tabId && dragTabId !== tabId;
          return (
            <div
              key={tabId}
              className={`tab ${activeFileId === tabId ? 'active' : ''} ${isDragOver ? 'tab-drag-over' : ''} ${dragTabId === tabId ? 'tab-dragging' : ''}`}
              onClick={() => setActiveFileId(tabId)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDragTabId(tabId);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverTabId(tabId);
              }}
              onDragLeave={() => {
                setDragOverTabId(prev => prev === tabId ? null : prev);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragTabId && dragTabId !== tabId) {
                  const fromIdx = openTabs.indexOf(dragTabId);
                  const toIdx = openTabs.indexOf(tabId);
                  if (fromIdx !== -1 && toIdx !== -1) {
                    reorderTabs(fromIdx, toIdx);
                  }
                }
                setDragTabId(null);
                setDragOverTabId(null);
              }}
              onDragEnd={() => {
                setDragTabId(null);
                setDragOverTabId(null);
              }}
            >
              <FileText size={12} />
              <span>{tabNode.name.replace(/\.md$/, '')}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Pane Controls */}
      <div className="pane-header">
        <span className="pane-path">{getNodePath(activeNode.id)}</span>
        <div className="pane-actions">
          <button
            className={`icon-btn ${viewMode === 'edit' ? 'active' : ''}`}
            title="Modo Edição"
            onClick={() => setViewMode('edit')}
          >
            <Edit3 size={16} />
          </button>
          <button
            className={`icon-btn ${viewMode === 'preview' ? 'active' : ''}`}
            title="Modo Leitura / Preview"
            onClick={() => setViewMode('preview')}
          >
            <Eye size={16} />
          </button>
          <button
            className={`icon-btn ${viewMode === 'split' ? 'active' : ''}`}
            title="Visualização Dividida"
            onClick={() => setViewMode('split')}
          >
            <Columns size={16} />
          </button>
          <button
            className={`icon-btn`}
            title="Visualizar Grafo"
            onClick={onToggleGraph}
          >
            <Network size={16} />
          </button>
          <button
            className={`icon-btn ${showAIPanel ? 'active' : ''}`}
            title="Assistente de IA (Ollama)"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="editor-workspace">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <textarea
            ref={textareaRef}
            className="text-editor"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              const ta = e.currentTarget;
              detectLinkAutocomplete(content, ta.selectionStart);
            }}
            onClick={(e) => {
              const ta = e.currentTarget;
              detectLinkAutocomplete(content, ta.selectionStart);
            }}
            placeholder="# Digite sua nota em Markdown..."
            autoFocus
          />
        )}

        {viewMode === 'split' && <div className="pane-divider" />}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="preview-container">
            {renderMarkdown(content)}
          </div>
        )}

        {/* Tag Search Results Modal */}
      {showTagSearch && tagSearchQuery && (
        <div className="modal-overlay" onClick={() => setShowTagSearch(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={16} className="text-accent" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Notas com tag: #{tagSearchQuery}</span>
              </div>
            </div>
            <div className="modal-list">
              {tagFilteredFiles.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }} className="text-muted">
                  Nenhuma nota encontrada com esta tag.
                </div>
              ) : (
                tagFilteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="modal-item"
                    onClick={() => {
                      setActiveFileId(file.id);
                      setShowTagSearch(false);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} />
                      <span className="modal-item-title">{file.name.replace('.md', '')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wiki-link autocomplete dropdown */}
        {showLinkAutocomplete && linkSuggestions.length > 0 && (
          <div
            className="link-autocomplete-dropdown"
            style={{
              position: 'fixed',
              top: `${linkAutocompletePos.top}px`,
              left: `${linkAutocompletePos.left}px`,
            }}
          >
            {linkSuggestions.map((suggestion, idx) => (
              <div key={suggestion.id}>
                <div
                  className={`link-autocomplete-item ${idx === linkSelectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLinkSelectedIndex(idx);
                    applyLinkSuggestion();
                  }}
                >
                  <Link size={12} />
                  <span>{suggestion.name.replace(/\.md$/, '')}</span>
                  <span className="link-autocomplete-hint">↵ inserir</span>
                </div>
                {idx === linkSelectedIndex && (
                  <div
                    className="link-autocomplete-item link-autocomplete-sub"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyLinkSuggestion(true);
                    }}
                  >
                    <span style={{ width: 12 }} />
                    <span className="text-muted" style={{ fontSize: '11px' }}>Inserir com alias...</span>
                    <span className="link-autocomplete-hint">Tab</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showAIPanel && <div className="pane-divider" />}

        {showAIPanel && (
          <div className="ai-assistant-pane">
            <div className="ai-assistant-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                <Sparkles size={14} className="text-accent" />
                <span>ASSISTENTE IA</span>
              </div>
              <button className="icon-btn" onClick={() => setShowAIPanel(false)}>
                <X size={14} />
              </button>
            </div>
            
            <div className="ai-assistant-content">
              {/* Model selection */}
              <div className="ai-form-group">
                <label className="ai-label">
                  <Cpu size={12} />
                  <span>Modelo Local</span>
                </label>
                {availableModels.length === 0 ? (
                  <div className="ai-error-box" style={{ padding: '6px 8px', fontSize: '11px', margin: '4px 0' }}>
                    Ollama offline ou nenhum modelo encontrado.
                  </div>
                ) : (
                  <select
                     className="ai-select"
                     value={selectedModel}
                     onChange={e => setSelectedModel(e.target.value)}
                  >
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quick actions */}
              <div className="ai-section-title">Ações Rápidas</div>
              <div className="ai-actions-grid">
                <button
                  className="ai-btn-secondary"
                  disabled={aiLoading || !selectedModel}
                  onClick={() => handleRunAIPrompt('Faça um resumo executivo bem estruturado desta nota em tópicos.')}
                >
                  Resumir nota
                </button>
                <button
                  className="ai-btn-secondary"
                  disabled={aiLoading || !selectedModel}
                  onClick={() => handleRunAIPrompt('Sugerir 5 tags (palavras-chave) relevantes para organizar esta nota.')}
                >
                  Sugerir tags
                </button>
                <button
                  className="ai-btn-secondary"
                  disabled={aiLoading || !selectedModel}
                  onClick={() => handleRunAIPrompt('Com base nesta nota, sugira 3 novos temas ou notas relacionadas para eu criar link [[Nome da Nota]].')}
                >
                  Ideias relacionadas
                </button>
                <button
                  className="ai-btn-secondary"
                  disabled={aiLoading || !selectedModel}
                  onClick={() => handleRunAIPrompt('Corrija possíveis erros gramaticais e melhore a clareza e o fluxo do texto da nota atual, sem alterar o sentido original.')}
                >
                  Melhorar texto
                </button>
              </div>

              {/* Custom prompt */}
              <div className="ai-form-group" style={{ marginTop: '16px' }}>
                <label className="ai-label">Instrução Personalizada</label>
                <textarea
                  className="ai-textarea"
                  placeholder="Ex: Escreva um parágrafo extra sobre... ou Extraia os pontos-chave..."
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                />
                <button
                  className="ai-btn-primary"
                  disabled={aiLoading || !promptText.trim() || !selectedModel}
                  onClick={() => handleRunAIPrompt()}
                >
                  {aiLoading ? 'Processando...' : 'Executar Comando'}
                  <Send size={12} style={{ marginLeft: '6px' }} />
                </button>
              </div>

              {/* Errors */}
              {aiError && (
                <div className="ai-error-box">
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Response output */}
              {aiResponse && (
                <div className="ai-response-box">
                  <div className="ai-response-header">
                    <span>Resultado</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="icon-btn"
                        title="Copiar para clipboard"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(aiResponse);
                            setCopied(true);
                            if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
                            copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
                          } catch (err) {
                            console.error('Falha ao copiar para o clipboard', err);
                          }
                        }}
                      >
                        {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                      </button>
                      <button
                        className="icon-btn"
                        title="Inserir no final da nota"
                        onClick={() => handleInsertAIContent('append')}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="ai-response-content">{aiResponse}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
