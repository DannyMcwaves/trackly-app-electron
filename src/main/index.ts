import * as logger from "electron-log";
const Store = require("electron-store");

// moment addons
const moment = require('moment');
const momentDurationFormatSetup = require("moment-duration-format");

import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, MenuItemConstructorOptions } from "electron";
import { config } from 'dotenv';
import { join } from 'path';
import { autoUpdater } from "electron-updater";
import { Timer } from "../helpers/timer";
import { Activity } from "../helpers/activity";
import { Fscs } from "../helpers/fscs";
import { Uploader } from "../helpers/uploader";
import { Emitter } from "../helpers/emitter";
import { Idler } from '../helpers/idle';

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
const trayMenuTemplate: MenuItemConstructorOptions[] = [
  {
    label: 'Start Tracking',
    submenu: [
      {label: 'No Projects'}
    ]
  },

  {
    label: 'Stop Tracking',
    click() {
      appWindow.webContents.send("timer:stop");
    }
  },

  {
    type: 'separator'
  },

  {
    label: 'Dashboard',
    click() {
      shell.openExternal('https://trackly.com/app?token=' + store.get('token'));
    }
  },

  {
    type: 'separator'
  },

  {
    label: 'Quit',
    click() {
      app.quit();
    },
    accelerator: 'CmdOrCtrl+Q',
    role: 'quit'
  }
];
const idler = new Idler(fscs, uploader);

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
let tray: any = null;
let timeIsRunning: boolean = false;
let shotOut: any;

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

  windowFrame.on("close", (event: any) => {
    if (timeIsRunning) {
      event.preventDefault();
      dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'You\'re currently tracking time, are you sure you want to quit?'
      }, function (response) {
        if (response === 0) {
          timeIsRunning = false;
          windowFrame.close();
          idler.closeWindow();
        }
      })
    }
  });

  windowFrame.on('closed', (event: any) => {
    appWindow = null;
    clearTimeout(shotOut);
  });

  return windowFrame;
}

function systemTray() {

  let dir = join(__static, '/tracklyTemplate.png');

  let image = nativeImage.createFromPath(dir);

  tray = new Tray(image);

  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate);

  tray.setContextMenu(trayMenu);

  tray.setTitle('00:00:00');
}

function autoAppUpdater() {
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
}

function transform(value: number) {
  if (!value) { return "0:00"}
  return moment.duration(Math.round(value), "seconds").format();
}

app.on("window-all-closed", () => {

  // before the window is finally closed, complete all timers.
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

  systemTray();

  appWindow = createApplicationWindow();

  autoAppUpdater();

  idler.createWindow(windowURL, appWindow);

});

/**
 * when the timer is running and the seconds are getting updated
 */
ipcMain.on('time:travel', (event:any, time: any) => {
  let transformedTime = transform(time),
    splitTime = transformedTime.split(':');
  if (splitTime[0].length === 1) {
    transformedTime = '0' + transformedTime;
  }
  if (transformedTime.indexOf(':') === transformedTime.lastIndexOf(':')) {
    transformedTime = '00:' + transformedTime;
  }
  tray.setTitle(transformedTime);
});

/*
 * set the status of the running application
 */
ipcMain.on('isrunning', (event: any, status: boolean) => {
  timeIsRunning = status;
});

/*
* when the user logs in and projects are available.
* */
ipcMain.on('projects', (event: any, projects: [{}]) => {

  trayMenuTemplate[0].submenu = projects.map((item: any) => (
      {label: item.title, click() {
        appWindow.webContents.send("timer:click", item.id);
      }}
    ));

  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate);

  tray.setContextMenu(trayMenu);
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
    fscs.appendEvent("startLogging", fscs.getActFile(), args.date, {projectId: args.projectId});

    idler.currentProject(args);

    // Take screenshot within a random time during the first 60 secs.
    shotOut = setTimeout(() => {fscs.takeScreenshot(args.timestamp);}, Math.random() * 60000);

    timer.ticker.subscribe(
      async tick => {
        // measure activity
        activity.measure(tick);

        // per every tick of the timer, check idle time.
        idler.logTick(tick);

        // send tick to the web app
        if (appWindow) { appWindow.webContents.send("timer:tick", args.projectId); }
      },
      err => {
        logger.error("Failed to start the timer");
      },
      () => {

        // stop the timer;
        activity.stop();

        // log the timer stopped
        logger.log("Timer stopped..");

        let actFile = fscs.getActFile();

        // append stopLogging and unload the current activities file.
        fscs.appendEvent("stopLogging", actFile, stopMoment, {projectId: args.projectId});

        // upload files through the idler
        idler.stopUpload();
      }
    );

    // start 10 minutes interval uploads and file rotation.
    idler.startInterval();
  }

  // Stop timer and clear the uploads interval.
  if (args.action == "stop") {
    stopMoment = args.date;
    idler.clearInterval();
    clearTimeout(shotOut);
    timer.complete();
  }
});
