const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let serverPort = 3000;

function getProjectRoot() {
  if (app.isPackaged) {
    // In unpacked or packaged electron app, app files are in resources/app
    return path.join(process.resourcesPath, 'app');
  }
  return path.join(__dirname, '..');
}

function getLogPath() {
  return path.join(app.getPath('userData'), 'puca-finance.log');
}

function logMessage(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(getLogPath(), line);
  } catch (e) {
    // ignore
  }
}

// Load .env if present
function loadEnv() {
  const projectRoot = getProjectRoot();
  const exeDir = path.dirname(process.execPath);
  const possibleEnvPaths = [
    path.join(exeDir, '.env'),
    path.join(projectRoot, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(app.getPath('userData'), '.env'),
  ];

  let loaded = false;
  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
        logMessage(`Loaded environment variables from: ${envPath}`);
        loaded = true;
        break;
      } catch (err) {
        logMessage(`Error loading ${envPath}: ${err.message}`);
      }
    }
  }

  // Ensure default fallback secret and environment if none provided
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = '3a1841481272f15e9c6381d9cda264c526efb3d4cec49f0d3fe030809ae8ec96';
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  return loaded;
}

// Find an available port
function getAvailablePort(startingPort = 3000) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.listen(startingPort, '127.0.0.1', () => {
      testServer.once('close', () => resolve(startingPort));
      testServer.close();
    });
    testServer.on('error', () => {
      resolve(getAvailablePort(startingPort + 1));
    });
  });
}

// Wait for HTTP server to become responsive
function waitForServer(url, timeoutMs = 60000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          setTimeout(check, 350);
        }
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Server initialization timed out after ${timeoutMs / 1000}s`));
        } else {
          setTimeout(check, 350);
        }
      });
    };
    check();
  });
}

async function startServer(port) {
  const projectRoot = getProjectRoot();
  const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

  logMessage(`Project root: ${projectRoot}`);
  logMessage(`Next binary: ${nextBin}`);
  logMessage(`Starting server on port ${port}...`);

  if (!fs.existsSync(nextBin)) {
    throw new Error(`Next.js runtime binary not found at ${nextBin}`);
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    ELECTRON_RUN_AS_NODE: '1',
  };

  serverProcess = spawn(process.execPath, [nextBin, 'start', projectRoot, '-p', String(port), '-H', '127.0.0.1'], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (data) => {
    logMessage(`[Next.js]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    logMessage(`[Next.js ERROR]: ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code, signal) => {
    logMessage(`Next.js process exited with code ${code}, signal ${signal}`);
  });

  await waitForServer(`http://127.0.0.1:${port}`);
  logMessage('Next.js server is ready!');
}

function createMainWindow(port) {
  const iconPath = path.join(getProjectRoot(), 'public', 'icons', 'icon-512x512.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'PUCA Finance',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: false,
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`) && !url.startsWith(`http://localhost:${port}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  loadEnv();

  const loadingWindow = new BrowserWindow({
    width: 500,
    height: 340,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: true,
  });

  loadingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          user-select: none;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 24px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { margin: 0 0 8px 0; font-size: 19px; font-weight: 600; letter-spacing: -0.02em; }
        p { margin: 0; font-size: 13px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <h1>PUCA Finance</h1>
      <p>Starting application...</p>
    </body>
    </html>
  `)}`);

  try {
    serverPort = await getAvailablePort(3000);
    await startServer(serverPort);
    createMainWindow(serverPort);
    if (!loadingWindow.isDestroyed()) {
      loadingWindow.close();
    }
  } catch (err) {
    logMessage(`Fatal Error: ${err.stack || err.message}`);
    if (!loadingWindow.isDestroyed()) {
      loadingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;padding:24px;background:#fef2f2;color:#991b1b;margin:0;">
          <h3 style="margin-top:0;">Failed to Start PUCA Finance</h3>
          <p style="font-size:13px;line-height:1.5;">${err.message}</p>
          <div style="margin-top:16px;padding:12px;background:#fee2e2;border-radius:6px;font-size:12px;">
            Check that database settings in <code>.env</code> are correct and your database server is running.
            <br><br>Log file: <code>${getLogPath()}</code>
          </div>
        </body>
        </html>
      `)}`);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(serverPort);
    }
  });
});

function cleanup() {
  if (serverProcess) {
    try {
      logMessage('Stopping background Next.js server...');
      serverProcess.kill('SIGTERM');
    } catch (e) {
      // ignore
    }
    serverProcess = null;
  }
}

app.on('before-quit', cleanup);
app.on('will-quit', cleanup);

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
