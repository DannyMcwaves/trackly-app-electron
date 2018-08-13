import * as moment from 'moment';
import { Emitter} from "./emitter";
import * as logger from "electron-log";
const nm = function(){
  logger.log("Native Messaging");

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
    logger.log("Sent: response");
    Send({
      message: "Trackly",
      status: "message received"
    });
  }
  
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
              logger.log("Recieved: ", msgObject);
              recievedMessageHandle(msgObject);
          } catch (e) {}
          msgBacklog = msgBacklog.substring(4 + msgLength);
      }
  } 
  
}

export const NativeMessaging = nm();