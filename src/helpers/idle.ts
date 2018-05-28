
import * as desktopIdle from 'desktop-idle';
import {Fscs} from './fscs';
import {dialog, BrowserWindow} from "electron";


export class Idler {

  private _totalIdleTime:number = 0;
  private _window: BrowserWindow;
  private _isOpen: boolean = false;

  constructor(private fscs: Fscs) {}

  createWindow(url: string) {
    this._window = new BrowserWindow({frame: false, height: 200, width: 500, show: false});
    this._window.loadURL(`${url}/#dialog`);
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
    this._window.show();
    console.log(time);
    // const dialogOpts = {
    //   type: 'info',
    //   buttons: ['Stop', 'Continue', 'Reassign Idle Time'],
    //   title: 'Idle Prompt',
    //   message: 'Idle Prompt',
    //   detail: `You have being Idle for ${time} minutes`,
    //   checkboxLabel: 'Keep Idle Time'
    // };
    //
    // dialog.showMessageBox(this._window, {}, (response, cbox) => {
    //   console.log(response);
    //   console.log(cbox);
    // });
  }

  public get idle() {
    this._totalIdleTime += this.idleTime();
    return this._totalIdleTime;
  }

  public logTick(tick:any) {
    const idle = this.idleTime();
    if (idle > 60 && !this._isOpen) {
      this.idleDialog(Math.round(idle / 60));
      this._isOpen = true;
    }
  }

}
