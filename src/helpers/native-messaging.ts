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

const nmWindows = {
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
}

// logic for nm on mac can go here
const nmMac = {
    start: () => {
        
// NATIVE MESSAGING ----------------------------------->>>>>>>>>>>>>>>>>>>>>>>
// this is working in node but not in electron main process, should work on mac/linux
// see: https://www.notion.so/trackly/Native-Messaging-for-windows-f1ec4b9a26694ca79c586a8b6a827429
let msgBacklog = "";
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    AppendInputString(chunk);
});

function Send(message : object) {
  let msgStr = JSON.stringify(message);
  let lengthStr = String.fromCharCode(
      msgStr.length & 0x000000ff,
      (msgStr.length >> 8) & 0x000000ff,
      (msgStr.length >> 16) & 0x000000ff,
      (msgStr.length >> 24) & 0x000000ff
  );
  process.stdout.write(lengthStr+msgStr);
}

function recievedMessageHandle(msg : object){
  Emitter.appendEvent("URLLoaded", moment().milliseconds(0).toISOString(), msg);
  Send({
    message: "Trackly",
    status: "message received"
  });
}

// this function can be start and there is no need for stop,
// if this does not work we can try to make proxy as for windows and then copy the code for win here
function AppendInputString(chunk : any) {
    msgBacklog += chunk;
    while (true) {
        if (msgBacklog.length < 4)
            return;
        let msgLength = msgBacklog.charCodeAt(0) + (msgBacklog.charCodeAt(1) << 8) +
            (msgBacklog.charCodeAt(2) << 16) + (msgBacklog.charCodeAt(3) << 24);
        if (msgBacklog.length < msgLength + 4)
            return;
        try {
            let msgObject = JSON.parse(msgBacklog.substring(4, 4 + msgLength));
            recievedMessageHandle(msgObject);
        } catch (e) {}
        msgBacklog = msgBacklog.substring(4 + msgLength);
    }
} 

// END NATIVE MESSAGING ----------------------------------->>>>>>>>>>>>>>>>>>>>>>>
        
    },
    stop: () => {
        
    }
}

if(process.platform === 'win32'){
    var nativeMessages = nmWindows;
}else{
    var nativeMessages = nmMac;
}

export const NativeMessaging = nativeMessages;