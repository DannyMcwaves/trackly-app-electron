
import * as desktopIdle from 'desktop-idle';
import { Fscs } from './fscs';
import { Uploader } from './uploader';
import { dialog, BrowserWindow, ipcMain } from "electron";
import * as moment from "moment";


export class Idler {

  private _window: BrowserWindow;
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

  upload() {
    let returnValue = this.fscs.rotate();
    // start upload when activity file are successfully rotated.
    if (returnValue) {
      // upload files within 10min interval after every rotation.
      this.uploader.upload(() => {
        if (this._parentWindow) { this._parentWindow.webContents.send("sync:update", Date.now()); }
      });
    }
  }

  stopUpload() {
    // delegate the uploader for the stopper program to the idler program.
    // when the user was idle and the idler kicks in, do not upload the activities file
    // on stop.
    if (this._upload) {
      this.fscs.unloadActFile();

      // upload activity files and screenshots to the backend.
      this.uploader.upload(() => {
        if (this._parentWindow) { this._parentWindow.webContents.send("sync:update", Date.now()); }
      });
    }
  }

  createWindow(url: string, parent: any) {
    this._parentWindow = parent;
    this._window = new BrowserWindow({frame: false, height: 207, width: 500, show: false, parent});
    this._window.loadURL(`file://${__static}/index.html`);
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
    this._window.webContents.send("idletime", time);
  }

  projects(projects: any) {
    this._projects = projects;
    this._window.webContents.send("projects", projects);
  }

  currentProject(project: any) {
    this._activeProject = project;
    this._window.webContents.send('currentProject', project.title);
  }

  startInterval() {
    this._interval = setInterval(() => { this.upload() }, 600000);
  }

  clearInterval() {
    clearInterval(this._interval);
  }

  public logTick(tick:any) {
    const idle = this.idleTime();
    if(idle > 59) {
      this._upload = false;
    }
    if (idle >= 60) {
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

    // set idled to the timer passed
    this._idled = time;

    // show keep sending the time to the window.
    this.idleDialog(Math.floor(this._idled / 60));

    // start the idle timer interval
    if(!this._idleInterval) {

      // when this happens start tracking the idle time by stopping the main tracker.
      this._parentWindow.webContents.send("timer:stop");
      setTimeout(() => {
        let actFile = this.fscs.getActFile();

        this.fscs.appendEvent("startIdle", actFile, moment().milliseconds(0).toISOString(), "");
      }, 700);

      this._idleInterval = setInterval(() => {
        this.logTick({});
      }, 2000);


    }

    if (this._interruptIdler && !this._idleOpen) {
      this._window.show();
      this._idleOpen = true;
    }
  }

  processIdleAction(idleResponse: any) {
    this._window.hide();
    this._upload = true;

    let actFile = this.fscs.getActFile();

    this.fscs.appendEvent("stopIdle", actFile, moment().milliseconds(600000).toISOString(), "");

    // user decides to keep time and continue.
    console.log(idleResponse);

    clearInterval(this._idleInterval);
    this._interruptIdler = false;
    this._isIdle = false;
    this._idled = 0;
    this._idleOpen = false;

    this.stopUpload();
  }

  closeWindow() {
    this._window.close();
  }

}
