// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Keep a global reference to the window object
let mainWindow = null;
let tray = null;
let isQuitting = false;

// Development mode detection
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// CREATE WINDOW
function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'School MIS Pro',
    icon: path.join(__dirname, '../www/icons/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  // Load the app
  const indexPath = isDev 
    ? 'http://localhost:8080' 
    : path.join(__dirname, '../www/index.html');

  console.log('Loading app from:', indexPath);
  
  if (isDev) {
    mainWindow.loadURL(indexPath);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle renderer process crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
    // Attempt to reload
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  console.log('Main window created successfully');
}

// CREATE TRAY
function createTray() {
  console.log('Creating tray...');
  
  const iconPath = path.join(__dirname, '../www/icons/icon-512.png');
  
  if (!fs.existsSync(iconPath)) {
    console.warn('Tray icon not found:', iconPath);
    return;
  }

  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show School MIS Pro',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', '/dashboard');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('School MIS Pro');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  console.log('Tray created successfully');
}

// AUTO UPDATER
function setupAutoUpdater() {
  if (isDev) return;
  
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available');
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  console.log('Auto-updater configured');
}

// IPC HANDLERS
function setupIpcHandlers() {
  // Save file
  ipcMain.handle('save-file', async (event, { data, defaultName, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, Buffer.from(data));
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  // Open file
  ipcMain.handle('open-file', async (event, { filters }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const content = fs.readFileSync(result.filePaths[0], 'utf8');
      return { success: true, data: content, path: result.filePaths[0] };
    }
    return { success: false };
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Get app path
  ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
  });

  console.log('IPC handlers configured');
}

// APP LIFECYCLE
app.whenReady().then(() => {
  console.log('App is ready');
  console.log('App version:', app.getVersion());
  console.log('Is packaged:', app.isPackaged);
  console.log('User data path:', app.getPath('userData'));
  console.log('App path:', app.getAppPath());

  createWindow();
  createTray();
  setupIpcHandlers();
  setupAutoUpdater();

  // Handle protocol
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('school-mis');
    }
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle before quit
app.on('before-quit', () => {
  isQuitting = true;
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

console.log('Electron main process initialized');