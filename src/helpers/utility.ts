
import { app } from "electron";
import * as fse from "fs-extra";

const Utility : any = {
  installNativeMessaging: async () => {

    const file = app.getPath("userData") + 'trackly.json';
    const exists = await fse.pathExists(file);

    if(!exists){

    }
  }
}

export = Utility;