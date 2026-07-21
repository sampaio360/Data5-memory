const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4141;
const SETTINGS_PATH = path.join(process.env.USERPROFILE || 'C:\\Users\\Nailton', '.claude', 'settings.json');

// Helper to open the browser
function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} ${url}`, (err) => {
    if (err) console.error('Error opening browser:', err);
  });
}

// Fetch models from local Ollama
function fetchOllamaModels() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.models || []);
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => {
      resolve([]);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve([]);
    });
  });
}

// Server logic
const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtmlContent());
    return;
  }

  if (url === '/api/settings' && method === 'GET') {
    try {
      let settings = {};
      if (fs.existsSync(SETTINGS_PATH)) {
        const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
        settings = JSON.parse(fileContent);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(settings));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao ler arquivo de configurações', details: e.message }));
    }
    return;
  }

  if (url === '/api/settings' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newSettings = JSON.parse(body);
        
        // Ensure .claude directory exists
        const dir = path.dirname(SETTINGS_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Read current settings to preserve other values like plugins, effortLevel, etc.
        let currentSettings = {};
        if (fs.existsSync(SETTINGS_PATH)) {
          try {
            currentSettings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
          } catch (e) {
            // ignore malformed file
          }
        }

        // Merge settings
        const merged = { ...currentSettings, ...newSettings };
        
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: merged }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao salvar configurações', details: e.message }));
      }
    });
    return;
  }

  if (url === '/api/models' && method === 'GET') {
    const models = await fetchOllamaModels();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models }));
    return;
  }

  if (url === '/api/launch' && method === 'POST') {
    // Launch Claude in a new terminal window on Windows
    exec('start cmd.exe /k "claude"', (err) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Falha ao iniciar terminal', details: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Start the server
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`  Claude Code Configurator GUI rodando em:`);
  console.log(`  👉 ${url}`);
  console.log(`======================================================\n`);
  openBrowser(url);
});

// HTML Interface
function getHtmlContent() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Code - Configuração de Modelos</title>
  <!-- Plus Jakarta Sans Font for premium look -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!-- Phosphor Icons Light -->
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <style>
    :root {
      --bg: #050505;
      --card-bg: rgba(10, 10, 10, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(124, 58, 237, 0.25);
      --accent: #8b5cf6;
      --accent-glow: rgba(139, 92, 246, 0.4);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --error: #ef4444;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      overflow-x: hidden;
      position: relative;
    }

    /* Cinematic Radial Gradients Background */
    body::before {
      content: '';
      position: absolute;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--border-glow) 0%, transparent 70%);
      top: -100px;
      left: -100px;
      z-index: -1;
      pointer-events: none;
      filter: blur(80px);
      opacity: 0.8;
    }

    body::after {
      content: '';
      position: absolute;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
      bottom: -100px;
      right: -100px;
      z-index: -1;
      pointer-events: none;
      filter: blur(80px);
      opacity: 0.8;
    }

    /* Grid Overlay */
    .grid-overlay {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px);
      background-size: 40px 40px;
      z-index: -1;
      pointer-events: none;
    }

    .container {
      width: 100%;
      max-width: 650px;
      position: relative;
      opacity: 0;
      transform: translateY(20px);
      animation: fadeIn 0.8s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Double Bezel Card Architecture */
    .outer-shell {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      padding: 6px;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transition: border-color 0.5s ease;
    }

    .outer-shell:focus-within {
      border-color: var(--border-glow);
    }

    .inner-core {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 18px;
      padding: 2.5rem;
      border: 1px solid rgba(255, 255, 255, 0.03);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
    }

    /* Header styling */
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #a78bfa;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #fff 40%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    /* Form and Fields */
    .form-group {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #d1d5db;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    label i {
      color: var(--accent);
      font-size: 1rem;
    }

    /* Premium Inputs */
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-wrapper i {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      font-size: 1.1rem;
      pointer-events: none;
    }

    input[type="text"], select {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      padding: 12px 14px 12px 42px;
      border-radius: 12px;
      color: #fff;
      font-size: 0.9rem;
      transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      outline: none;
      appearance: none;
      -webkit-appearance: none;
    }

    select {
      cursor: pointer;
    }

    .select-arrow {
      position: absolute;
      right: 14px;
      pointer-events: none;
      color: var(--text-muted);
    }

    input[type="text"]:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
      background: rgba(0, 0, 0, 0.5);
    }

    /* Tabs/Pills for selection */
    .provider-toggle {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      padding: 4px;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      margin-bottom: 2rem;
    }

    .provider-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .provider-btn.active {
      background: rgba(139, 92, 246, 0.15);
      color: #fff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 12px rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    /* Switch / Toggle Switch */
    .switch-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }

    .switch-label-desc {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .switch-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #fff;
    }

    .switch-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: .4s cubic-bezier(0.32, 0.72, 0, 1);
      border-radius: 24px;
      border: 1px solid var(--border-color);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: #fff;
      transition: .4s cubic-bezier(0.32, 0.72, 0, 1);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    input:checked + .slider {
      background-color: var(--accent);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    /* Buttons Section */
    .btn-row {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      flex: 1;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      outline: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      color: #e5e7eb;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
    }

    .btn-primary:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 25px rgba(139, 92, 246, 0.5);
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--success);
    }

    .btn-success:hover {
      background: rgba(16, 185, 129, 0.2);
    }

    /* Warning/Alert message */
    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.8rem;
      color: #fca5a5;
      margin-bottom: 1.5rem;
    }

    .alert i {
      font-size: 1.1rem;
      margin-top: 1px;
    }

    .alert-info {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.15);
      color: #93c5fd;
    }

    .alert-info i {
      color: #60a5fa;
    }

    /* Toast system */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: rgba(10, 10, 10, 0.9);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      z-index: 100;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
      pointer-events: none;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .toast-success {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .toast-success i {
      color: var(--success);
      font-size: 1.2rem;
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>

  <div class="container">
    <div class="outer-shell" id="cardShell">
      <div class="inner-core">
        <div class="header">
          <div class="eyebrow">
            <i class="ph-bold ph-terminal-window"></i>
            <span>Claude Code Config</span>
          </div>
          <h1>Configurador de Modelos</h1>
          <p class="subtitle">Personalize os modelos e bases de API do Claude Code</p>
        </div>

        <div class="provider-toggle">
          <button class="provider-btn active" id="btnOllama" onclick="switchProvider('ollama')">
            <i class="ph ph-cpu"></i> Ollama / Custom
          </button>
          <button class="provider-btn" id="btnVertex" onclick="switchProvider('vertex')">
            <i class="ph ph-cloud"></i> Google Vertex AI
          </button>
        </div>

        <!-- Alert for Ollama status -->
        <div class="alert hidden" id="ollamaAlert">
          <i class="ph-bold ph-warning"></i>
          <div>
            <strong>Ollama Offline:</strong> Não foi possível conectar ao Ollama em localhost:11434. Certifique-se de que ele está rodando antes de prosseguir.
          </div>
        </div>

        <form id="configForm" onsubmit="saveSettings(event)">
          <!-- Ollama / Custom API config -->
          <div id="ollamaConfigSection">
            <div class="form-group">
              <label for="modelSelect">
                <i class="ph ph-brain"></i> Selecionar Modelo do Ollama
              </label>
              <div class="input-wrapper">
                <i class="ph ph-sparkle"></i>
                <select id="modelSelect" onchange="onModelSelectChange()">
                  <option value="" disabled selected>Carregando modelos...</option>
                </select>
                <i class="ph ph-caret-down select-arrow"></i>
              </div>
            </div>

            <div class="form-group">
              <label for="customModelInput">
                <i class="ph ph-code"></i> Modelo Personalizado (Manual)
              </label>
              <div class="input-wrapper">
                <i class="ph ph-terminal"></i>
                <input type="text" id="customModelInput" placeholder="Ex: gemini-3-flash-preview:latest" />
              </div>
            </div>

            <div class="form-group">
              <label for="apiUrlInput">
                <i class="ph ph-link"></i> Endpoint (Base URL)
              </label>
              <div class="input-wrapper">
                <i class="ph ph-globe"></i>
                <input type="text" id="apiUrlInput" placeholder="http://localhost:11434/v1" />
              </div>
            </div>

            <div class="form-group">
              <label for="apiKeyInput">
                <i class="ph ph-key"></i> Chave de API (Dummy Key)
              </label>
              <div class="input-wrapper">
                <i class="ph ph-shield-check"></i>
                <input type="text" id="apiKeyInput" placeholder="ollama" />
              </div>
            </div>
          </div>

          <!-- Vertex AI configuration -->
          <div id="vertexConfigSection" class="hidden">
            <div class="alert alert-info">
              <i class="ph-bold ph-info"></i>
              <div>
                <strong>Atenção:</strong> O Vertex AI permite rodar modelos originais do Claude (como o 3.5 Sonnet) hospedados no Google Cloud Platform.
              </div>
            </div>

            <div class="form-group">
              <label for="vertexModelSelect">
                <i class="ph ph-brain"></i> Modelo do Claude no Vertex
              </label>
              <div class="input-wrapper">
                <i class="ph ph-sparkle"></i>
                <select id="vertexModelSelect">
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Recomendado)</option>
                  <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </select>
                <i class="ph ph-caret-down select-arrow"></i>
              </div>
            </div>

            <div class="form-group">
              <label for="projectIdInput">
                <i class="ph ph-folder-open"></i> ID do Projeto GCP
              </label>
              <div class="input-wrapper">
                <i class="ph ph-identification-card"></i>
                <input type="text" id="projectIdInput" placeholder="Ex: meu-projeto-gcp-1234" />
              </div>
            </div>

            <div class="form-group">
              <label for="regionInput">
                <i class="ph ph-map-pin"></i> Região do Vertex AI
              </label>
              <div class="input-wrapper">
                <i class="ph ph-navigation-arrow"></i>
                <input type="text" id="regionInput" placeholder="Ex: us-central1" />
              </div>
            </div>
          </div>

          <!-- Telemetry option -->
          <div class="switch-group">
            <div class="switch-label-desc">
              <span class="switch-title">Desativar Telemetria</span>
              <span class="switch-subtitle">Bloqueia tráfego de dados não essenciais para a Anthropic</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="telemetrySwitch" checked>
              <span class="slider"></span>
            </label>
          </div>

          <!-- Buttons -->
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" onclick="testOllama()">
              <i class="ph ph-plugs"></i> Testar Ollama
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="ph ph-floppy-disk"></i> Salvar Config
            </button>
          </div>

          <div class="btn-row" style="margin-top: 1rem;">
            <button type="button" class="btn btn-success" style="flex: 1;" onclick="launchClaude()">
              <i class="ph-bold ph-rocket-launch"></i> Abrir Terminal com Claude Code
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Toast Message -->
  <div class="toast toast-success" id="toast">
    <i class="ph-fill ph-check-circle"></i>
    <span id="toastText">Configurações salvas com sucesso!</span>
  </div>

  <script>
    let activeProvider = 'ollama';
    let ollamaModels = [];

    // On Load
    window.addEventListener('DOMContentLoaded', async () => {
      await loadSettings();
      await loadOllamaModels();
    });

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const settings = await res.json();

        // Check if Vertex is active based on environment variables
        const env = settings.env || {};
        const isVertex = env.CLAUDE_CODE_USE_VERTEX === "1";

        if (isVertex) {
          switchProvider('vertex');
          document.getElementById('projectIdInput').value = env.ANTHROPIC_VERTEX_PROJECT_ID || '';
          document.getElementById('regionInput').value = env.CLOUD_ML_REGION || '';
          if (settings.model) {
            document.getElementById('vertexModelSelect').value = settings.model;
          }
        } else {
          switchProvider('ollama');
          document.getElementById('customModelInput').value = settings.model || '';
          document.getElementById('apiUrlInput').value = env.ANTHROPIC_BASE_URL || 'http://localhost:11434/v1';
          document.getElementById('apiKeyInput').value = env.ANTHROPIC_API_KEY || 'ollama';
        }

        document.getElementById('telemetrySwitch').checked = env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === "1";

      } catch (e) {
        showToast('Erro ao carregar configurações!', true);
      }
    }

    async function loadOllamaModels() {
      const select = document.getElementById('modelSelect');
      const alert = document.getElementById('ollamaAlert');
      
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        ollamaModels = data.models || [];

        select.innerHTML = '';
        
        if (ollamaModels.length === 0) {
          select.innerHTML = '<option value="" disabled selected>Nenhum modelo encontrado</option>';
          alert.classList.remove('hidden');
          return;
        }

        alert.classList.add('hidden');
        
        // Populate select
        ollamaModels.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.name;
          opt.textContent = m.name;
          select.appendChild(opt);
        });

        // Set default value if matches custom input
        const currentModel = document.getElementById('customModelInput').value;
        if (currentModel && ollamaModels.some(m => m.name === currentModel)) {
          select.value = currentModel;
        } else if (ollamaModels.some(m => m.name.includes('gemini-3'))) {
          // pre-select gemini model if found
          const geminiModel = ollamaModels.find(m => m.name.includes('gemini-3')).name;
          select.value = geminiModel;
          document.getElementById('customModelInput').value = geminiModel;
        } else if (ollamaModels.length > 0) {
          select.value = ollamaModels[0].name;
          document.getElementById('customModelInput').value = ollamaModels[0].name;
        }

      } catch (e) {
        select.innerHTML = '<option value="" disabled selected>Erro ao conectar</option>';
        alert.classList.remove('hidden');
      }
    }

    function onModelSelectChange() {
      const select = document.getElementById('modelSelect');
      document.getElementById('customModelInput').value = select.value;
    }

    function switchProvider(provider) {
      activeProvider = provider;
      const btnOllama = document.getElementById('btnOllama');
      const btnVertex = document.getElementById('btnVertex');
      const ollamaSection = document.getElementById('ollamaConfigSection');
      const vertexSection = document.getElementById('vertexConfigSection');

      if (provider === 'ollama') {
        btnOllama.classList.add('active');
        btnVertex.classList.remove('active');
        ollamaSection.classList.remove('hidden');
        vertexSection.classList.add('hidden');
      } else {
        btnOllama.classList.remove('active');
        btnVertex.classList.add('active');
        ollamaSection.classList.add('hidden');
        vertexSection.classList.remove('hidden');
      }
    }

    async function testOllama() {
      await loadOllamaModels();
      if (ollamaModels.length > 0) {
        showToast('Conexão com Ollama bem-sucedida! (' + ollamaModels.length + ' modelos)');
      } else {
        showToast('Falha na conexão com o Ollama.', true);
      }
    }

    async function saveSettings(e) {
      e.preventDefault();
      
      const disableTelemetry = document.getElementById('telemetrySwitch').checked ? "1" : "0";
      let payload = {};

      if (activeProvider === 'ollama') {
        const model = document.getElementById('customModelInput').value.trim();
        const baseUrl = document.getElementById('apiUrlInput').value.trim() || 'http://localhost:11434/v1';
        const apiKey = document.getElementById('apiKeyInput').value.trim() || 'ollama';

        if (!model) {
          showToast('Por favor, informe ou selecione um modelo!', true);
          return;
        }

        payload = {
          model: model,
          env: {
            ANTHROPIC_BASE_URL: baseUrl,
            ANTHROPIC_API_KEY: apiKey,
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: disableTelemetry,
            CLAUDE_CODE_USE_VERTEX: "0" // explicitly disable vertex
          }
        };
      } else {
        const model = document.getElementById('vertexModelSelect').value;
        const projectId = document.getElementById('projectIdInput').value.trim();
        const region = document.getElementById('regionInput').value.trim() || 'us-central1';

        if (!projectId) {
          showToast('Por favor, insira o ID do seu projeto GCP!', true);
          return;
        }

        payload = {
          model: model,
          env: {
            CLAUDE_CODE_USE_VERTEX: "1",
            ANTHROPIC_VERTEX_PROJECT_ID: projectId,
            CLOUD_ML_REGION: region,
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: disableTelemetry
          }
        };
      }

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast('Configurações salvas no settings.json!');
        } else {
          showToast('Erro ao salvar configurações.', true);
        }
      } catch (err) {
        showToast('Falha de rede ao tentar salvar.', true);
      }
    }

    async function launchClaude() {
      try {
        const res = await fetch('/api/launch', { method: 'POST' });
        if (res.ok) {
          showToast('Terminal do Claude Code iniciado!');
        } else {
          showToast('Erro ao abrir terminal do Claude.', true);
        }
      } catch (e) {
        showToast('Erro de rede ao iniciar Claude.', true);
      }
    }

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      const text = document.getElementById('toastText');
      
      text.textContent = message;
      
      if (isError) {
        toast.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        toast.querySelector('i').className = 'ph-fill ph-x-circle';
        toast.querySelector('i').style.color = 'var(--error)';
      } else {
        toast.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        toast.querySelector('i').className = 'ph-fill ph-check-circle';
        toast.querySelector('i').style.color = 'var(--success)';
      }

      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }
  </script>
</body>
</html>
`;
}
