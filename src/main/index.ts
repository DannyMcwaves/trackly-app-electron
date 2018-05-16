import * as logger from "electron-log";
const Store = require("electron-store");
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import {config} from 'dotenv';
import { autoUpdater } from "electron-updater";
import { Timer } from "../helpers/timer";
import { Activity } from "../helpers/activity";
import { Fscs } from "../helpers/fscs";
import { Uploader } from "../helpers/uploader";
// import { Idler } from '../helpers/idle';

// Logger
autoUpdater.logger = logger;

// config environment variables in .env
config();

// Helpers
const fscs = new Fscs();
const timer = new Timer();
const activity = new Activity(fscs);
const uploader = new Uploader(fscs);
const store = new Store();
// const idler = new Idler(fscs);

// setup file logger to contain all error logs from elctron-logger.
fscs.logger(logger);

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
let interval: any;
let stopMoment: string;

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
  // windowFrame.webContents.openDevTools();
  windowFrame.loadURL(windowURL);

  windowFrame.on("closed", () => {
    appWindow = null;
  });

  return windowFrame;
}


function sendStatusToWindow(text: any) {
  logger.info(text);
  appWindow.webContents.send('message', text);
}


function startInterval() {
  return setInterval(function() {
    let returnValue = fscs.rotate();
    // start upload when activity file are successfully rotated.
    if (returnValue) {
        // upload files within 10min interval after every rotation.
        uploader.upload(() => {
            if (appWindow) { appWindow.webContents.send("sync:update", Date.now()); }
        });
    }
  }, 600000);
}

app.on("window-all-closed", () => {
  timer.complete();

  // upload any error file to the error server.
  uploader.uploadErrorReports();

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

  // set autoDownload to true;
  autoUpdater.autoDownload = true;

  // Updater
  autoUpdater.checkForUpdates();

  // event listeners for the autoUpdater.
  autoUpdater.on('checking-for-update', () => {
    logger.log('checking for updates.....');
  });

  autoUpdater.on('update-available', (ev, info) => {
    logger.log('Update available.');
    const dialogOpts = {
      type: 'info',
      buttons: ['OK'],
      title: 'Updater',
      message: 'Trackly is updating...',
      detail: 'A new version of Trackly is downloading. This should take a couple of seconds.'
    };
    dialog.showMessageBox(dialogOpts, (response) => {
      logger.log(response);
    });
  });

  autoUpdater.on('update-not-available', (ev, info) => {
    logger.log('No updates available at this time.');
  });

  autoUpdater.on('error', (ev, err) => {
    logger.log(err);
  });

  autoUpdater.on('download-progress', (ev, progressObj) => {
    logger.log(progressObj);
  });

  autoUpdater.on('update-downloaded', (ev, releaseNotes, releaseName) => {
    console.log('download completed');
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    };

    dialog.showMessageBox(dialogOpts, (response) => {
        if (response === 0) {
          // delete accessToken and userId before installing newer updates.
          store.delete("token");
          store.delete("userId");
          autoUpdater.quitAndInstall();
        }
    });
  });

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
  const toolBar = (appWindow.getSize()[1] - appWindow.getContentSize()[1]) || 22;
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
    fscs.appendEvent("startLogging", fscs.getActFile(), args.date);

    // Take screenshot within a random time during the first 60 secs.
    setTimeout(() => {fscs.takeScreenshot(args.timestamp);}, Math.random() * 60000);

    timer.ticker.subscribe(
      async tick => {
        activity.measure(tick);
        // idler.logTick(tick);
        if (appWindow) { appWindow.webContents.send("timer:tick", args.projectId); }
      },
      err => {
        logger.error("Failed to start the timer");
      },
      () => {
        activity.stop();
        logger.log("Timer stopped..");
        let actFile = fscs.getActFile();
        fscs.appendEvent("stopLogging", actFile, stopMoment);
        fscs.unloadActFile();

        uploader.upload(() => {
          if (appWindow) { appWindow.webContents.send("sync:update", Date.now()); }
        });
      }
    );

    // start 10 minutes interval uploads and file rotation.
    interval = startInterval();
  }

  // Stop timer and clear the uploads interval.
  if (args.action == "stop") {
    stopMoment = args.date;
    timer.complete();
    clearInterval(interval);
  }
});
