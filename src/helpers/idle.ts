
import * as desktopIdle from 'desktop-idle';
import {Fscs} from './fscs';
import {dialog, BrowserWindow} from "electron";


export class Idler {

  private _totalIdleTime:number = 0;
  private _window: BrowserWindow;

  constructor(private fscs: Fscs) {}

  createWindow() {
    this._window = new BrowserWindow({frame: false, height: 200, width: 500});
    this._window.loadURL(`http://localhost:5000`);
  }

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  idleDialog(time: any) {
    this.createWindow();

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
    if (idle > 60) {
      this.idleDialog(Math.round(idle / 60));
    }
  }

}
