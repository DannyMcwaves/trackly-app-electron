import { app, BrowserWindow, ipcMain, shell } from "electron";
import Activity from "./activity";
import { autoUpdater } from "electron-updater";

// Define application mode (production or development)
const isDevelopment = process.env.NODE_ENV !== "production";
let syncInterval = process.env.ELECTRON_WEBPACK_APP_SYNC_INTERVAL || "600";

// Globals
const masterActivity = Activity;
let activityObservable: any;
let appWindow: BrowserWindow;
let windowURL: string;
let windowDefaults = {
  height: 0,
  width: 400,
  minWidth: 400,
  title: "Trackly",
  center: true,
  show: false,
  resizable: true,
  movable: true,
  webPreferences: {
    webSecurity: false // TODO: Remove in production!
  }
};

// Dev & Production settings
if (isDevelopment) {
  windowURL = `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`;
} else {
  windowURL = `file://${__dirname}/index.html`;
  windowDefaults.resizable = false;
}

/**
 * Create application wind
 */
function createApplicationWindow() {
  let windowFrame = new BrowserWindow(windowDefaults);
  windowFrame.loadURL(windowURL);

  windowFrame.on("closed", () => {
    appWindow = null;
  });

  return windowFrame;
}

app.on("window-all-closed", () => {
  // On macOS it is common for applications to stay open
  // until the user explicitly quits
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS it is common to re-create a window
  // even after all windows have been closed
  if (appWindow === null) appWindow = createApplicationWindow();
});

// Create main BrowserWindow when electron is ready
app.on("ready", () => {
  appWindow = createApplicationWindow();

  // Updater
  autoUpdater.checkForUpdatesAndNotify();

  setInterval(function() {
    const timeStamp = masterActivity.rotateActivityFile();
    if (timeStamp) {
      appWindow.webContents.send("sync:update", timeStamp);
    }
  }, parseInt(syncInterval) * 1000);
});
/**
 * Open link in an external browser window.
 */
ipcMain.on("open:link", (event: any, link: string) => {
  shell.openExternal(link);
});

/**
 * Set a specific window height.
 */
ipcMain.on("win:height", (event: any, height: number) => {
  const toolBar = appWindow.getSize()[1] - appWindow.getContentSize()[1]
  appWindow.setSize(windowDefaults.width, height + toolBar);
  appWindow.show();
});

/**
 * Main activity timer logic and observable
 */
ipcMain.on("timer", (event: any, args: any) => {
  // Start timer, subscribe to activity observer
  if (args.action == "start") {
    activityObservable = masterActivity
      .startTimer(args.userId, args.workspaceId, args.projectId)
      .subscribe(userActive => {
        appWindow.webContents.send("timer:tick", {});
        masterActivity.appendActivity(userActive);
      });
  }

  // Stop timer
  if (args.action == "stop") {
    activityObservable.unsubscribe();
    masterActivity.stopTimer();
  }
});
