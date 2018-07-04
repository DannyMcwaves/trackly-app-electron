
import { app, BrowserWindow, ipcMain } from "electron";
const Store = require("electron-store");


let windowDefaults = {
  height: 300,
  width: 600,
  minWidth: 600,
  title: "Preferences",
  center: false,
  show: true,
  resizable: false,
  movable: true,
  maximizable: false,
  webPreferences: {
    webSecurity: true
  }
};
let windowURL = `file://${__static}/prefs.html`;
let appWindow: BrowserWindow;
let mainWindow: any;
let store = new Store();

/**
 * Create application window for preferences.
 */
function createWindow() {

  let windowFrame = new BrowserWindow(windowDefaults);
  windowFrame.loadURL(windowURL);

  windowFrame.on('closed', (event: any) => {
    appWindow = null;
  });

  return windowFrame;
}

/**
 * listen to the cancel event coming from the preferences page.
 */
ipcMain.on("cancel", (event: any, payload: any) => {
  appWindow.close();
});

/**
 * listen to the preferences event coming from the preferences page
 */
ipcMain.on("ok", (event: any, payload: any) => {
  appWindow.close();
  if(payload.launch) {
    console.log("set the app to restart on login");
  }
  if(payload.notification) {
    store.set('close', 'Minimize');
  } else {
    store.set('close', null);
  }
});

ipcMain.on("apply", (event: any, payload: any) => {
  if(payload.launch) {
    console.log("set the app to restart on login");
  }
  if(payload.notification) {
    store.set('close', 'Minimize');
  } else {
    store.set('close', null);
  }
});

/**
 * when an event to open the preferences pane is fired
 */
ipcMain.on('openPref', (event: any) => {
  createPrefWindow();
});

// when an event asks to be logout
ipcMain.on('logout', (event: any) => {
  appWindow.close();
  if (mainWindow) {
    mainWindow.webContents.send('logout');
  }
});

export function createPrefWindow() {
  if (!appWindow) {
    appWindow = createWindow();
  }
}

export function addAppWindow(window: any) {
  mainWindow = window;
}