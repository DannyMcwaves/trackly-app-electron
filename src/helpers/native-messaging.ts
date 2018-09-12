import { app } from "electron";
import * as moment from 'moment';
import { Emitter} from "./emitter";
import * as logger from "electron-log";
import * as fs from "fs-extra";

const path = require('path');

const appDir = app.getPath("userData");
const nativeMessagesDir = appDir + "/nativeMessages";
let watch : any = null;

function sleep(ms: number){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

const nativeMessages = {
    start: () => {
        watch = fs.watch(nativeMessagesDir, async (eventType, filename) => {
            if(eventType === 'change'){
                try {
                    await sleep(300);
                    const fileData = await fs.readJson(nativeMessagesDir + '/' + filename);
                    logger.log("file data:" , fileData, typeof(JSON.parse(fileData)));
                    Emitter.appendEvent("URLLoaded", moment().milliseconds(0).toISOString(), JSON.parse(fileData));
                } catch (err) {
                    logger.error(err)
                }
            }
        });
        logger.log('=== Native Messaging listener started ===');
    },
    stop: () => {
        try {
            logger.log("closing nm watch");
            watch.close();
        } catch (error) {
            logger.error(error);
        }
        // empty out exchangeDir dir
        fs.readdir(nativeMessagesDir, (err, files) => {
            if (err) logger.error(err);

            for (let file of files) {
                fs.unlink(path.join(nativeMessagesDir, file), err => {
                if (err) logger.error(err);
                });
            }
        });
        logger.log('=== Native Messaging listener stopped ===');
    }
};

export const NativeMessaging = nativeMessages;