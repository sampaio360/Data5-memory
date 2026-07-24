const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let expressProcess = null;
let mainWindow = null;

function startExpressServer() {
  // Start the server/index.ts using tsx (TypeScript execute)
  const tsxPath = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const serverPath = path.join(__dirname, 'server', 'index.ts');

  console.log('Starting Express API Server...');
  
  expressProcess = fork(serverPath, [], {
    execPath: process.execPath, // use electron node instance or path
    execArgv: [tsxPath],        // pass tsx to execute typescript
    env: { ...process.env, PORT: '3001' },
    silent: false
  });

  expressProcess.on('error', (err) => {
    console.error('Failed to start Express server:', err);
  });

  expressProcess.on('exit', (code, signal) => {
    console.log(`Express server exited with code ${code} and signal ${signal}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Data5-Memory",
    icon: path.join(__dirname, 'public', 'favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // In development, load from Vite dev server. In production, load build folder.
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // Wait slightly to ensure Vite dev server is running
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173');
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startExpressServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Terminate express process when all windows are closed
  if (expressProcess) {
    console.log('Stopping Express API Server...');
    expressProcess.kill();
    expressProcess = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('exit', () => {
  if (expressProcess) {
    expressProcess.kill();
  }
});
