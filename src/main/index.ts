import {app, BrowserWindow, ipcMain, shell} from 'electron';
import Activity from "./activity";

const isDevelopment = process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow;
const masterActivity = Activity;
let activityInstance: any;

function createMainWindow() {
    const window = new BrowserWindow({
        height: 400,
        width: 400,
        title: "Trackly Desktop",
        center: true,
        show: true,
        resizable: true, // Only for dev
        useContentSize: true,
        movable: true,
        webPreferences: {
            webSecurity: false // TODO: Remove in production!
        }
    });

    // Set url for `win`
    // points to `webpack-dev-server` in development
    // points to `index.html` in production
    const url = isDevelopment
        ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
        : `file://${__dirname}/dist/renderer/index.html`;

    if (isDevelopment) {
        // window.webContents.openDevTools();
    }

    window.loadURL(url);

    window.on('closed', () => {
        mainWindow = null;
    });

    return window;
}

app.on('window-all-closed', () => {
    // On macOS it is common for applications to stay open
    // until the user explicitly quits
    if (process.platform !== 'darwin') app.quit()
});

app.on('activate', () => {
    // On macOS it is common to re-create a window
    // even after all windows have been closed
    if (mainWindow === null) mainWindow = createMainWindow();
});

// Create main BrowserWindow when electron is ready
app.on('ready', () => {
    mainWindow = createMainWindow();
});

/**
 * Resize the application frame window to desired dimensions.
 * @param {Object}: desiredSize - New dimensions for the window.
 */
ipcMain.on('win:resize', (event: any, desiredSize: any) => {

    mainWindow.setSize(
        desiredSize.width || mainWindow.getSize()[0],
        desiredSize.height + 22 || mainWindow.getSize()[1],
        true // Use animation when resizing - Only on MacOS.
    );
});

/**
 * Hides or shows the application window.
 * @param {boolean}: show - Denotes whether to show or hide the app.
 */
ipcMain.on('win:show', (event: any, show: boolean) => {
    show ? mainWindow.show() : mainWindow.hide()
});

/**
 * Open link in an external browser window.
 */
ipcMain.on('open:link', (event: any, link: string) => {
    shell.openExternal(link);
});

/**
 * Main activity timer logic and observable
 */
ipcMain.on("timer", (event: any, args: any) => {
    // Start timer, subscribe to activity observer
    if (args.action == 'start') {

        activityInstance = masterActivity.startActivity(args.user, 'test').subscribe(
            (userActive) => {
                mainWindow.webContents.send("timer:tick", {});
                masterActivity.appendActivity(userActive);
            },
        );
    }

    // Stop timer
    if (args.action == 'stop') {
        activityInstance.unsubscribe();
        masterActivity.stopActivity();
    }

    if (args.action == 'pause') {
        // Not yet implemented
    }
});

/**
 * Upload files to the server
 */
ipcMain.on('upload', (event: any, args: any) => {
    console.log('Upload started');
});