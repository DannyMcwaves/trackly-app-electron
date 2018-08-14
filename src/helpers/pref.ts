
import { app, BrowserWindow, ipcMain, shell } from "electron";
const Store = require("electron-store");
import { autoUpdater } from "electron-updater";
import {Emitter} from "./emitter";


let windowDefaults = {
  height: 310,
  width: 600,
  minWidth: 600,
  title: "Preferences",
  center: false,
  show: false,
  resizable: false,
  movable: true,
  maximizable: false
};
let windowURL = `file://${__static}/prefs.html`;
let appWindow: BrowserWindow;
let store = new Store();
let extensionUrl = 'https://trackly.com/browser';

/**
 * Create application window for preferences.
 */
function createWindow() {

  let windowFrame = new BrowserWindow(windowDefaults);
  windowFrame.loadURL(windowURL);

  windowFrame.on('closed', (event: any) => {
    appWindow = null;
  });

  windowFrame.once('ready-to-show', () => {
    windowFrame.show();

    // send the initial state of the store to the prefs page
    let close = store.get('close');
    let launch = store.get('launch');
    setTimeout(() => {
      windowFrame.webContents.send('init', {notification: close === 'Minimize', launch});
    }, 100);

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

function processUpdates() {

  // set autoDownload to true;
  autoUpdater.autoDownload = false;

  // Updater
  autoUpdater.checkForUpdates();

  // event listeners for the autoUpdater.
  autoUpdater.on('checking-for-update', () => {
    appWindow.webContents.send('checking-for-update');
  });

  autoUpdater.on('update-available', (ev, info) => {
    appWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-not-available', (ev, info) => {
    appWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('error', (ev, err) => {
    appWindow.webContents.send('update-error');
  });

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
  Emitter.mainWindow.webContents.send('clickLoggingOut');
});

ipcMain.on('update', (event: any) => {
  processUpdates();
});

ipcMain.on('extension', (event: any) => {
  shell.openExternal(extensionUrl);
});

export function createPrefWindow() {
  if (!appWindow) {
    appWindow = createWindow();
  } else {
    appWindow.focus();
  }
}
