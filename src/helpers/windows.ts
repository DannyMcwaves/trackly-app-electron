/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWin from 'active-win';
import * as logger from "electron-log";
import {Emitter} from './emitter';
import { Utility } from "./utility";
import * as moment from 'moment';
const Store = require("electron-store");
const store = new Store();


export class ActiveWindow {

  public static _currentName: string;
  public static _currentTitle: string;
  private static browserList: string[] = ["chrome", "google chrome", "firefox", "safari", "opera", "iexplore", "chrome.exe", "google chrome.exe", "firefox.exe", "iexplore.exe", "opera.exe", "safari.exe"];

  static currentWindow() {
    return activeWin();
  }

  public static current(duration: any) {

    this.currentWindow().then((data: any) => {

      let name = data.owner.name || "system";
      let title = data.title || "system";

      if ((name !== this._currentName || title !== this._currentTitle) && !this.browserList.includes(name.toLocaleLowerCase())) {

        Emitter.appendEvent("startActiveWindow",
          moment().milliseconds(0).toISOString(),
          {title: name, windowTitle: title}
        );

        this._currentName = name;
        this._currentTitle = title;

      } else if(this.browserList.includes(name.toLocaleLowerCase())) {
        this.showNotification();
      }
    }).catch((err: any) => {
      logger.log(err);
    });
  }

  public static forceCurrent() {
    this.currentWindow().then((data: any) => {

      let name = data.owner.name || "System";
      let title = data.title;

      if (!this.browserList.includes(name.toLocaleLowerCase())) {

        Emitter.appendEvent("startActiveWindow",
          moment().milliseconds(0).toISOString(),
          {title: name, windowTitle: title}
        );

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

  public static showNotification() {
    if (Utility.checkForExtensions() && Emitter.showNotification) {
      Emitter.notificationFunction("Reminder from Trackly", "Please install Trackly browser extension");
      Emitter.showNotification = false;
    }
  }

}