// tslint:disable-next-line:no-var-requires
const screenshot = require("desktop-screenshot");
// tslint:disable-next-line:no-var-requires
const fse = require("fs-extra");
// tslint:disable-next-line:no-var-requires
const ioHook = require('iohook');
import { app } from "electron";

import * as logger from "electron-log";
import * as fs from "fs";
import * as jsonfile from "jsonfile";
import { Observable } from "rxjs/Rx";
import * as req from "request";
import * as moment from "moment";

class Activity {
  private activeFile: string;
  private timerRunning = false;
  private timerInterval = 1000;

  // User activity
  public lastUserActivity = false;
  private userActivityDuration = 0;

  private static getUNIXTimestamp() {
    return Date.now();
  }

  /**
   * Return path to the records folder independent
   * of the user OS.
   */
  private static getRecordsPath() {
    return app.getPath("userData") + "/records";
  }

  /**
   * Get folder with the activities files.
   */
  private static getActivitiesFolder() {
    return Activity.getRecordsPath() + "/activities";
  }

  /**
   * Get folder with screenshot files.
   */
  private static getScreenshotsFolder() {
    return Activity.getRecordsPath() + "/screenshots";
  }

  /**
   * Generates a new file and puts it into memory.
   */
  public openFile(userId: string, project: string) {
    const dir = Activity.getActivitiesFolder();
    if (!fse.existsSync(dir)) {
      fse.ensureDirSync(dir);
    }

    const timeStamp = Activity.getUNIXTimestamp();
    this.activeFile =
      Activity.getActivitiesFolder() + "/" + timeStamp.toString() + ".json";
      this.takeScreenshot(timeStamp.toString());

    // Add initial skeleton to a file
    const _ = {
      userId: userId,
      createdAt: moment().toISOString(),
      activity: [] as any[],
      events: [] as any[]
    };

    jsonfile.writeFile(this.activeFile, _, err => {
      if (err) {
        logger.error("File upload failed: " + this.activeFile);
      }
    });
  }

  /*
     * Append new activity the active file.
     */
  public appendActivity(active: boolean) {

    console.log('is active: ' + active + " - - - - " + this.lastUserActivity);
    console.log(this.userActivityDuration);

    if (active !== this.lastUserActivity) {

      console.log('writing');

      try {
        fs.readFile(this.activeFile, (err, data: any) => {
          const json = JSON.parse(data);
          json.activity.push({
            userActive: active,
            duration: this.userActivityDuration
          });

          fs.writeFile(this.activeFile, JSON.stringify(json), () => {});

          this.lastUserActivity = active;
          this.userActivityDuration = 0;
        });
      } catch (e) {
        logger.error(e.toString());
      }
    }
  }

  /**
   * Append event to active file.
   */
  public appendEvent(event: string, project: string) {
    try {
      fs.readFile(this.activeFile, (err, data: any) => {
        const json = JSON.parse(data);
        json.events.push({
          type: event,
          projectId: project,
          timestamp: moment().toISOString()
        });

        fs.writeFile(this.activeFile, JSON.stringify(json), () => {});
      });
    } catch (e) {
      logger.error(e.toString());
    }
  }

  /**
   * Start tracking activity for a specific user on a specific project.
   * @param {string} user
   * @param {string} projectId
   * @returns {Observable<boolean>}
   */
  public startActivity(user: string, projectId: string) {
    this.timerRunning = true;
    this.openFile(user, projectId);
    this.appendEvent("startLogging", projectId);

    logger.info("New activity file created: " + this.activeFile);

    ioHook.start(false); // Disable dev logger

    let cachable = false;

    // Track events
    ioHook.on("keypress", () => {
      cachable = true;
    });
    ioHook.on("mousemove", () => {
      cachable = true;
    });

    return Observable.interval(this.timerInterval).map(() => {
      let _cachable = cachable;
      this.userActivityDuration++;
      cachable = false;
      return _cachable;
    });
  }

  /**
   * Stop tracking user activity.
   */
  public stopActivity() {
    ioHook.unload();
    ioHook.stop();
    this.timerRunning = false;

    this.appendEvent("stopLogging", null);

    const formData = {
      res: fse.createReadStream(this.activeFile)
    };

    console.log("stopped tracking");

    req.post(
      "https://trackly.com/api/eventFiles/upload?access_token=cCOaYmraL6V0Pg6nyd2KeJjYr4mrJV2ph8VzzyA7BtRimFjoEgjZjChS4CFLlebq",
      {
        formData: formData
      },
      (err, res, data) => {
        //console.log("err", err); // <---- never prints any thing from here!
        //console.log("res", res);
        //console.log("data", data);
        console.log("error");
        if (!err && res.statusCode == 200) {
            console.log('success');
            console.log(data);
        }
      }
    );

      // Upload screenshots
      fs.readdir(Activity.getScreenshotsFolder(), (err, files) => {
        files.forEach(file => {

          let imgName = Activity.getScreenshotsFolder() + '/' + file;
          console.log(imgName);

          const image = {
            res: fse.createReadStream(imgName)
          };

          req.post(
            "https://trackly.com/api/images/upload?access_token=cCOaYmraL6V0Pg6nyd2KeJjYr4mrJV2ph8VzzyA7BtRimFjoEgjZjChS4CFLlebq",
            {
              formData: image
            },
            (err, res, data) => {
              //console.log("err", err); // <---- never prints any thing from here!
              //console.log("res", res);
              //console.log("data", data);
              console.log("error image upload");
              if (!err && res.statusCode == 200) {
                  console.log('image uploaded');
                  console.log(data);
              }
            }
          );
        });
      })
  }

  /**
   * Take screenshot of user's desktop.
   */
  public takeScreenshot(name: string) {
    const imageExtension = ".jpg";
    const finalImageName = Activity.getScreenshotsFolder() + '/' + name + imageExtension;

        screenshot(finalImageName, {
                height: 900,
                quality: 100,
            },
            (error: any, complete: any) => {
                if (error) {
                    logger.error(error.toString());
                }
            });
  }
}

export default new Activity();
