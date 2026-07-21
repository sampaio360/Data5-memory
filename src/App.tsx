import React, { useState, useEffect, useCallback } from 'react';
import { VaultProvider } from './context/VaultContext';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Backlinks } from './components/Backlinks';
import { GraphView } from './components/GraphView';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import './App.css';

const AppContent: React.FC = () => {
  const [showGraph, setShowGraph] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBacklinks, setShowBacklinks] = useState(true);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      setIsCommandPaletteOpen(prev => !prev);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      setIsSettingsOpen(prev => !prev);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      setShowGraph(prev => !prev);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      // closeTab handled inside Editor
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Apply saved theme on mount
  useEffect(() => {
    const theme = localStorage.getItem('obsidian_theme') || 'dark';
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  return (
    <div className="app-container">
      {showSidebar && (
        <Sidebar
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {showGraph ? (
        <GraphView onClose={() => setShowGraph(false)} />
      ) : (
        <Editor onToggleGraph={() => setShowGraph(true)} showGraph={showGraph} />
      )}

      {showBacklinks && <Backlinks />}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showSidebar={showSidebar}
        showBacklinks={showBacklinks}
        onToggleSidebar={() => setShowSidebar(prev => !prev)}
        onToggleBacklinks={() => setShowBacklinks(prev => !prev)}
      />
    </div>
  );
};

function App() {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
}

export default App;
