import React, { useState } from 'react';
import { X, Sun, Moon, Monitor, Sidebar, PanelRight, Keyboard, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showSidebar: boolean;
  showBacklinks: boolean;
  onToggleSidebar: () => void;
  onToggleBacklinks: () => void;
}

const THEME_KEY = 'obsidian_theme';

type ThemeMode = 'dark' | 'light' | 'system';

function getStoredTheme(): ThemeMode {
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark';
}

function applyTheme(theme: ThemeMode) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, showSidebar, showBacklinks, onToggleSidebar, onToggleBacklinks
}) => {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' }}>
            <Info size={16} className="text-accent" />
            <span>Configurações</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 18px', maxHeight: '400px', overflowY: 'auto' }}>
          {/* Theme */}
          <h4 className="sidebar-section-title" style={{ marginBottom: '10px' }}>Tema</h4>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { mode: 'dark' as ThemeMode, icon: <Moon size={14} />, label: 'Escuro' },
              { mode: 'light' as ThemeMode, icon: <Sun size={14} />, label: 'Claro' },
              { mode: 'system' as ThemeMode, icon: <Monitor size={14} />, label: 'Sistema' },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                className={`ai-btn-secondary ${theme === mode ? 'active' : ''}`}
                style={{
                  flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  ...(theme === mode ? { borderColor: 'var(--bg-accent)', backgroundColor: 'rgba(123, 66, 188, 0.1)' } : {})
                }}
                onClick={() => handleThemeChange(mode)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Panels */}
          <h4 className="sidebar-section-title" style={{ marginBottom: '10px' }}>Painéis</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <label className="graph-settings-row graph-settings-toggle" style={{ marginBottom: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sidebar size={14} /> Sidebar (navegação)
              </span>
              <input type="checkbox" checked={showSidebar} onChange={onToggleSidebar} />
              <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
            </label>
            <label className="graph-settings-row graph-settings-toggle" style={{ marginBottom: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PanelRight size={14} /> Backlinks / Vínculos
              </span>
              <input type="checkbox" checked={showBacklinks} onChange={onToggleBacklinks} />
              <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
            </label>
          </div>

          {/* Hotkeys */}
          <h4 className="sidebar-section-title" style={{ marginBottom: '10px' }}>
            <Keyboard size={12} style={{ marginRight: 4 }} /> Atalhos de Teclado
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            {[
              { keys: 'Ctrl+P', desc: 'Paleta de Comandos' },
              { keys: 'Ctrl+G', desc: 'Abrir grafo de conexões' },
              { keys: 'Ctrl+,', desc: 'Abrir Configurações' },
              { keys: 'Ctrl+W', desc: 'Fechar aba atual' },
              { keys: '[[nome', desc: 'Link rápido para outra nota' },
              { keys: '#tag', desc: 'Tag para categorizar' },
            ].map(({ keys, desc }) => (
              <div key={keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted">{desc}</span>
                <kbd className="hotkey-badge">{keys}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
