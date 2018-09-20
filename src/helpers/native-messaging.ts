import { app } from "electron";
import * as moment from 'moment';
import { Emitter} from "./emitter";
import * as logger from "electron-log";
import * as fs from "fs-extra";

const path = require('path');
const homedir = require('os').homedir();

// in dev mode use production swapDir this requires desktop app with nativeMessages to be installed on th system
const getNMswapDir = () => {
    if(process.env.NODE_ENV !== "production"){
        if(process.platform === 'darwin'){
            return homedir + '/Library/Application Support/trackly-desktop';
        }
        if(process.platform === 'win32'){
            return homedir + '\\AppData\\Roaming\\trackly-desktop';
        }
    }else{
        return app.getPath("userData");
    }
}

const appDir = getNMswapDir();
const nativeMessagesDir = appDir + "/nativeMessages";
let watch : any = null;
// mac have the same event on creation and on file write so we are using the switch not to duplicae events
// Event Horizon - it this somehow changes trough osx vesions we will log every other event.
let macSwitch: boolean = true;

function sleep(ms: number){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

const nativeMessages = {
    start: () => {
        watch = fs.watch(nativeMessagesDir, async (eventType, filename) => {
            macSwitch = !macSwitch; // Event Horizon
            if(eventType === 'change' || (process.platform === 'darwin' && eventType === 'rename' && macSwitch)){
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