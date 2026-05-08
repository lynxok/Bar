const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');


function createWindow() {
  // Configuración del actualizador
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdatesAndNotify();
  
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:3000');
    // win.webContents.openDevTools(); // Desactivado por defecto en dev si no se requiere
  }

  // Eventos del auto-updater
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    win.webContents.send('update-error', err.message);
  });
}

// IPC para control manual desde el renderer
ipcMain.on('check-update', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('apply-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

app.whenReady().then(createWindow);

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
