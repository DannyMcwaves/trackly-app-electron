
import * as desktopIdle from 'desktop-idle';
import { Fscs } from './fscs';
import { Emitter } from './emitter';
import { Uploader } from './uploader';
import { activityStorage } from "./activity";
import { app, BrowserWindow, ipcMain } from "electron";
import { ActiveWindow } from "./windows";
import * as moment from "moment";


export class Idler {

  private _parentWindow: BrowserWindow;
  private _projects: any;
  private _activeProject: any;
  private _idled: number = 0;
  private fscs: Fscs;
  private uploader: Uploader;
  private _upload: boolean = true;
  private _interval: any;
  private _idleInterval: any;
  private _interruptIdler: boolean = false;
  private _isIdle: boolean = false;
  private _idleOpen: boolean = false;

  constructor(fscs: any, uploader: any) {
    this.uploader = uploader;
    this.fscs = fscs;
    ipcMain.on("idleResponse", (event: any, res: any) => {
      this.processIdleAction(res);
    });
  }

  appendAllToJson() {

    // append new activities if available before generating new file.
    if(activityStorage.duration > 0) {
      Emitter.appendActivity(activityStorage.userStatus, activityStorage.duration);
    }

    let temp = JSON.stringify(Emitter.appState),
      actFile = this.fscs.getActFile();

    Emitter.appState = {activities: [], events: []};

    if (actFile) {
      this.fscs.appendMain(actFile, temp);
    }
  }

  upload() {

    if (this._upload) {

      ActiveWindow.stopWindow();

      this.appendAllToJson();

      let returnValue = this.fscs.rotate();
      // start upload when activity file are successfully rotated.
      if (returnValue) {
        // upload files within 10min interval after every rotation.
        this.uploader.upload(() => {
          Emitter.lastSynced = moment().milliseconds(0);
          if (this._parentWindow) { this._parentWindow.webContents.send("sync:update", Date.now()); }
        });
      }
    }
  }

  resetUpload() {
    ActiveWindow.stopWindow();

    this.appendAllToJson();

    let returnValue = this.fscs.rotate();
    // start upload when activity file are successfully rotated.

    Emitter.lastSynced = moment().milliseconds(0);

    // upload files within 10min interval after every rotation.
    if (returnValue) {
      this.uploader.upload(() => {
        if (this._parentWindow) { this._parentWindow.webContents.send("resetTimer"); }
      });
    } else {
      if (this._parentWindow) { this._parentWindow.webContents.send("resetTimer"); }
    }
  }

  stopUpload(res: any) {
    // delegate the uploader for the stopper program to the idler program.
    // when the user was idle and the idler kicks in, do not upload the activities file
    // on stop.

    if (this._upload) {

      this.appendAllToJson();

      this.fscs.unloadActFile();

      // upload activity files and screenshots to the backend.
      this.uploader.upload(() => {
        if (this._parentWindow) {
          if (res.reset) {
            this._parentWindow.webContents.send("resetTimer");
          } else {
            this._parentWindow.webContents.send("sync:update", Date.now());
          }
        }
      });
    }
  }

  createParent(parent: any) {
    this._parentWindow = parent;
  }

  createWindow() {
    if (this._parentWindow) {
      this._parentWindow.webContents.send("idler");
    }
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
    if (this._parentWindow) {
      this._parentWindow.webContents.send("idletime", time);
    }
  }

  projects(projects: any) {
    this._projects = projects;
  }

  currentProject(project: any) {
    this._activeProject = project;
  }

  startInterval() {
    this._interval = setInterval(() => { this.upload() }, 600000);
  }

  clearInterval() {
    clearInterval(this._interval);
  }

  public logTick(tick:any) {
    const idle = this.idleTime();
    this._upload = !(idle >= 598);

    if (idle >= 600) {
      let time;
      if (this._interruptIdler) {
        time = this._idled + 2;
      } else {
        time = idle;
        this._interruptIdler = false;
      }
      this._isIdle = true;
      this.startIdleTime(time);
    } else if(this._isIdle) {
      this._interruptIdler = true;
      this.startIdleTime(this._idled + 2);
    }
  }

  startIdleTime(time: any) {

    if (!this._idleOpen) {
      this.createWindow();
      this._idleOpen = true;
    }

    // set idled to the timer passed
    this._idled = time;

    // show keep sending the time to the window.
    this.idleDialog(Math.floor(this._idled / 60));

    // start the idle timer interval
    if(!this._idleInterval) {

      // when this happens start tracking the idle time by stopping the main tracker.
      this._parentWindow.webContents.send("stopTimeFromTray");

      this._parentWindow.focus();

      this._parentWindow.flashFrame(true);

      // app.dock.bounce("informational");

      Emitter.appendEvent("startIdle", moment().milliseconds(0).toISOString(), "");

      setTimeout(() => {
        this._parentWindow.flashFrame(false);
      }, 2000);

      this._idleInterval = setInterval(() => {
        this.logTick({});
      }, 2000);

    }

  }

  processIdleAction(idleResponse: any) {

    this._upload = true;

    Emitter.appendEvent("stopIdle", moment().milliseconds(600000).toISOString(), "");

    clearInterval(this._idleInterval);
    this._interruptIdler = false;
    this._isIdle = false;
    this._idled = 0;
    this._idleOpen = false;
    this._idleInterval = undefined;

    this.stopUpload(idleResponse);
  }

}
