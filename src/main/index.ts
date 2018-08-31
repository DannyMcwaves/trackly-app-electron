const logger = require('electron-log');
const unhandled = require('electron-unhandled');
unhandled(logger.error, true);
const Store = require("electron-store");

// moment addons
const moment = require('moment');
const momentDurationFormatSetup = require("moment-duration-format");

import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, MenuItemConstructorOptions, Notification } from "electron";
import { config } from 'dotenv';
import { join } from 'path';
import { autoUpdater } from "electron-updater";
import { Timer } from "../helpers/timer";
import { Activity } from "../helpers/activity";
import { Fscs } from "../helpers/fscs";
import { Uploader } from "../helpers/uploader";
import { Emitter } from "../helpers/emitter";
import { ActiveWindow } from "../helpers/windows";
import { Idler } from '../helpers/idle';
import { app as appServer, portAvailable } from '../helpers/server';
import { createPrefWindow } from "../helpers/pref";
import { Utility } from "../helpers/utility";

// config environment variables in .env
config();

//setup logger with version number, in dev mode this will log electron version
logger.transports.file.format = `{y}-{m}-{d} {h}:{i}:{s}:{ms} ${app.getVersion()} {text}`;

// Helpers
const fscs = new Fscs();
const timer = new Timer();
const activity = new Activity(fscs);
const uploader = new Uploader(fscs);
const store = new Store();
const trayMenuTemplate: MenuItemConstructorOptions[] = [
  {
    label: 'Preferences...',
    accelerator: 'CmdOrCtrl+,',
    click() {
      createPrefWindow();
    }
  },

  {
    type: 'separator'
  },

  {
    label: 'Start Tracking',
    click() {
      if(appWindow) { appWindow.webContents.send("timer:click", '0'); }
    }
  },

  {
    label: 'Stop Tracking',
    click() {
      appWindow.webContents.send("stopTimeFromTray");
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
      forceQuit = true;
      if(appWindow) {
        appWindow.close();
      } else {
        app.exit();
      }
    },
    accelerator: 'CmdOrCtrl+Q'
  }
];
const idler = new Idler(fscs, uploader);
const ports = [14197, 24197, 34197, 44197, 54197, 64197];


// setup file logger to contain all error logs from elctron-logger.
fscs.logger(logger);

// Define application mode (production or development)
const isDevelopment = process.env.NODE_ENV !== "production";
let syncInterval = process.env.ELECTRON_WEBPACK_APP_SYNC_INTERVAL || "600";

// Globals
let appWindow: BrowserWindow;
let notificationWindow: BrowserWindow;
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
  maximizable: false,
  webPreferences: {
    webSecurity: false // TODO: Remove in production!
  }
};
let stopMoment: string;
let tray: any = null;
let timeIsRunning: boolean = false;
let shotOut: any;
let server: any;
let port: any;
let close: string = 'na';
let forceQuit = false;
let restartAndInstall = false;
let appTray: any;
let appStarted: boolean;
let dir = join(__static, '/tracklyTemplate@4x.png');
let image = nativeImage.createFromPath(dir);

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
  app.exit();
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
    let val = store.get('close');

    if(val === 'Minimize') {
      if (close !== "ya" && !forceQuit) {
        event.preventDefault();
        windowFrame.minimize();
      } else if(forceQuit) {
        event.preventDefault();
        close = 'ya';
        if (windowFrame) {
          windowFrame.webContents.send("stopTimeFromTray");
        }
        setTimeout(() => {
          app.exit();
        }, 2000);
      }
    } else if(val === 'Cancel') {
      if (close !== "ya") {
        event.preventDefault();
      }
    } else if(val === 'Quit' && close === 'na') {
      event.preventDefault();
      close = 'ya';
      if (windowFrame) {
        windowFrame.webContents.send("stopTimeFromTray");
      }
      setTimeout(() => {
        windowFrame.close();
      }, 2000);
    } else if(close === 'na') {
      event.preventDefault();
      createDialog('quit', {height: 140, width: 450});
    }
  });

  windowFrame.on('closed', (event: any) => {
    appWindow = null;
    clearTimeout(shotOut);
  });

  return windowFrame;
}

function systemTray() {

  tray = new Tray(image);

  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate);

  tray.setContextMenu(trayMenu);

  tray.setTitle('00:00:00');

  tray.setToolTip("Trackly");

  tray.on('click', () => {
    if (appWindow) {
      appWindow.focus();
    }
  });

  return tray;
}

function autoAppUpdater() {
  // set autoDownload to true;
  autoUpdater.autoDownload = true;
  autoUpdater.logger = logger;

  // Updater
  autoUpdater.checkForUpdates();

  // event listeners for the autoUpdater.
  autoUpdater.on('checking-for-update', () => {});

  autoUpdater.on('update-available', (ev, info) => {

  });

  autoUpdater.on('update-not-available', (ev, info) => {
    // Squirrel for Windows should handle this, test for differential download issue
    Utility.emptyUpdateInstallerDir();
  });

  autoUpdater.on('error', (ev, err) => {
    logger.log(err);
  });

  autoUpdater.on('download-progress', (ev, progressObj) => {});

  autoUpdater.on('update-downloaded', (ev, releaseNotes, releaseName) => {
    if(appWindow) { appWindow.webContents.send("updateReady"); }
    showNotification("Update from Trackly", "Update is available.")
  });
}

function transform(value: number) {
  if (!value) { return "0:00"}
  return moment.duration(Math.round(value), "seconds").format();
}

function startServer() {
  // start the browser extension server.
  if (port) {

    server = appServer.listen(port, () => {
      logger.log("extension sever listening on", port);
    });

    server.on('error', (err: any) => {
      logger.log("port in use error");
      logger.log(err);
    });
  } else {
    portAvailable(ports).then(p => {
      if (p) {
        port = p;

        server = appServer.listen(p, () => {
          logger.log("extension sever listening on", p);
        });

        server.on('error', (err: any) => {
          logger.log("port in use error");
          logger.log(err);
        });
      }
    }).catch(err => {
      console.log(err);
    })
  }
}

function closeServer() {
  if(server) {
    server.close();
  }
}

function createDialog(url: string, defaults: object = {}) {
  // this function should create all the custom dialog boxes
  // from the Trackly static html template.
  let appDefaults = {...{ center: true, useContentSize: true, show: false}, ...defaults};

  notificationWindow = new BrowserWindow(appDefaults);
  notificationWindow.loadURL(`file://${__static}/${url}.html`);

  notificationWindow.on('closed', (event: any) => {
    notificationWindow = null;
  });

  notificationWindow.on('ready-to-show', () => {
    notificationWindow.show();
  });

  return notificationWindow;
}

function showNotification(title: string, body: string) {
  if (process.platform === 'win32') {
    if (appTray) {
      appTray.displayBalloon({title, content: body});
    }
  } else {
    if (Notification.isSupported()) {
      let notes = new Notification({ title, body });
      notes.show();
    }
  }
}

function initializeStoreVars() {
  appStarted = true;
  let extRuntime = store.get('extRuntime'),
    extInstalled = store.get('extInstalled');

  if (extRuntime === undefined && extInstalled === undefined) {
    shell.openExternal('https://trackly.com/browser');
    store.set("extRuntime", true);
  }
}

app.on("window-all-closed", () => {

  // before the window is finally closed, complete all timers.
  timer.complete();

  // upload any error file to the error server.
  uploader.uploadErrorReports();

  // On macOS it is common for applications to stay open
  // until the user explicitly quits
  if (process.platform !== "darwin") {
    setTimeout(() => { app.exit() }, 1000);
  }
});

app.on("activate", () => {
  // On macOS it is common to re-create a window
  // even after all windows have been closed
  if (appWindow === null) appWindow = createApplicationWindow();
});

// Create main BrowserWindow when electron is ready
app.on("ready", () => {

  // create the main window application
  appWindow = createApplicationWindow();

  // initiate the system tray program.
  appTray = systemTray();

  // start the autoUpdater
  autoAppUpdater();

  // add the main window to the prefs page.
  Emitter.mainWindow = appWindow;

  // initialize startup variables.
  initializeStoreVars();

  // get the idler program up and running.
  idler.createParent(appWindow);

});

/**
 * dialog to quit the desktop application.
 */
ipcMain.on('quit', (event: any, res: any) => {

  if(notificationWindow) {
    notificationWindow.close();
  }

  if (res.checked) {
    store.set("close", res.value);
  }
  if(res.value === 'Minimize') {
    appWindow.minimize();
  } else if(res.value === 'Quit') {
    close = 'ya';
    if (appWindow) {
      appWindow.webContents.send("stopTimeFromTray");
    }
    setTimeout(() => {
      appWindow.close();
    }, 2000);
  }
});

/**
 * show notification for tracking time and for extension install
 */
ipcMain.on("show:notification", (event: any, res: any) => {
  showNotification("Reminder from Trackly", "Don't forget to track your time and own the day")
});

/**
 * when an update is available
 * close the dialog window
 */
ipcMain.on('updateAvailable', (event: any) => {
  if(notificationWindow) {
    notificationWindow.close();
  }
});

/**
 * restart and apply new updates
 */
ipcMain.on('restart', (event: any, res: any) => {

  if(notificationWindow) {
    notificationWindow.close();
  }
 console.log(res);
  if (res.restart) {
    store.delete('close');
    close = 'ya';
    restartAndInstall = true;
    if (timeIsRunning) {
      appWindow.webContents.send("stopTimeFromTray");
    } else {
      autoUpdater.quitAndInstall();
    }
  }
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

  Emitter.currentTime = transformedTime;

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

  const projies = projects.map((item: any) => (
      {label: item.title, click() {
        if(appWindow) { appWindow.webContents.send("timer:click", item.id); }
      }}
    ));

  if (projies.length) {
    trayMenuTemplate[2].submenu = projies
  } else {
    trayMenuTemplate[2] = {
      label: 'Start Tracking',
      click() {
        if(appWindow) { appWindow.webContents.send("timer:click", '0'); }
      }
    }
  }

  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate);

  tray.setContextMenu(trayMenu);
});

/*
 * check for updates on the next day
 * */
ipcMain.on('checkUpdates', (event: any) => {

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
      icon: image,
      buttons: ['OK'],
      title: 'Updater',
      message: 'New version available...',
      detail: 'A new version of Trackly is Available. Please restart app to download new version.'
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
 * start the initiation of reset time by rotating data
 */
ipcMain.on("resetTimer", (event: any) => {
  idler.resetUpload();
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

    // when the user starts the timer
    Emitter.resetAppState();

    // append the startLogging event to the app data emitter.
    Emitter.appendEvent("startLogging", args.date, {projectId: args.projectId});

    idler.currentProject(args);

    Emitter.currentProject = args.title;

    Emitter.currentProjectId = args.projectId;

    timeIsRunning = true;

    // Take screenshot within a random time during the first 60 secs.
    // shotOut = setTimeout(() => {fscs.takeScreenshot(args.timestamp);}, Math.random() * 60000);

    // current window on action.
    ActiveWindow.current(0);

    // start the browser extension server.
    startServer();

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

        let stopTime = moment().milliseconds(-1000);

        // stop window.
        ActiveWindow.stopWindow();

        Emitter.lastSynced = stopTime;

        // append stop logging to the global app state.
        Emitter.appendEvent("stopLogging", stopTime, {projectId: args.projectId});

        // upload files through the idler
        idler.stopUpload({});

        if (restartAndInstall) {
          autoUpdater.quitAndInstall();
        }
      }
    );

    // start 10 minutes interval uploads and file rotation.
    idler.startInterval();
  }

  // Stop timer and clear the uploads interval.
  if (args.action == "stop") {
    stopMoment = args.date;
    timeIsRunning = false;
    idler.clearInterval();
    clearTimeout(shotOut);
    timer.complete();
    closeServer();
  }
});
