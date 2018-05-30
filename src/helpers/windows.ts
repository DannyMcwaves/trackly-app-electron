/**
 * Track the current windows the use spends much time on the most.
 */

import * as activeWindow from 'active-win';
import * as logger from "electron-log";


export class ActiveWindow {
  constructor() {
    logger.log(activeWindow);
  }

  currentWindow() {
    return activeWindow();
  }
}