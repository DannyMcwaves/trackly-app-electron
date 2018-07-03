
import { BrowserWindow } from "electron";
import {join} from "path";

let windowDefaults = {
  height: 0,
  width: 400,
  minWidth: 400,
  title: "Preferences",
  center: true,
  show: false,
  resizable: true,
  movable: true,
  maximizable: false,
  webPreferences: {
    webSecurity: true
  }
};
let windowURL = join(__static, '/prefs.html');
let appWindow: BrowserWindow;


// // Ensure only one instance of the application gets run
// const isSecondInstance = app.makeSingleInstance(
//   (commandLine, workingDirectory) => {
//     if (appWindow) {
//       if (appWindow.isMinimized()) appWindow.restore();
//       appWindow.focus();
//     }
//   }
// );
//
// if (isSecondInstance) {
//   app.quit();
// }
//

/**
 * Create application window for preferences.
 */
function createWindow() {

  let windowFrame = new BrowserWindow(windowDefaults);
  windowFrame.loadURL(windowURL);

  windowFrame.on('closed', (event: any) => {
    appWindow = null;
  });

  return windowFrame;
}

export function createPrefWindow() {
  // appWindow = createWindow();
  console.log('real');
}