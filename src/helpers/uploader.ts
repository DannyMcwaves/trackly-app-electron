import * as logger from "electron-log";
import * as req from "request";
import * as fse from "fs-extra";
import { ApiService } from "../renderer/app/services/api.service";
import { Fscs } from "./fscs";

export class Uploader {
  private store: any;
  private api: any;
  private uploadTimeout = 500;

  constructor(private fscs: Fscs) {
    this.api = new ApiService();
  }

  public upload(callback: any) {
    logger.log('Upload started');
    setTimeout(() => {
      this.uploadActivities();
      this.uploadScreenshots();
      callback();
    }, this.uploadTimeout);
  }

  public uploadActivities() {

    const dir = this.fscs.getActivitiesPath();

    fse.readdir(dir, (err, files) => {
      files.forEach(file => {
        // Skip current file if the timer is up and running.
        if (`${dir}/${file}` == this.fscs.getActFile()) {
          logger.log('Skip uploading file in memory.');
          return;
        }

        const data = {
          res: fse.createReadStream(`${dir}/${file}`)
        };

        req.post(this.api.uploadActivitiesURL(), { formData: data }, (err, res, data) => {
          if (!err && res.statusCode == 200) {
            fse.unlink(`${dir}/${file}`, () => { });
            logger.log(`File ${file} uploaded to ${this.api.uploadActivitiesURL()}: ${file}`);
          } else {
            logger.warn(`File upload failed: ${file}`);
          }
        });
      });
    });
  }

  public uploadScreenshots() {

    const dir = this.fscs.getScreenshotsPath();

    fse.readdir(dir, (err, files) => {
      files.forEach(file => {

        // do not upload the screenshot if it has same name as the current json file in memory.
        if (`${dir}/${file}` == this.fscs.getActFile()) {
            logger.log('Skip uploading screenshot file in memory.');
            return;
        }

        const data = {
          res: fse.createReadStream(`${dir}/${file}`)
        };

        req.post(this.api.uploadScreenshotsURL(), { formData: data }, (err, res, data) => {
          if (!err && res.statusCode == 200) {
            fse.unlink(`${dir}/${file}`, () => { });
            logger.log(`File ${file} uploaded to ${this.api.uploadScreenshotsURL()}: ${file}`);
          } else {
            logger.warn(`File upload failed: ${file}`);
          }
        });
      });
    });
  }

}