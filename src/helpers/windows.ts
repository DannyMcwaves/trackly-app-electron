/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWindow from 'active-win';
import * as logger from "electron-log";
import {Fscs} from './fscs';
import * as moment from 'moment';


export class ActiveWindow {

  private fscs: Fscs;
  private windows: any;
  private _endstamp: number = 0;
  private _current: string;

  constructor(fscs: any) {
    this.fscs = fscs;
    this.windows = [];
  }

  currentWindow() {
    return activeWindow();
  }

  public current(duration: any) {
    this.currentWindow().then((data: any) => {
      let name = data.owner.name;
      let file = this.fscs.getActFile();
      if (this._current && name !== this._current) {
        setTimeout( () => {
          this.fscs.appendEvent("stopActiveWindow", file, moment().milliseconds(this._endstamp).toISOString(), {title: this._current});
        }, 300);
        this._current = name;
        setTimeout( () => {
          this.fscs.appendEvent("startActiveWindow", file, moment().milliseconds(0).toISOString(), {title: name});
        }, 800);
      } else if (name === this._current) {
        this._endstamp += duration * 1000;
      } else {
        setTimeout( () => {
          this.fscs.appendEvent("startActiveWindow", file, moment().milliseconds(0).toISOString(), {title: name});
        }, 800);
        this._current = name;
      }
    }).catch((err: any) => {
      logger.log(err);
    });
  }

}