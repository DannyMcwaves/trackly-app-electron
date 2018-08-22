import { app } from "electron";
import * as fse from "fs-extra";
import * as logger from "electron-log";
const path = require('path');
const { exec } = require('child_process');

const appDir = app.getPath("userData");
const installerDir = appDir + path.sep + "Trackly";
// see if same file name could do for win,mac
const nmInstallationSuccess = appDir + path.sep + 'nmInstallSucess';
const nmManifestFile = appDir + path.sep + 'trackly.json';
const chromeRegistryFile = appDir + path.sep + 'chrome.reg';
const firefoxRegistryFile = appDir + path.sep + 'firefox.reg';
const nmProxyExe = appDir + path.sep + 'trackly_nm_proxy.exe';
const nmSwapFileDir = appDir + path.sep + 'nativeMessages'

function createManifest() {

  const manifest : any = {
    name: "trackly",
    description: "Host proxy for native messaging",
    type: "stdio"
  };

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

    // mac should be able to stdio in main process, this should be tested. 
    // see: https://stackoverflow.com/questions/42256410/chrome-native-messaging-with-electron-app
    // if this works code should be in helpers/native-messaging.ts   
    manifest.path = '/Applications/Trackly.app/';
  
  }

  if(process.platform === 'win32'){
    
    // Path to the proxy application.
    // On Windows, this may be relative to the manifest itself. On OS X and Linux it must be absolute.
    manifest.path = nmProxyExe;
  }

  // try to use single file for both browsers since there are one key difference
  const manifestChrome = Object.assign({}, manifest);
  const manifestFirefox = Object.assign({}, manifest);
  manifestChrome.allowed_origins = ["chrome-extension://knldjmfmopnpolahpmmgbagdohdnhkik/"];
  manifestFirefox.allowed_extensions = ["dev@trackly.com"];

  try {
    fse.writeJsonSync(nmManifestFile , manifest);
    logger.log('Native messaging manifest file created at: ' + nmManifestFile);
    fse.writeJsonSync(nmManifestFile , manifest);
    logger.log('Native messaging manifest file created at: ' + nmManifestFile);
  } catch (err) {
    logger.error(err);
  }
}

function createRegistryFiles() {

  // only for windows
  if(process.platform === 'aix' ||
    process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'openbsd' ||
    process.platform ==='sunos' ||
    process.platform === 'darwin') {

    console.error("OS not supported.");
    return;

  };

  if(process.platform === 'win32'){

    let regex = /\\/g;

    // prepare registry files
    const chromeRegistry = `Windows Registry Editor Version 5.00
    [HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.trackly.trackly]
    @="${nmManifestFile.replace(regex, '\\\\')}"`;

    const firefoxRegistry = `Windows Registry Editor Version 5.00
    [HKEY_CURRENT_USER\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\trackly]
    @="${nmManifestFile.replace(regex, '\\\\')}"`;

    // make file chrome
    try {
      fse.writeFileSync(chromeRegistryFile , chromeRegistry);
      logger.log('Chrome registry file created at: ' + chromeRegistryFile);
    } catch (err) {
      logger.error(err);
    } 
    // firefox
    try {
      fse.writeFileSync(firefoxRegistryFile , firefoxRegistry);
      logger.log('Firefox registry file created at: ' + firefoxRegistryFile);
    } catch (err) {
      logger.error(err);
    }
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
    console.log("=== ATEMPT TO WRITE TO WINDOWS REGISTRY ===");
    // FF
    // for win add registry key
    // global - see WARNING
    // HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\<name>

    // WARNING: this does not work for HKEY_LOCAL_MACHINE
    exec('reg import ' + firefoxRegistryFile, (err : any, stdout : any, stderr : any) => {
      if (err) {
        // node couldn't execute the command
        logger.error(err);
        // write the installation success file so the application do this on first run only
        fse.writeFileSync(nmInstallationSuccess , true);
        return;
      }

      // the *entire* stdout and stderr (buffered)
      logger.log(`stdout: ${stdout}`);
      logger.log(`stderr: ${stderr}`);
    });
 
    // per user
    // HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\<name>

    // Chrome
    // win global - see WARNING
    // HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.my_company.my_application
    exec('reg import ' + chromeRegistryFile, (err : any, stdout : any, stderr : any) => {
      if (err) {
        // node couldn't execute the command
        logger.error(err);
        fse.writeFileSync(nmInstallationSuccess , true);
        return;
      }
       // the *entire* stdout and stderr (buffered)
       logger.log(`stdout: ${stdout}`);
       logger.log(`stderr: ${stderr}`);
    });
    // user
    // HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.my_company.my_application
    // value is a path to the manifest file

  }
}

let utiltiy = {
  emptyUpdateInstallerDir:  () => {
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
        if(file.match(regexp)){console.log(file);
          fse.unlink(path.join(appDir, file), err => {
            if (err) logger.error(err);
          });
        } 
      }
    });
  },
  checkNativeMessaging: () => {
    const exists = fse.existsSync(nmInstallationSuccess);
    
    // fire on the first run only
    if(!exists){
      // split by os
      // add key path: "assign dynamically path to the native application",
      // for chrome add key: allowed_origins: : [ "dev@trackly.com" ]
      // for ff add key: allowed_extensions: [ "dev@trackly.com" ]
      createManifest();

      //create file in userData folder
      
      // for win make registry key (chrome and ff use different keys and different locations )
      createRegistryFiles();

      // ensure there is swap folder
      fse.ensureDirSync(nmSwapFileDir);

      // for linux, mac copy to folder
      // for win add registry key (chrome and ff use different keys and different locations )
      installNativeMessaging(nmManifestFile);

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
