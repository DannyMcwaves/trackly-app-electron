
import * as desktopIdle from 'desktop-idle';
import { Emitter } from './emitter';
import { Fscs } from './fscs';
import { Uploader } from './uploader';
import { ActiveWindow } from "./windows";
import { dialog, BrowserWindow, ipcMain } from "electron";


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
    this._upload = false;
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

  public logTick(tick:any) {
    const idle = this.idleTime();
    // this.currentWindow();
    if (idle > 595 && idle % 60 < 2) {
      this.idleDialog(Math.floor(idle / 60));
    }
  }

  adjustIdleTime() {
    this._parentWindow.webContents.send("adjustIdleTime", this._idled * 60);
  }

  public processIdleAction(idleResponse: any) {
    this._window.hide();
    this._upload = true;
    if (!idleResponse.checked) {
      this.adjustIdleTime();
    }
    if (idleResponse.action === 'stop') {
      setTimeout( () => { this._parentWindow.webContents.send("timer:stop")}, 1000);
    }
    if (idleResponse.action === 'assign') {
      console.log('assign time to')
    }
  }

  closeWindow() {
    this._window.close();
  }

}
