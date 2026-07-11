const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

let mainWindow = null;
let nextServer = null;
let serverURL = null;
let logFile = null;

function writeLog(level, ...values) {
  const message = values
    .map((value) => {
      if (value instanceof Error) {
        return value.stack || value.message;
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    })
    .join(' ');
  const line = `${new Date().toISOString()} [${level}] ${message}`;

  const consoleMethod = level === 'ERROR' ? console.error : console.log;
  consoleMethod(line);

  if (logFile) {
    try {
      fs.appendFileSync(logFile, `${line}\n`, 'utf8');
    } catch (error) {
      console.error('Failed to write application log:', error);
    }
  }
}

function initializeLogging() {
  const logDirectory = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  logFile = path.join(logDirectory, 'main.log');

  writeLog('INFO', 'Application starting');
  writeLog('INFO', 'Packaged:', app.isPackaged);
  writeLog('INFO', 'Application path:', app.getAppPath());
  writeLog('INFO', 'Resources path:', process.resourcesPath);
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close(() => reject(new Error('Unable to allocate a local port')));
        return;
      }

      const port = address.port;
      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function waitForServer(url, timeoutMilliseconds = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - startedAt >= timeoutMilliseconds) {
        reject(new Error(`Next.js server did not become ready: ${url}`));
        return;
      }

      const request = http.get(url, { timeout: 1500 }, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        setTimeout(check, 300);
      });

      request.on('timeout', () => request.destroy());
      request.on('error', () => setTimeout(check, 300));
    };

    check();
  });
}

function createStatusPage(title, message) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html lang="zh-CN">
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body style="margin:0;background:#111318;color:#e8e8e8;font-family:Arial,'Microsoft YaHei',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <main style="max-width:760px;padding:40px;text-align:center">
          <h2>${title}</h2>
          <p style="color:#b8b8b8;line-height:1.7;overflow-wrap:anywhere">${message}</p>
        </main>
      </body>
    </html>
  `)}`;
}

function createWindow(startURL) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'public', 'icon-512.png'),
    autoHideMenuBar: true,
    title: '角色卡设计器 - Character Card Designer',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(createStatusPage('角色卡设计器正在启动', '正在准备本地服务，请稍候。'));

  waitForServer(startURL)
    .then(() => {
      if (!mainWindow) {
        return;
      }
      writeLog('INFO', 'Next.js server is ready:', startURL);
      return mainWindow.loadURL(startURL);
    })
    .catch((error) => {
      writeLog('ERROR', error);
      if (!mainWindow) {
        return;
      }
      mainWindow.loadURL(
        createStatusPage('本地服务启动失败', `请查看日志文件：${logFile || 'main.log'}`),
      );
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function resolveServerConfiguration(port) {
  if (app.isPackaged) {
    const serverRoot = path.join(process.resourcesPath, 'server');
    const serverEntry = path.join(serverRoot, 'server.js');
    return {
      nodeExecutable: path.join(process.resourcesPath, 'node', 'node.exe'),
      serverRoot,
      serverEntry,
      arguments: [serverEntry],
      mode: 'production',
    };
  }

  const projectRoot = __dirname;
  const nextEntry = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  return {
    nodeExecutable: path.join(projectRoot, 'resources', 'node', 'node.exe'),
    serverRoot: projectRoot,
    serverEntry: nextEntry,
    arguments: [nextEntry, 'dev', '-H', '127.0.0.1', '-p', String(port)],
    mode: 'development',
  };
}

function startNextServer(port) {
  const configuration = resolveServerConfiguration(port);

  if (!fs.existsSync(configuration.nodeExecutable)) {
    throw new Error(`Bundled Node.js not found: ${configuration.nodeExecutable}`);
  }
  if (!fs.existsSync(configuration.serverEntry)) {
    throw new Error(`Next.js server entry not found: ${configuration.serverEntry}`);
  }

  writeLog('INFO', 'Mode:', configuration.mode);
  writeLog('INFO', 'Server root:', configuration.serverRoot);
  writeLog('INFO', 'Bundled Node.js:', configuration.nodeExecutable);
  writeLog('INFO', 'Server entry:', configuration.serverEntry);

  nextServer = spawn(configuration.nodeExecutable, configuration.arguments, {
    cwd: configuration.serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
  });

  writeLog('INFO', 'Next.js process created, PID:', nextServer.pid);

  if (nextServer.stdout) {
    nextServer.stdout.on('data', (data) => {
      writeLog('INFO', `[Next.js] ${data.toString().trim()}`);
    });
  }

  if (nextServer.stderr) {
    nextServer.stderr.on('data', (data) => {
      writeLog('ERROR', `[Next.js] ${data.toString().trim()}`);
    });
  }

  nextServer.on('error', (error) => {
    writeLog('ERROR', 'Failed to start Next.js:', error);
  });

  nextServer.on('exit', (code, signal) => {
    writeLog('INFO', `Next.js process exited - Code: ${code}, Signal: ${signal}`);
    nextServer = null;
  });
}

function stopNextServer() {
  if (!nextServer) {
    return;
  }

  writeLog('INFO', 'Stopping Next.js process, PID:', nextServer.pid);
  nextServer.kill();
  nextServer = null;
}

app.whenReady().then(async () => {
  initializeLogging();
  Menu.setApplicationMenu(null);

  try {
    const port = await findAvailablePort();
    serverURL = `http://127.0.0.1:${port}`;
    writeLog('INFO', 'Selected local server URL:', serverURL);
    startNextServer(port);
    createWindow(serverURL);
  } catch (error) {
    writeLog('ERROR', 'Application startup failed:', error);
    app.quit();
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverURL) {
      createWindow(serverURL);
    }
  });
});

app.on('browser-window-created', (_event, window) => {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      event.preventDefault();
      window.webContents.toggleDevTools();
    }
  });
});

app.on('window-all-closed', () => {
  stopNextServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNextServer();
});
