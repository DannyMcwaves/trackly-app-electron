/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWindow from 'active-window';
import * as logger from "electron-log";
import {Emitter} from './emitter';
import * as moment from 'moment';


export class ActiveWindow {

  public static _current: string;

  static currentWindow() {
    return activeWindow(__static);
  }

  public static current(duration: any) {

    this.currentWindow().then((data: any) => {

      let name = data.app;

      if (name !== this._current) {

        Emitter.appendEvent("startActiveWindow", moment().milliseconds(0).toISOString(), {title: name});

        this._current = name;

      }
    }).catch((err: any) => {
      logger.log(err);
    });
  }

  public static stopWindow() {
    Emitter.appendEvent("stopActiveWindow", moment().milliseconds(0).toISOString(), {title: this._current});
  }

}