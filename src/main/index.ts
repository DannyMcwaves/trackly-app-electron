import { app, BrowserWindow, ipcMain, shell } from "electron";
import Activity from "./activity";

// Define application mode (production or development)
const isDevelopment = process.env.NODE_ENV !== "production";
let syncInterval = process.env.ELECTRON_WEBPACK_APP_SYNC_INTERVAL || "600";

// Globals
const masterActivity = Activity;
let appWindow: BrowserWindow;
let activityObservable: any;

/**
 * Create application wind
 */
function crateApplicationWindow() {
  const window = new BrowserWindow({
    height: 0,
    width: 400,
    minWidth: 400,
    title: "Trackly Desktop",
    center: true,
    show: false,
    resizable: true, // Only for dev
    movable: true,
    webPreferences: {
      webSecurity: false // TODO: Remove in production!
    }
  });

  // points to `webpack-dev-server` in development
  // points to `index.html` in production
  const url = isDevelopment
    ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
    : `file://${__dirname}/dist/renderer/index.html`;

  if (isDevelopment) {
    // window.webContents.openDevTools();
  }

  window.loadURL(url);

  window.on("closed", () => {
    appWindow = null;
  });

  return window;
}

app.on("window-all-closed", () => {
  // On macOS it is common for applications to stay open
  // until the user explicitly quits
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS it is common to re-create a window
  // even after all windows have been closed
  if (appWindow === null) appWindow = crateApplicationWindow();
});

// Create main BrowserWindow when electron is ready
app.on("ready", () => {
  appWindow = crateApplicationWindow();
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
  appWindow.setSize(400, height);
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
