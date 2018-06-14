/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWindow from 'active-win';
import * as logger from "electron-log";
import {Fscs} from './fscs';
import {Emitter} from './emitter';
import * as moment from 'moment';


export class ActiveWindow {

  private fscs: Fscs;
  private windows: any;
  private _endstamp: number = 0;
  public _current: string;

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

      if (this._current && name !== this._current) {

        Emitter.appendEvent("stopActiveWindow", moment().milliseconds(this._endstamp).toISOString(), {title: this._current});

        Emitter.appendEvent("startActiveWindow", moment().milliseconds(0).toISOString(), {title: name});

        this._current = name;
        this._endstamp = 0;

      } else if (name === this._current) {

        this._endstamp += duration * 1000;

      } else {

        Emitter.appendEvent("startActiveWindow", moment().milliseconds(0).toISOString(), {title: name});

        this._current = name;
      }
    }).catch((err: any) => {
      logger.log(err);
    });
  }

}