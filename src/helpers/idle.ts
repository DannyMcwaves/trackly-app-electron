
import * as desktopIdle from 'desktop-idle';
// import { Emitter } from './emitter';
import { Fscs } from './fscs';
import { Uploader } from './uploader';
import { dialog, BrowserWindow, ipcMain } from "electron";
import * as moment from "moment";


export class Idler {

  private _totalIdleTime:number = 0;
  private _window: BrowserWindow;
  private _parentWindow: BrowserWindow;
  private _projects: any;
  private _activeProject: any;
  private _idled: number;
  private fscs: Fscs;
  private uploader: Uploader;
  private _upload: boolean = true;
  private _interval: any;
  private _idleInterval: any;
  private _interruptIdler: boolean = false;
  private _isIdle: boolean = false;

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

  stopUpload(stopMoment: any, id:any) {
    // delegate the uploader for the stopper program to the idler program.
    // when the user was idle and the idler kicks in, do not upload the activities file
    // on stop.
    if (this._upload) {
      let actFile = this.fscs.getActFile();

      // append stopLogging and unload the current activities file.
      this.fscs.appendEvent("stopLogging", actFile, stopMoment, id);
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
    this._idled = time;
    this._window.webContents.send("idletime", time);
    // this._window.show();
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
      this._interruptIdler = false;
      this._isIdle = true;
      this.startIdleTime(Math.floor(idle / 60));
    } else if(this._isIdle) {
      this._interruptIdler = true;
      let time = this._idled + 2;
      this.startIdleTime(Math.floor(time / 60));
    }
  }

  startIdleTime(time: any) {

    // show keep sending the time to the window.
    this.idleDialog(time);

    // start the idle timer interval
    if(!this._idleInterval) {

      // when this happens start tracking the idle time by stopping the main tracker.
      this._parentWindow.webContents.send("timer:stop");

      this._idleInterval = setInterval(() => {
        this.logTick({});
      }, 2000);

    }

    console.log(this._interruptIdler);
    console.log(this._idled);

    if (this._interruptIdler) {
      this._window.show();
    }
  }

  public processIdleAction(idleResponse: any) {
    this._window.hide();
    this._upload = true;

    // user decides to keep time and continue.
    console.log(idleResponse);

    clearInterval(this._idleInterval);
    this._interruptIdler = false;
    this._isIdle = false;
  }

  closeWindow() {
    this._window.close();
  }

}
