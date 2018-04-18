// tslint:disable-next-line:no-var-requires
const screenshot = require("desktop-screenshot");
import { app } from "electron";
import * as fse from "fs-extra";
import * as logger from "electron-log";
import * as moment from "moment";
import * as jsonfile from "jsonfile";
import {activityStorage} from "./activity";

export class Fscs {
  // Paths
  private recordsPath: string;
  private activitiesPath: string;
  private screenshotsPath: string;

  private currentActivityFile: string;

  constructor() {
    // Define paths
    this.recordsPath = `${app.getPath("userData")}/records`;
    this.activitiesPath = `${this.recordsPath}/activities`;
    this.screenshotsPath = `${this.recordsPath}/screenshots`;

    // Ensure records dir exists
    try {
      this.ensurePathsExist();
    } catch (e) {
      logger.error("There was a problem creating required paths.");
      logger.log(e.toString());
    }
  }

  /**
   * Method responsible for ensuring  that all the paths needed exist
   * on client's computer.
   */
  private ensurePathsExist() {
    for (let dir of [this.activitiesPath, this.screenshotsPath]) {
        fse.ensureDirSync(dir);
      }
  }

  /**
   * Method responsible for loading activity file into memory.
   * @param file
   */
  public loadActFile(file: string) {
    this.currentActivityFile = file;
  }

  /**
   * Method responsible for unloading activity file from memory.
   */
  public unloadActFile() {
    this.currentActivityFile = undefined;
  }

  /**
   * Method responsible for returning activity file in memory.
   */
  public getActFile() {
    return this.currentActivityFile;
  }

  /**
   * Method responsible for returning path to the activities folder.
   */
  public getActivitiesPath() {
    return this.activitiesPath;
  }

  /**
   * Method responsible for creating activity file from blueprint.
   * @param blueprint
   */
  private generateActivityFile(blueprint: IActivityFileBlueprint) {
    let fileName = `${this.activitiesPath}/${blueprint.timestamp.toString()}.json`;
    let skeleton =  {
      userId: blueprint.userId,
      workspaceId: blueprint.workspaceId,
      projectId: blueprint.projectId,
      createdAt: moment().toISOString(),
      events: [] as any[],
      activities: [] as any[]
    };

    jsonfile.writeFileSync(fileName, skeleton);
    return fileName;
  }

  /**
   * Method responsible for appening event to the activity file.
   * @param evt
   * @param file
   */
  public appendEvent(evt: string, file: string) {
    this.insertJsonNode(file, 'events', {
      type: evt,
      timestamp: moment().toISOString()}
    );
  }

  /**
   * Method responsible for appending activity to the activity file.
   * @param userStatus
   * @param duration
   */
  public appendActivity(userStatus: boolean, duration: number) {
    this.insertJsonNode(this.currentActivityFile, 'activities', {
      userActive: userStatus,
      duration: duration
    });
  }

  /**
   * Method responsible for appending a node inside json file.
   * @param target
   * @param node
   * @param value
   */
  private insertJsonNode(target: string, node: string, value: any) {
    fse.readFile(target, (err, data: any) => {
      let json = JSON.parse(data);
      json[node].push(value);
      fse.writeFile(target, JSON.stringify(json), () => {});
    });
  }

  /**
   * Method responsible for rotating old activity files with
   * new ones. This method is usually called in an interval.
   */
  public rotate() {
    const currentActFile = this.getActFile();

    if (!currentActFile) {
      logger.log("Rotation skipped due to no in-memory file.");
      return;
    }

    // append new activities if available before generating new file.
    if(activityStorage.duration > 0) {
      this.appendActivity(activityStorage.userStatus, activityStorage.duration);
    }

    const ts = Date.now();
    const fp = jsonfile.readFileSync(currentActFile);

    // Take screenshot
    this.takeScreenshot(ts);

    const tempFile = this.generateActivityFile({
      timestamp: ts,
      userId: fp.userId,
      workspaceId: fp.workspaceId,
      projectId: fp.projectId
    });

    this.appendEvent("continueLogging", tempFile);

    // Swap files
    this.loadActFile(tempFile);
    logger.info(`File rotation completed. New file is ${tempFile}`);
    return Date.now();
  }

  /**
   * Method responsible for generating activity file, populating it with
   * blueprint data and adding the file to memory.
   * @param args
   */
  newActivityFile(args: any) {
    // Generate an actual file
    this.currentActivityFile = this.generateActivityFile({
      timestamp: args.timestamp,
      userId: args.userId,
      workspaceId: args.workspaceId,
      projectId: args.projectId
    });
  }

  /**
   * Method responsible for returning path to the activities folder.
   */
  public getScreenshotsPath() {
    return this.screenshotsPath;
  }

  /**
   * Method responsible for taking a screenshot of client's desktop.
   * @param name
   */
  public takeScreenshot(timestamp: number) {
      const imageName = timestamp.toString() + ".jpg";
      const finalImageName = this.screenshotsPath + "/" + imageName;

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

      logger.log("Screenshot taken");
  }

}
