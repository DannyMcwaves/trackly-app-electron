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

  constructor(fscs: any) {
    this.fscs = fscs;
    this.windows = [];
  }

  currentWindow() {
    return activeWindow();
  }

  public current(duration: any) {
    // let isavailable = false;
    this.currentWindow().then((data: any) => {
      let name = data.owner.name;
      // this.windows = this.windows.map((x: any) => {
      //   if (x.name === name) {
      //     isavailable = true;
      //     return {name, duration: x.duration + duration}
      //   }
      //   return x
      // });
      // if (!isavailable) {
      //   this.windows.push({name, duration});
      // }
      let file = this.fscs.getActFile();
      setTimeout( () => {
        this.fscs.appendEvent("startActiveWindow", file, moment().milliseconds(0).toISOString(), {title: name});
      }, 800);
    }).catch((err: any) => {
      logger.log(err);
    });
  }

}