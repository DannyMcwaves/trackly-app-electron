// tslint:disable-next-line:no-var-requires
const screenshot = require("desktop-screenshot");
// tslint:disable-next-line:no-var-requires
const ioHook = require("iohook");

import { app } from "electron";
import { Observable } from "rxjs/Rx";
import * as logger from "electron-log";
import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as req from "request";
import * as moment from "moment";
import * as fse from "fs-extra";
import { ApiService } from "../renderer/app/services/api.service";

class Activity {
  /**
   * Activity class for tracking mouse, keyboard movements. Taking screenshots and
   * uploading them to the server's backend.
   */

  private api: any;
  private lastUserActivityStatus = false;
  private currentActivityFile: string;
  private timerRunningStatus = false;
  private userActivityDuration = 0;
  private timerInterval = 1000;

  constructor() {
    this.api = new ApiService();

    // Ensure records dir exists
    const dirs = [this.getActivitiesFolder(), this.getScreenshotsFolder()];
    for (let dir of dirs) {
      if (!fse.existsSync(dir)) {
        fse.ensureDirSync(dir);
      }
    }
  }

  /**
   * Returns a blank blueprint of an activity file.
   */
  private getActivityFileBP(
    userId: string,
    workspaceId: string,
    projectId: string
  ) {
    return {
      userId: userId,
      workspaceId: workspaceId,
      projectId: projectId,
      createdAt: moment().toISOString(),
      events: [] as any[],
      activities: [] as any[]
    };
  }

  /**
   * Return path to the records folder independent
   * of the user OS.
   */
  private getRecordsPath() {
    return app.getPath("userData") + "/records";
  }

  /**
   * Get folder with the activities files.
   */
  private getActivitiesFolder() {
    return this.getRecordsPath() + "/activities";
  }

  /**
   * Get folder with screenshot files.
   */
  private getScreenshotsFolder() {
    return this.getRecordsPath() + "/screenshots";
  }

  /**
   * Insert JSON node into a json file.
   */
  private insertJsonNode(targetFile: string, node: string, value: any) {
    fs.readFile(targetFile, (err, data: any) => {
      const json = JSON.parse(data);
      json[node].push(value);
      fs.writeFile(targetFile, JSON.stringify(json), () => {});
    });
  }

  /**
   * Emmit last synced signal to the renderer.
   */
  private emmitLastSynced() {}

  /**
   * Sync both screeshots and activities to the backend server.
   * Emmit a `lastSync` signal upon successfull sync.
   */
  public syncAll() {
    this.syncActivities();
    this.syncScreenshots();
  }

  /**
   * Syncs every activities file found on computer and tries to upload it to the
   * remote server. Upon successful upload remove the activity file from the disk.
   */
  private syncActivities() {
    try {
      fs.readdir(this.getActivitiesFolder(), (err, files) => {
        files.forEach(file => {
          const data = {
            res: fse.createReadStream(this.getActivitiesFolder() + "/" + file)
          };

          req.post(
            this.api.uploadActivitiesURL(),
            {
              formData: data
            },
            (err, res, data) => {
              if (!err && res.statusCode == 200) {
                // We can remove the file from the disk
                try {
                  fs.unlink(this.getActivitiesFolder() + "/" + file, () => {});
                  logger.log(
                    "Activity file synced and deleted: " + file.toString()
                  );
                } catch (e) {
                  logger.warn("Activity file was not deleted: " + e.toString());
                }
                // and emmit a succesful sync
              } else {
                logger.warn(
                  "Activity file couldn't be uploaded: " + err.toString()
                );
              }
            }
          );
        });
      });
    } catch (e) {
      logger.log(
        "There was a problem syncing activity file with server: " + e.toString()
      );
    }
  }

  /**
   * Syncs every screenshot file found on computer and tries to uploda it to image storage.
   * Upon successful upload, removes the original screenshot file from the disk.
   */
  private syncScreenshots() {
    try {
      fs.readdir(this.getScreenshotsFolder(), (err, files) => {
        files.forEach(file => {
          const data = {
            res: fse.createReadStream(this.getScreenshotsFolder() + "/" + file)
          };

          req.post(
            this.api.uploadScreenshotsURL(),
            {
              formData: data
            },
            (err, res, data) => {
              console.log(res);
              console.log(err);
              if (!err && res.statusCode == 200) {
                // We can remove the file from the disk
                try {
                  fs.unlink(this.getScreenshotsFolder() + "/" + file, () => {});
                  logger.log(
                    "Screenshot file synced and deleted: " + file.toString()
                  );
                } catch (e) {
                  logger.warn("Screenshot file was not deleted: " + e.toString());
                }
                // and emmit a succesful sync
              } else {
                logger.warn(
                  "Screenshot file couldn't be uploaded: " + err.toString()
                );
              }
            }
          );
        });
      });
    } catch (e) {
      logger.log(
        "There was a problem syncing activity file with server: " + e.toString()
      );
    }
  }

  /**
   * This method is invoked every 10 minutes. It syncs stale files to the backend.
   * If there is a file currently being written to, closes the file, opens a new one
   * and marks it as continue logging.
   */
  public rotateActivityFile() {
    // Stop timer
    // Append `stopLogging` event to current file
    // Create a new file
    // Append `continueLogging` event to the new file
    // Start the timer
    // Sync files to the server
  }

  /**
   * Generate a new activity file to be used for acitvity tracking.
   * @param userId
   * @param workspaceId
   * @param projectId
   * @param name
   */
  public createActivityFile(
    userId: string,
    workspaceId: string,
    projectId: string,
    name: number
  ) {
    const fileDir = this.getActivitiesFolder();
    const fileName = fileDir + "/" + name.toString() + ".json";

    // Get initial file skeleton
    const skeleton = this.getActivityFileBP(userId, workspaceId, projectId);

    try {
      jsonfile.writeFileSync(fileName, skeleton);
    } catch (e) {
      logger.error(
        "There was an error creating activity file: " + e.toString()
      );
    }

    return fileName;
  }

  /**
   * Append new activity atom to a current file.
   * @param active
   */
  public appendActivity(userStatus: boolean) {
    if (!this.currentActivityFile) {
      throw new TypeError("Activity file not found");
    }

    if (userStatus != this.lastUserActivityStatus) {
      console.log("different!");
      try {
        this.insertJsonNode(this.currentActivityFile, "activities", {
          userActive: userStatus,
          duration: this.userActivityDuration
        });

        this.lastUserActivityStatus = userStatus;
        this.userActivityDuration = 0;
      } catch (e) {
        logger.error("There was an error appending activty: " + e.toString());
      }
    }
  }

  /**
   * Append new event atom to a current file.
   * @param event
   * @param project
   */
  public appendEvent(evt: string) {
    if (!this.currentActivityFile) {
      throw new TypeError("Activity file not found");
    }

    try {
      this.insertJsonNode(this.currentActivityFile, "events", {
        type: evt,
        timestamp: moment().toISOString()
      });
    } catch (e) {
      logger.error("There was an error appending event: " + e.toString());
    }
  }

  /**
   * Start tracking activity for a specific user on a specific project.
   * @param {string} user
   * @param {string} projectId
   * @returns {Observable<boolean>}
   */
  public startTimer(userId: string, workspaceId: string, projectId: string) {
    const timestamp = Date.now();
    let tempActivity = false;
    this.currentActivityFile = this.createActivityFile(
      userId,
      workspaceId,
      projectId,
      timestamp
    );

    // Start logging
    this.appendEvent("startLogging");
    this.takeScreenshot(timestamp);

    // Start a timer
    this.timerRunningStatus = true;

    // Start tracking activity
    ioHook.start(false); // disable logger
    ioHook.on("keypress", () => {
      tempActivity = true;
    });
    ioHook.on("mousemove", () => {
      tempActivity = true;
    });

    // TODO: Refactor
    return Observable.interval(this.timerInterval).map(() => {
      let _tempActivity = tempActivity;
      this.userActivityDuration++;
      tempActivity = false;
      return _tempActivity;
    });
  }

  /**
   * Stop tracking user activity.
   */
  public stopTimer() {
    ioHook.unload();
    ioHook.stop();
    this.timerRunningStatus = false;

    // Append stop logging
    this.appendEvent("stopLogging");

    // Sync everything to the server.
    this.syncAll();
  }

  /**
   * Take a screenshot of a desktop
   * @param name
   */
  public takeScreenshot(name: number) {
    const imageName = name.toString() + ".jpg";
    const finalImageName = this.getScreenshotsFolder() + "/" + imageName;

    screenshot(
      finalImageName,
      {
        height: 900,
        quality: 50
      },
      (error: any, complete: any) => {
        if (error) {
          logger.error("Screenshot failed: " + error.toString());
        }
      }
    );
  }
}

export default new Activity();
