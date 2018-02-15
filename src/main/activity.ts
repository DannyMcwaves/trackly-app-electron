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
import * as req from "request";

class Activity {

    private activeFile: string;
    private timerRunning = false;
    private timerInterval = 1000;
    public userIsActive = false; // TODO: Move this to local scope

    private static getUTCTimestamp() {
        return new Date().getTime();
    }

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
        return Activity.getRecordsPath() + '/activities';
    }

    /**
     * Get folder with screenshot files.
     */
    private static getScreenshotsFolder() {
        return Activity.getRecordsPath() + '/screenshots';
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
        this.activeFile = Activity.getActivitiesFolder() + '/' + timeStamp.toString() + ".json";

        // Add initial skeleton to a file
        const _ = {
            userId: userId,
            createdAt: Activity.getUTCTimestamp(),
            activity: [] as any[],
            events: [] as any[]
        };

        jsonfile.writeFile(this.activeFile, _, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    /*
     * Append new activity the active file.
     */
    public appendActivity(active: boolean) {

        if (active !== this.userIsActive) {
            try {
                fs.readFile(this.activeFile, (err, data: any) => {
                    const json = JSON.parse(data);
                    json.activity.push({
                        isActive: active,
                        timestamp: Date.now(),
                    });

                    fs.writeFile(this.activeFile, JSON.stringify(json), () => {
                    });
                });
            } catch (e) {
                logger.error(e.toString());
            }
        }
    }

    /**
     * Append event to active file.
     */
    public appendEvent(event: string) {
        try {
            fs.readFile(this.activeFile, (err, data: any) => {
                const json = JSON.parse(data);
                json.events.push({
                    type: event,
                    timestamp: Date.now(),
                });

                fs.writeFile(this.activeFile, JSON.stringify(json), () => {
                });
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
        this.openFile('test', 'test');
        this.appendEvent('startLogging');

        console.log(this.activeFile);

        ioHook.start(false); // Disable dev logger

        // Track events
        ioHook.on("keypress", () => {
            this.userIsActive = true;
        });
        ioHook.on("mousemove", () => {
            this.userIsActive = true;
        });

        return Observable.interval(this.timerInterval).map(() => {
            const _userIsActive = this.userIsActive;
            this.userIsActive = false;
            return _userIsActive;
        });
    }

    /**
     * Stop tracking user activity.
     */
    public stopActivity() {
        this.timerRunning = false;

        const formData = {
            res: fse.createReadStream(this.activeFile)
        };

        req.post({
            //url: 'https://trackly.com/api/eventFiles/upload?access_token=cCOaYmraL6V0Pg6nyd2KeJjYr4mrJV2ph8VzzyA7BtRimFjoEgjZjChS4CFLlebq',
            //formData: formData
        },
        (success => {
            console.log(success);
        }),
        (error => {
            console.log('error');
        }));

        ioHook.unload();
        ioHook.stop();
    }

    /**
     * Take screenshot of user's desktop.
     */
    public takeScreenshot() {
        // PS
    }

}

export default new Activity();