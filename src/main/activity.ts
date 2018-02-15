// tslint:disable-next-line:no-var-requires
const screenshot = require("desktop-screenshot");
// tslint:disable-next-line:no-var-requires
const fse = require("fs-extra");
import {app} from "electron";

import * as logger from "electron-log";
import * as fs from "fs";
import * as ioHook from "iohook";
import * as jsonfile from "jsonfile";
import {Observable} from "rxjs/Rx";

class Activity {

    public appendActivity(isActive: boolean) {
        const activitiesFile = this.getCurrentRecordFile();

        if (isActive !== this.userCurrentActivityStatus) {

            try {
                fs.readFile(activitiesFile, (err, data: any) => {
                    const json = JSON.parse(data);
                    json.records.push({
                        isActive: this.userCurrentActivityStatus,
                        timestamp: Date.now(),
                    });

                    fs.writeFile(activitiesFile, JSON.stringify(json), () => {
                    });
                });
            } catch (e) {
                logger.error(e.toString());
            }
        }

    }

    /*
     * Get current record file for storing activities or create new if
     * this one is older than allowed log rotation time span
     */
    public getCurrentRecordFile() {
        let recordFile: string;
        const cachedTimeStamp = Activity.getUNIXTimestamp();

        Activity.ensureDirExists(this.getActivitiesFolder());
        const recordFiles = fse.readdirSync(this.getActivitiesFolder());

        if (recordFiles.length) { // Check if any activities already saved
            recordFiles.forEach((file: any) => {
                const unixFileName = Activity.convertFileNameToUnixTimestamp(file);

                if ((cachedTimeStamp - unixFileName) < this.config.records.fileRotation) {
                    recordFile = this.getActivitiesFolder() + unixFileName + ".json";
                }
            });
        } else {
            const newFile = this.getActivitiesFolder() + cachedTimeStamp.toString() + ".json";
            this.takeScreenShot(cachedTimeStamp.toString());
            const blankActivity = {
                created: cachedTimeStamp,
                records: [] as any[],
            };
            jsonfile.writeFile(newFile, blankActivity, (err) => {
                if (err) {
                    console.error(err);
                }
            });

            recordFile = newFile;
        }

        console.log(recordFile);

        return recordFile;
    }


    /*
     * Begin logging user actions with Observables
     */
    public startActivity() {
        ioHook.start(false);
        ioHook.on("keypress", () => {
            this.userCurrentActivityStatus = true;
        });
        ioHook.on("mousemove", () => {
            this.userCurrentActivityStatus = true;
        });

        return Observable
            .interval(1000)
            .map(() => {
                const v = this.userCurrentActivityStatus;
                this.userCurrentActivityStatus = false;
                return v;
            });
    }

    /*
     * Stop logging user actions
     */
    public stopActivity() {
        this.timerRunning = false;

        ioHook.unload();
        ioHook.stop();
    }

    private static convertFileNameToUnixTimestamp(fileName: string, extension = ".json") {
        const extensionLength = extension.length;
        return parseInt(fileName.slice(0, -extensionLength));
    }

    private static getUTCTimestamp() {
        return new Date().getTime();
    }

    private static getUNIXTimestamp() {
        return Date.now();
    }

    /*
     * Ensure that directory with all the subdirectories exist on disk
     */
    private static ensureDirExists(dir: string) {
        if (!fse.existsSync(dir)) {
            fse.ensureDirSync(dir);
        }
    }

    private baseDir: string;
    private userCurrentActivityStatus = false;
    private timerRunning = false;

    private config = {
        records: {
            activities: {
                directory: "activities/",
                interval: 5000,
            },
            fileRotation: 600000,
            screenshots: {
                directory: "screenshots/",
                extension: ".jpg",
                height: 900,
                quality: 100,
            },
        },
    };


    constructor() {
        this.baseDir = app.getPath("userData") + "/records/";
    }

    /*
     * Extract timestamp from file name
     */

    private getScreenshotsFolder() {
        return this.baseDir + this.config.records.screenshots.directory;
    }

    private getActivitiesFolder() {
        return this.baseDir + this.config.records.activities.directory;
    }

    /*
     * Take a screen shot of user's desktop
     */
    private takeScreenShot(imageName: string) {
        const imageExtension = this.config.records.screenshots.extension;
        const finalImageName = this.getScreenshotsFolder() + imageName + imageExtension;

        try {
            Activity.ensureDirExists(this.getScreenshotsFolder());
        } catch (error) {
            logger.log(error.toString());
        }

        screenshot(finalImageName, {
                height: this.config.records.screenshots.height,
                quality: this.config.records.screenshots.quality,
            },
            (error: any, complete: any) => {
                if (error) {
                    logger.error(error.toString());
                }
            });
    }
}

export default new Activity();