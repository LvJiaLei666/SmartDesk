// main/index.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { setupIpcHandlers } from './ipc-handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');

let mainWindow;

function setupDevTools(win) {
  if (!isDev) return;

  win.webContents.openDevTools({ mode: 'detach' });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const isF12 = input.key === 'F12';
    const isToggleShortcut =
      process.platform === 'darwin'
        ? input.key.toLowerCase() === 'i' && input.meta && input.alt
        : input.key.toLowerCase() === 'i' && input.control && input.shift;

    if (isF12 || isToggleShortcut) {
      win.webContents.toggleDevTools();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,   // 安全：开启上下文隔离
      nodeIntegration: false,    // 安全：禁用 Node 集成
    },
    titleBarStyle: 'hiddenInset',
    title: 'SmartDesk AI',
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  setupDevTools(mainWindow);
}

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers(ipcMain, mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});