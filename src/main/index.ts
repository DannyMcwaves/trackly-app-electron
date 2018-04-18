import * as logger from "electron-log";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import {config} from 'dotenv';
import { autoUpdater } from "electron-updater";
import { Timer } from "../helpers/timer";
import { Activity } from "../helpers/activity";
import { Fscs } from "../helpers/fscs";
import { Uploader } from "../helpers/uploader";

// Logger
logger.transports.file.level = "debug";
autoUpdater.logger = logger;

// config environment variables in .env
config();

// Helpers
const fscs = new Fscs();
const timer = new Timer();
const activity = new Activity(fscs);
const uploader = new Uploader(fscs);

// Define application mode (production or development)
const isDevelopment = process.env.NODE_ENV !== "production";
let syncInterval = process.env.ELECTRON_WEBPACK_APP_SYNC_INTERVAL || "600";

// Globals
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

// Ensure only one instance of the application gets run
const isSecondInstance = app.makeSingleInstance(
  (commandLine, workingDirectory) => {
    if (appWindow) {
      if (appWindow.isMinimized()) appWindow.restore();
      appWindow.focus();
    }
  }
);

if (isSecondInstance) {
  app.quit();
}

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
  timer.complete();

  // On macOS it is common for applications to stay open
  // until the user explicitly quits
  if (process.platform !== "darwin") {
    setTimeout(() => { app.quit() }, 1000);
  }
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

  // Start file rotation
  setInterval(function() {
    fscs.rotate();
    // upload files within 10min interval after every rotation.
    uploader.upload(() => {
        if (appWindow) { appWindow.webContents.send("sync:update", Date.now()); }
    });
  }, 600000);

});

/**
 * ===============
 * == OPEN LINK ==
 * ===============
 */
ipcMain.on("open:link", (event: any, link: string) => {
  shell.openExternal(link);
});

/**
 * ===================
 * == WINDOW HEIGHT ==
 * ===================
 */
ipcMain.on("win:height", (event: any, height: number) => {
  const toolBar = appWindow.getSize()[1] - appWindow.getContentSize()[1];
  appWindow.setSize(windowDefaults.width, Math.round(height + toolBar));
  appWindow.show();
});

/**
 * ===========
 * == TIMER ==
 * ===========
 */
ipcMain.on("timer", (event: any, args: any) => {
  // Start timer
  if (args.action == "start") {
    // Get a file
    fscs.newActivityFile(args);
    fscs.appendEvent("startLogging", fscs.getActFile());

    // Take screenshot
    fscs.takeScreenshot(args.timestamp);

    timer.ticker.subscribe(
      async tick => {
        activity.measure(tick);
        if (appWindow) { appWindow.webContents.send("timer:tick", args.projectId); }
      },
      err => {
        logger.error("Failed to start the timer");
      },
      () => {
        activity.stop();
        logger.log("Timer stopped..");
        fscs.appendEvent("stopLogging", fscs.getActFile());
        fscs.unloadActFile();

        uploader.upload(() => {
          if (appWindow) { appWindow.webContents.send("sync:update", Date.now()); }
        });
      }
    );
  }

  // Stop timer
  if (args.action == "stop") {
    timer.complete();
  }
});
