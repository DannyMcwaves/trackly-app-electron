import { app } from "electron";
import * as fse from "fs-extra";
import * as logger from "electron-log";
import * as winReg from 'windows-registry';
const path = require('path');

function createManifest(manifest : any, file : any) {

  // win and mac supported for now
  if(process.platform === 'aix' ||
    process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'openbsd' ||
    process.platform ==='sunos') {

    console.error("OS not supported.");
    return;

  };

  if(process.platform === 'darwin'){

    manifest.path = '/Applications/Trackly.app/';
  
  }

  if(process.platform === 'win32'){
    
    // Path to the native application.
    // On Windows, this may be relative to the manifest itself. On OS X and Linux it must be absolute.
    manifest.path = 'C:\Program Files\Trackly\Trackly.exe';
  }

  // try to use single file for both browsers since there are one key difference
  manifest.allowed_origins = ["dev@trackly.com"];
  manifest.allowed_extensions = ["dev@trackly.com"];

  try {
    fse.writeJson(file , manifest, (err : any) => {
      if (err) return logger.error(err);

      logger.log('Native messaging manifest file created at: ' + file);
    });
    
  } catch (err) {
    logger.error(err);
  }
}

function installNativeMessaging(file : any) {

  if(process.platform === 'darwin'){

    // FF
    // OSX location
    // Library/Application Support/Mozilla/NativeMessagingHosts/<name>.json
    // per user
    // ~/Library/Application Support/Mozilla/NativeMessagingHosts/<name>.json
    // Linux
    // /usr/lib/mozilla/native-messaging-hosts/<name>.json

    // Chrome
    // OS X (system-wide)
    // Google Chrome: /Library/Google/Chrome/NativeMessagingHosts/com.my_company.my_application.json
    // Chromium: /Library/Application Support/Chromium/NativeMessagingHosts/com.my_company.my_application.json
    // OS X (user-specific, default path)
    // Google Chrome: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.my_company.my_application.json
    // Chromium: ~/Library/Application Support/Chromium/NativeMessagingHosts/com.my_company.my_application.json
    // Linux (system-wide)
    // Google Chrome: /etc/opt/chrome/native-messaging-hosts/com.my_company.my_application.json
    // Chromium: /etc/chromium/native-messaging-hosts/com.my_company.my_application.json
    // Linux (user-specific, default path)
    // Google Chrome: ~/.config/google-chrome/NativeMessagingHosts/com.my_company.my_application.json
    // Chromium: ~/.config/chromium/NativeMessagingHosts/com.my_company.my_application.json
  
  }

  if(process.platform === 'win32'){
    
    // FF
    // for win add registry key
    // global
    // HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\<name>
    try{
      let Key =  winReg.Key;
      let windef = winReg.windef;
      //let key = new Key('HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla', '' , windef.KEY_ACCESS.KEY_ALL_ACCESS);
      //var key2 = key.openSubKey('.txt', windef.KEY_ACCESS.KEY_ALL_ACCESS);
      //logger.log(key);
      //let createdKey = key.createSubKey('\NativeMessagingHosts', windef.KEY_ACCESS.KEY_ALL_ACCESS);
      //logger.log(createdKey);

      var key = new Key(windef.HKEY_LOCAL_MACHINE, '.txt', windef.KEY_ACCESS.KEY_ALL_ACCESS);
      //var createdKey = key.createSubKey('/NativeMessagingHosts/trackly', windef.KEY_ACCESS.KEY_ALL_ACCESS);
      logger.log(key);
      //key.setValue('(Default)', windef.REG_VALUE_TYPE.REG_SZ, file);
      //let createdKey = key.createSubKey('/NativeMessagingHosts', windef.KEY_ACCESS.KEY_ALL_ACCESS);
      //let tracklySubKey = createdKey.createSubKey('/trackly', windef.KEY_ACCESS.KEY_ALL_ACCESS);
     // tracklySubKey.setValue('default', windef.REG_VALUE_TYPE.REG_SZ, file);
      key.close();
    }catch(err){
      logger.error('Registry write error: ' + err);
    }

    // try{

    //  // win.registry(key, options)                   // returns an object containing the keys and values
 
    //   let v = win.registry('HKEY_LOCAL_MACHINE/SOFTWARE/Mozilla');   // wrapped in objects allowing further fluent commands
    //   v.add('NativeMessagingHosts');                          // a key is like a folder
    //   //v.subKey                                 // getter which goes down one level deeper
    // }catch(err){
    //   logger.error('Registry write error: ' + err);
    // }
    
 
    // per user
    // HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\<name>

    // Chrome
    // win global
    // HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.my_company.my_application
    // user
    // HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.my_company.my_application
    // value is a path to the manifest file

  }
}

let utiltiy = {
  emptyUpdateInstallerDir:  () => {
    const installerDir = app.getPath("appData") + path.sep + "Trackly";
    const appDir = app.getPath("userData");

    // empty out installer dir
    fse.readdir(installerDir, (err, files) => {
      if (err) logger.error(err);
    
      for (let file of files) {
        fse.unlink(path.join(installerDir, file), err => {
          if (err) logger.error(err);
        });
      }
    });

    // delete installers from app dir
    fse.readdir(appDir, (err, files) => {
      if (err) logger.error(err);
    
      for (let file of files) {
        let regexp = /installer/gi;
        //let regexp = '/installer/gi';
        if(file.match(regexp)){console.log(file);
          fse.unlink(path.join(appDir, file), err => {
            if (err) logger.error(err);
          });
        } 
      }
    });
  },
  checkNativeMessaging: () => {

    // see if same file name could do for win,mac
    const file = app.getPath("userData") + '/trackly.json';
    const exists = fse.existsSync(file);
    const manifest = {
      name: "trackly",
      description: "Host for native messaging",
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
      installNativeMessaging(file);

      // mac and linux can stdio from main process in electron windows can't
      // workaround
      // create windows executable that will be called from extension and that will write to file
      // or make a pipe to electron main process. then path in registry should be pointing to this app
      // not to trackly.exe 
      // this program can be created in the appDir by this utility on the first run
      // create exchange dir nativeMessages on same location

    }
  }
}

export const Utility = utiltiy;
