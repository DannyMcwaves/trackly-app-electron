/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWin from 'active-win';
import * as logger from "electron-log";
import {Emitter} from './emitter';
import * as moment from 'moment';


export class ActiveWindow {

  public static _currentName: string;
  public static _currentTitle: string;

  static currentWindow() {
    return activeWin();
  }

  public static current(duration: any) {

    this.currentWindow().then((data: any) => {

      if ( data.owner.name === "" || data.title === "" ){
        logger.error(data); // if there is no required data ask again
        return setTimeout(() => {
          this.current(duration);
        }, 600); // usually window needs 600ms to refresh
      }

      let name = data.owner.name;
      let title = data.title;

      logger.log(name, title);

      if ((name !== this._currentName) || (title !== this._currentTitle)) {

        Emitter.appendEvent("startActiveWindow",
          moment().milliseconds(0).toISOString(),
          {title: name, windowTitle: title}
        );

        this._currentName = name;
        this._currentTitle = title;

      }
    }).catch((err: any) => {
      logger.log(err);
    });
  }

  public static stopWindow() {
    Emitter.appendEvent("stopActiveWindow",
      moment().milliseconds(0).toISOString(),
      {title: this._currentName, windowTitle:this._currentTitle}
    );
  }

}