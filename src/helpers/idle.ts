
import * as desktopIdle from 'desktop-idle';
import {Fscs} from './fscs';
import {dialog, BrowserWindow, ipcMain} from "electron";


export class Idler {

  private _totalIdleTime:number = 0;
  private _window: BrowserWindow;
  private _isOpen: boolean = false;
  private _projects: any;
  private _activeProject: any;

  constructor(private fscs: Fscs) {
    ipcMain.on("idleResponse", (event: any, res: any) => {
      console.log(res);
    })
  }

  createWindow(url: string, parent: any) {
    this._window = new BrowserWindow({frame: false, height: 207, width: 500, show: false, parent});
    this._window.loadURL(`${url}/#dialog`);
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
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

  public logTick(tick:any) {
    const idle = this.idleTime();
    if (idle > 60 && idle % 60 < 2) {
      this.idleDialog(Math.round(idle / 60));
    }
  }

}
