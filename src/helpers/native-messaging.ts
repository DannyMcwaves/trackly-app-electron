import { app } from "electron";
import * as moment from 'moment';
import { Emitter} from "./emitter";
import * as logger from "electron-log";
import * as fs from "fs-extra";

const appDir = app.getPath("userData");
const nativeMessagesDir = appDir + "/nativeMessages";

function sleep(ms: number){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

const nm = {
    start: () => {
        fs.watch(nativeMessagesDir, async (eventType, filename) => {
            if(eventType === 'change'){
                try {
                    await sleep(100);
                    const fileData = await fs.readJson(nativeMessagesDir + '/' + filename);
                    console.log("file data:" , JSON.stringify(fileData), typeof(fileData));
                    Emitter.appendEvent("URLLoaded", moment().milliseconds(0).toISOString(), fileData);
                } catch (err) {
                    console.error(err)
                }
            }
        });
    }
}

export const NativeMessaging = nm;