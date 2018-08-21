import { app } from "electron";
import * as fse from "fs-extra";
import * as logger from "electron-log";
const path = require('path');

let utiltiy = {
  emptyUpdateInstallerDir:  () => {
    const installerDir = app.getPath("appData") + path.sep + "Trackly";
    const appDir = app.getPath("userData");

    // empty out installer dir
    fse.readdir(installerDir, (err, files) => {
      if (err){
        logger.error(err);
        return;
      } 
      
      // if object is empty, exit mac fix
      if(Object.keys(files).length === 0) return;
    
      for (let file of files) {
        fse.unlink(path.join(installerDir, file), err => {
          if (err) logger.error(err);
        });
      }
    });

    // delete installers from app dir
    fse.readdir(appDir, (err, files) => {
      if (err){
        logger.error(err);
        return;
      }
    
      for (let file of files) {
        let regexp = /installer/gi;
        //let regexp = '/installer/gi';
        if(file.match(regexp)){
          fse.unlink(path.join(appDir, file), err => {
            if (err) logger.error(err);
          });
        } 
      }
    });
  }
}

export const Utility = utiltiy;