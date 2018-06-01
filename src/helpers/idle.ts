
import * as desktopIdle from 'desktop-idle';
import { Emitter } from './emitter';
import { Fscs } from './fscs';
import { Uploader } from './uploader';
import { ActiveWindow } from "./windows";
import { dialog, BrowserWindow, ipcMain } from "electron";
import * as moment from "moment";


export class Idler {

  private _totalIdleTime:number = 0;
  private _window: BrowserWindow;
  private _parentWindow: BrowserWindow;
  private _projects: any;
  private _activeProject: any;
  private _idled: number;
  private activeWindow: ActiveWindow;
  private fscs: Fscs;
  private uploader: Uploader;
  private _upload: boolean = true;
  private _interval: any;

  constructor(fscs: any, uploader: any) {
    this.activeWindow = new ActiveWindow();
    this.uploader = uploader;
    this.fscs = fscs;
    ipcMain.on("idleResponse", (event: any, res: any) => {
      this.processIdleAction(res);
    });
  }

  upload() {
    // upload when the user is not idle for more than 10mins.
    if (this._upload) {
      let returnValue = this.fscs.rotate();
      // start upload when activity file are successfully rotated.
      if (returnValue) {
        // upload files within 10min interval after every rotation.
        this.uploader.upload(() => {
          if (this._parentWindow) { this._parentWindow.webContents.send("sync:update", Date.now()); }
        });
      }
    }
  }

  createWindow(url: string, parent: any) {
    this._parentWindow = parent;
    this._window = new BrowserWindow({frame: false, height: 207, width: 500, show: false, parent});
    this._window.loadURL(`${url}/#dialog`);
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
    this._idled = time;
    this._window.webContents.send("idletime", time);
    this._window.show();
  }

  projects(projects: any) {
    this._projects = projects;
    this._window.webContents.send("projects", projects);
  }

  currentProject(project: any) {
    this._activeProject = project;
    this._window.webContents.send('currentProject', project.title);
  }

  public get idle() {
    this._totalIdleTime += this.idleTime();
    return this._totalIdleTime;
  }

  currentWindow() {
    this.activeWindow.currentWindow().then((data: any) => {
      console.log(data);
    }).catch((err: any) => {
      console.log(err);
    });
  }

  startInterval() {
    this._interval = setInterval(() => { this.upload() }, 600000);
  }

  clearInterval() {
    clearInterval(this._interval);
  }

  public logTick(tick:any) {
    const idle = this.idleTime();
    // this.currentWindow();
    if(idle > 598) {
      this._upload = false;
    }
    if (idle >= 600) {
      this.idleDialog(Math.floor(idle / 60));
    }
  }

  adjustIdleTime() {
    this._parentWindow.webContents.send("adjustIdleTime", this._idled * 60);
  }

  public processIdleAction(idleResponse: any) {
    this._window.hide();
    this._upload = true;
    if (!idleResponse.checked || idleResponse.value !== this._activeProject.title) {
        this.adjustIdleTime();
    }
    if (idleResponse.action === 'stop') {
      setTimeout( () => { this._parentWindow.webContents.send("timer:stop")}, 1000);
    }
    // user decides to keep time and continue.
    if (idleResponse.checked && idleResponse.action === 'continue') {
      setTimeout(() => {
        // if user chooses to continue, upload the current files, clear and start interval.
        this.upload();
        this.clearInterval();
        this.startInterval();
      }, 1000);
    }
    if (idleResponse.action === 'assign') {
      if (idleResponse.value !== this._activeProject.title) {
        let project = this._projects.filter((newProject: any) => newProject.title === idleResponse.value ? newProject: null);
        this.generateActivityFile(project);
      }
    }
  }

  generateActivityFile(project: any) {
    const pro = project[0];
    const actFile = {
      timestamp: Date.now(),
      userId: pro.people[0].userId,
      workspaceId: pro.workspaceId,
      projectId: pro.id
    };
    const tempFile = this.fscs.generateActivityFile(actFile);
    this.fscs.appendEvent("startLogging", tempFile, moment().milliseconds(0).toISOString());
    setTimeout(() => {
      this.fscs.appendEvent("stopLogging", tempFile, moment().milliseconds(this._idled * 60000).toISOString());
    }, 1000);
  }

  closeWindow() {
    this._window.close();
  }

}
