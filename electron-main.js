const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'public/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: '角色卡设计器 - Character Card Designer',
  });

  // 等待服务器启动
  const startURL = 'http://localhost:3000';
  
  const waitForServer = () => {
    const http = require('http');
    http.get(startURL, () => {
      mainWindow.loadURL(startURL);
    }).on('error', () => {
      setTimeout(waitForServer, 200);
    });
  };

  waitForServer();

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 启动 Next.js 服务器
function startNextServer() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // 开发模式：使用 npm run dev
    nextServer = spawn('npm', ['run', 'dev'], {
      shell: true,
      cwd: __dirname,
    });
  } else {
    // 生产模式：使用 Node.js 可执行文件路径
    const isWin = process.platform === 'win32';
    const nodeExe = isWin ? 'node.exe' : 'node';
    const nodePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.bin', nodeExe);
    
    // 尝试不同的路径
    let nextBin;
    if (require('fs').existsSync(nodePath)) {
      nextBin = nodePath;
    } else {
      // 使用系统 node（如果存在）
      nextBin = 'node';
    }
    
    const nextScript = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    
    nextServer = spawn(nextBin, [nextScript, 'start'], {
      cwd: __dirname,
      env: { ...process.env, PORT: '3000' },
      stdio: 'pipe',
      windowsHide: true
    });
  }

  if (nextServer) {
    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (err) => {
      console.error('Failed to start Next.js:', err);
    });
  }
}

// 应用准备好时
app.whenReady().then(() => {
  // 隐藏菜单栏
  Menu.setApplicationMenu(null);
  
  // 启动服务器
  startNextServer();
  
  // 创建窗口
  setTimeout(createWindow, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  // 关闭 Next.js 服务器
  if (nextServer) {
    nextServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

