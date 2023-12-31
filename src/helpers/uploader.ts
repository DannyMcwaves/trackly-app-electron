const Store = require("electron-store");
import * as logger from "electron-log";
import * as req from "request";
import * as fse from "fs-extra";
import { ApiService } from "../renderer/app/services/api.service";
import { Fscs } from "./fscs";
export class Uploader {
  private store: any;
  private api: any;
  private uploadTimeout = 500;
  private onUserFailCb: Function;

  constructor(private fscs: Fscs, onUserFail: Function) {
    this.api = new ApiService();
    this.store = new Store();
    this.onUserFailCb = onUserFail;
  }

  public upload(callback: any) {
    logger.info('Upload started');
    setTimeout(() => {
      this.uploadActivities(() => {
        // this.uploadScreenshots();
      });
      callback();
    }, this.uploadTimeout);
  }

  public uploadActivities(callback: any) {

    const dir = this.fscs.getActivitiesPath();

    fse.readdir(dir, (err, files) => {
      files.forEach(file => {
        // Skip current file if the timer is up and running.
        if (`${dir}/${file}` == this.fscs.getActFile()) {
          logger.log('Skip uploading file in memory.');
          return;
        }

        logger.info(fse.readFileSync(`${dir}/${file}`, 'utf8'));

        const data = {
          res: fse.createReadStream(`${dir}/${file}`)
        };

        req.post(this.api.uploadActivitiesURL(), { formData: data }, (err, res, data) => {
          if(err || !res || typeof res === "undefined" || typeof res.statusCode === "undefined"){
            logger.warn(`File upload failed: ${file}`);
            logger.error(res);
            logger.error(err);
            return;
          } 
          if(res.statusCode == 200){
            fse.unlink(`${dir}/${file}`, () => { });
            logger.info(`File ${file} uploaded to ${this.api.uploadActivitiesURL().slice(0,-78)}: ${file}`);
            callback();
          }else if(res.statusCode === 401) {
            this.checkUser();
          }else{
            logger.warn(`Unhandeled response on uploading: ${file}`);
            logger.warn(res.statusCode);
            logger.warn(res.body);
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
        if (this.fscs.getActFile() && file.match(/\d+/)[0] === this.fscs.getActFile().match(/\d+/)[0]) {
            logger.log('Skip uploading screenshot file in memory.');
            return;
        }

        const data = {
          res: fse.createReadStream(`${dir}/${file}`)
        };

        req.post(this.api.uploadScreenshotsURL(), { formData: data }, (err, res, data) => {
          if(err || !res || typeof res === "undefined" || typeof res.statusCode === "undefined"){
            logger.warn(`File upload failed: ${file}`);
            logger.error(res);
            logger.error(err);
            return;
          }
          if (res.statusCode == 200) {
            fse.unlink(`${dir}/${file}`, () => { });
            logger.info(`File ${file} uploaded to ${this.api.uploadScreenshotsURL()}: ${file}`);
          }else if(res.statusCode === 401){
            this.checkUser();
          }else {
            logger.warn(`Unhandeled response on uploading: ${file}`);
            logger.warn(res.statusCode);
            logger.warn(res.body);
          }
        });
      });
    });
  }

  public uploadErrorReports() {
    const logFile = this.fscs.currentLogFile;
    const fileSize = fse.existsSync(logFile) ? fse.statSync(logFile).size : null;
    if (fileSize) {
      const data = {
        res: fse.createReadStream(logFile)
      };
      req.post(this.api.uploadErrorReportsURL(), {formData: data}, (err, res, data) => {
        if(err || !res || typeof res === "undefined" || typeof res.statusCode === "undefined"){
          logger.warn(`Log File upload failed: ${logFile}`);
          logger.error(res);
          logger.error(err);
          return;
        }
        if (res.statusCode == 200) {
          fse.unlink(logFile, () => { });
        } else {
          logger.warn(`Unhandeled response on uploading log file: ${logFile}`);
          logger.warn(res.statusCode);
          logger.warn(res.body);
        }
      })
    } else if(fileSize !== null) {
      fse.unlinkSync(logFile);
    }
  }
   private checkUser() {
     // token exired new login needed
     this.store.delete("token");
     this.store.delete("userId");
     this.onUserFailCb();
   }

}