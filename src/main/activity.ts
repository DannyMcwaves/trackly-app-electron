// tslint:disable-next-line:no-var-requires
const screenshot = require("desktop-screenshot");
// tslint:disable-next-line:no-var-requires
const ioHook = require("iohook");

import { app, ipcRenderer } from "electron";
import { Observable } from "rxjs/Rx";
import * as logger from "electron-log";
import * as fs from "fs";
import * as jsonfile from "jsonfile";
import * as req from "request";
import * as moment from "moment";
import * as fse from "fs-extra";
import { ApiService } from "../renderer/app/services/api.service";

class Activity {
  private api: ApiService;

  // Activity
  private lastUserActivityStatus = false;
  private currentActivityFile: string;
  private userActivityDuration = 0;

  // Timer
  private timerRunningStatus = false;
  private timerInterval = 1000;

  // Paths
  private recordsPath: string;
  private activitiesPath: string;
  private screenshotsPath: string;

  constructor() {
    // Define API service
    this.api = new ApiService();

    // Define paths
    this.recordsPath = `${app.getPath("userData")}/records`;
    this.activitiesPath = `${this.recordsPath}/activities`;
    this.screenshotsPath = `${this.recordsPath}/screenshots`;

    // Ensure records dir exists
    for (let dir of [this.activitiesPath, this.screenshotsPath]) {
      try {
        fse.ensureDirSync(dir);
      } catch (e) {
        logger.warn(`Error creating dirs: ${e.toString()}`);
      }
    }
  }

  /**
   * Creates a blank activity file skeleton.
   * @param userId
   * @param workspaceId
   * @param projectId
   */
  private static getActivityFileBP(
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
   * Insert a node into an object, then writes it to a file.
   * @param target
   * @param node
   * @param value
   */
  private insertJsonNode(target: string, node: string, value: any) {
    fs.readFile(target, (err, data: any) => {
      let json = JSON.parse(data);
      json[node].push(value);

      fs.writeFile(target, JSON.stringify(json), () => {});
    });
  }

  /**
   * Sync files inside directory to a backend server.
   * @param dir
   * @param url
   */
  public sync(dir: string, url: string) {
    fs.readdir(dir, (err, files) => {
      files.forEach(file => {
        // Skip current file if the timer is up and running.
        if (
          this.timerRunningStatus &&
          `${dir}/${file}` == this.currentActivityFile
        ) {
          return;
        }

        const data = {
          res: fse.createReadStream(`${dir}/${file}`)
        };

        req.post(url, { formData: data }, (err, res, data) => {
          if (!err && res.statusCode == 200) {
            fs.unlink(`${dir}/${file}`, () => {});
            logger.log(`File synced and deleted: ${file}`);
          } else {
            logger.warn(`File upload failed: ${file}`);
          }
        });
      });
    });

    return Date.now();
  }

  /**
   * Sync activities to server.
   */
  private syncActivities() {
    this.sync(this.activitiesPath, this.api.uploadActivitiesURL());
  }

  /**
   * Sync screenshots to server.
   */
  private syncScreenshots() {
    this.sync(this.screenshotsPath, this.api.uploadScreenshotsURL());
  }

  /**
   * This method is invoked every 10 minutes. It syncs stale files to the backend.
   * If there is a file currently being written to, closes the file, opens a new one
   * and marks it as continue logging.
   */
  public rotateActivityFile() {
    if (!this.currentActivityFile) {
      logger.log("Rotation skipped due to no activity file");
      return;
    }

    const fTitle = Date.now();
    const currentACFile = this.currentActivityFile;
    const fData = jsonfile.readFileSync(currentACFile);
    const newFile = this.createActivityFile(
      fData.userId,
      fData.workspaceId,
      fData.projectId,
      fTitle
    );

    this.appendEvent("continueLogging", newFile);
    this.currentActivityFile = newFile;

    this.syncActivities();
    this.syncScreenshots();
    logger.log("Rotation w/ syncing succesfully completed");

    // TODO: Refactor to use inside sync method
    return Date.now();
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
    // Generate file name.
    const fileName = `${this.activitiesPath}/${name.toString()}.json`;

    // Get initial file skeleton
    const skeleton = Activity.getActivityFileBP(userId, workspaceId, projectId);

    try {
      jsonfile.writeFileSync(fileName, skeleton);
      return fileName;
    } catch (e) {
      logger.error(`Error creating a file: ${e.toString()}`);
    }
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
      logger.log("User status has changed");
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
   * Append new event atom to a file.
   * @param event
   * @param project
   */
  public appendEvent(evt: string, file: string) {
    if (!file) {
      throw new TypeError("Activity file not specified");
    }

    try {
      this.insertJsonNode(file, "events", {
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
    this.appendEvent("startLogging", this.currentActivityFile);
    //this.takeScreenshot(timestamp);

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
    this.appendEvent("stopLogging", this.currentActivityFile);
    this.currentActivityFile = "";

    // Sync everything to the server.
    this.syncActivities();
    this.syncScreenshots();
  }

  /**
   * Take a screenshot of a desktop
   * @param name
   */
  public takeScreenshot(name: number) {
    const imageName = name.toString() + ".jpg";
    const finalImageName = this.screenshotsPath + "/" + imageName;

    // Monkey patch OSX jpg
    // https://github.com/johnvmt/node-desktop-screenshot/blob/master/capture/darwin.js#L9
    if (process.platform == "darwin") {
      let refSCapt = screenshot.capture;
      console.log("outside patch");
      screenshot.capture = function(output: string, callback: any) {
        console.log("inside patch");
        // Override output path of a temp .png file
        let tempOutput = output.split("/")[-1];
        refSCapt(this.screenshotsPath + tempOutput, callback);
      };
    }

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
