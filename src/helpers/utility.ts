
import { app } from "electron";
import * as fse from "fs-extra";
import { platform } from "os";
import * as logger from "electron-log";

async function createManifest(manifest, file) : void {
    // 'aix'
  // 'darwin'
  // 'freebsd'
  // 'linux'
  // 'openbsd'
  // 'sunos'
  // 'win32'
  // win and mac supported for now

  if(platform === 'darwin'){
    
  }

  if(platform === 'win32'){

  }
  manifest.path = "";
  manifest.allowed_origins = ["dev@trackly.com"];
  manifest.allowed_extensions = ["dev@trackly.com"];

  try {
    await fse.writeJson(file , manifest)
  } catch (err) {
    logger.error(err);
  }
}

function installNativeMessaging(platform, file) : void {
  // 'aix'
  // 'darwin'
  // 'freebsd'
  // 'linux'
  // 'openbsd'
  // 'sunos'
  // 'win32'
  // win and mac supported for now

  if(platform === 'darwin'){
    
  }

  if(platform === 'win32'){

  }
}

const Utility : any = {
  checkNativeMessaging: async () => {

    // see if same file name could do for win,mac
    const file = app.getPath("userData") + 'trackly.json';
    const exists = await fse.pathExists(file);
    const manifest = {
      name: "trackly",
      description: "Example host for native messaging",
      type: "stdio"
    };

    // fire on the first run only
    if(!exists){
      // split by os
      // add key path: "assign dynamically path to the native application",
      // for chrome add key: allowed_origins: : [ "dev@trackly.com" ]
      // for ff add key: allowed_extensions: [ "dev@trackly.com" ]
      createManifest(manifest, file);
      //create file in userData folder
      // for linux, mac copy to folder
      // for win make registry key (chrome and ff use different keys and different locations )
      installNativeMessaging(platform, file);
      
    }
  }
}

export = Utility;