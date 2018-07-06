
import { app, BrowserWindow, ipcMain } from "electron";
const Store = require("electron-store");


let windowDefaults = {
  height: 310,
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

function processPayload(payload: any) {
  // set the payload launch variable to the store and launch app on login or nah.
  if(payload.launch) {
    store.set('launch', true);
    app.setLoginItemSettings({
      openAtLogin: true
    });
  } else {
    store.set('launch', false);
    app.setLoginItemSettings({
      openAtLogin: false
    });
  }

  // set the minimize variable to the store
  if(payload.notification) {
    store.set('close', 'Minimize');
  } else {
    store.set('close', false);
  }
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
  processPayload(payload);
});

ipcMain.on("apply", (event: any, payload: any) => {
  processPayload(payload);
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

    // send the initial state of the store to the prefs page
    let close = store.get('close');
    let launch = store.get('launch');
    setTimeout(() => {
      appWindow.webContents.send('init', {notification: close === 'Minimize', launch});
    }, 300);

  } else {
    appWindow.focus();
  }
}

export function addAppWindow(window: any) {
  mainWindow = window;
}