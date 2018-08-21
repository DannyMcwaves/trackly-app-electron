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

const nm = {
    start: () => {
        watch = fs.watch(nativeMessagesDir, async (eventType, filename) => {
            if(eventType === 'change'){
                try {
                    await sleep(300);
                    const fileData = await fs.readJson(nativeMessagesDir + '/' + filename);
                    console.log("file data:" , JSON.stringify(fileData), typeof(fileData));
                    Emitter.appendEvent("URLLoaded", moment().milliseconds(0).toISOString(), fileData);
                } catch (err) {
                    console.error(err)
                }
            }
        });
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
        }
    },
}

export const NativeMessaging = nm;