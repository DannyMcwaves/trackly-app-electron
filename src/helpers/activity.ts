// tslint:disable-next-line:no-var-requires
const ioHook = require("iohook");
import * as logger from "electron-log";
import { Fscs } from "./fscs";
import { ActiveWindow } from "./windows";
import { Emitter } from "./emitter";

export const activityStorage: any = {userStatus: false, duration: 0};

export class Activity {
  private cachedIsActive = false;
  private cachedInterval = 0;
  private isActive = false;
  private measurementInterval = 2; // seconds
  private status = ioHook.getStatus();
  private activeWindow: ActiveWindow;

  constructor(private fscs: Fscs) {
    this.activeWindow = new ActiveWindow(fscs);
  }

  /**
   * Do something with results of past n seconds of user activity.
   * @param isActive
   */
  result(wasActive: boolean) {

    // This can be heavily refactored
    if (this.isActive != this.cachedIsActive) {
      logger.info(`Status changed to ${wasActive} w/ ${this.measurementInterval} seconds.`);

      Emitter.appendActivity(wasActive, this.cachedInterval);

      this.activeWindow.current(this.cachedInterval);
      this.cachedIsActive = this.isActive;
      this.cachedInterval = 0;
      activityStorage.duration = 0;
    } else {
      activityStorage.userStatus = wasActive;
      activityStorage.duration = this.cachedInterval;
    }
    this.cachedInterval += this.measurementInterval;
  }

  /**
   * Register IOHook to measure user's activity levels.
   */
  registerIOHook() {
    ioHook.on("keypress", () => {
      this.isActive = true;
    });
    ioHook.on("mousemove", () => {
      this.isActive = true;
    });
    logger.log("IOHook registered");
    ioHook.load();
    ioHook.start(false); // disable logger
  }

  /**
   * Unregister IOHook from the event emmitters.
   */
  unregisterIOHook() {
    if (process.platform === 'darwin' && this.status !== 64) {
      ioHook.unload();
    } else if (process.platform !== 'darwin') {
      ioHook.unload();
    }
    ioHook.stop();
    logger.debug("IOHook unregistered");
  }

  /**
   * Measure user's activity levels.
   * @param tick
   */
  measure(tick: any) {
    let tickValue = tick["value"];

    // Register IOHook when starting the timer
    if (tickValue == 0) {
      this.registerIOHook();
    }

    // Set measurement interval every n seconds
    if (tickValue % this.measurementInterval == 0) {
      this.result(this.isActive);
      this.isActive = false;
    }
  }

  /**
   * Stop activity tracking.
   */
  stop() {
    this.unregisterIOHook();
    this.isActive = false;
    logger.log("Activity measurement stopped");
  }
}
