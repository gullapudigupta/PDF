const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/pdf-viewer-editor/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (result.canceled) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);

  return {
    canceled: false,
    filePath,
    fileName: path.basename(filePath),
    fileData: fileBuffer.toString('base64'),
  };
});

ipcMain.handle('dialog:saveFile', async (event, { defaultPath, data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (result.canceled) {
    return { canceled: true };
  }

  const buffer = Buffer.from(data, 'base64');
  fs.writeFileSync(result.filePath, buffer);

  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return { success: true, data: fileBuffer.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:writeFile', async (event, { filePath, data }) => {
  try {
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
