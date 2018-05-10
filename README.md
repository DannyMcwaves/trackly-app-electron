# Trackly Desktop

### What is Trackly Desktop
Trackly desktop is an [Electron application](https://electronjs.org/) built for tracking user's activity and communicating with backend server. It's still under active development and thus subject to constant change.

### Development
To run a development copy of the application install dependencies with `yarn install` and then start the application with `yarn dev`.

> If you're getting a `MSBuildToolsPath` exception on Widndows, reinstall Node.js. Sometimes these errors are caused when there was a Visual Studio install on computer but was later removed.

> You might also need to install build tools with `npm install --global --production windows-build-tools`

### Log files
Log files in production environment and development environments are save to the operating sistem's default log directory.
- on Windows: `C:\Users\<user>\AppData\Roaming\trackly-desktop\log.log`
- on OS X: `~/Library/Logs/trackly-desktop/log.log`
- on Linux: `~/.config/trackly-desktop>/log.log` (**not supported**)

### Recordings
All recordings are stored in two folders; `activities` for actual mouse and keyboard activity and `screenshots` for desktop screenshots. You can find these files under respective folders.
 - on Windows `C:\Users\<user>\AppData\Roaming\trackly-desktop\records`
 - on OSX `/Users/<user>/Library/Application Support/trackly-desktop/records/`

### Updates
Updates are done through `electron-updater` package and are baked into executables itself. Updates should be automatically checked and applied when application is run. Updates are downloaded in the background without the need for user intervention. Once downloaded, the updates are installed on next run.

### Environment variables
In order to overwrite any of the environment variables set in the application, one has to add them to the system running the `Node.js` application.

> OSX/Linux
`export ENV_VARIALBE="something"`
> Windows
`set ENV=something`

List of available variables
* `ELECTRON_WEBPACK_APP_API_URL` (https://trackly.com) [API endpoint]
* `ELECTRON_WEBPACK_APP_SYNC_INTERVAL` (600) [Sync interval in seconds]

### Activity schema
This is an example of a json document that is sent to a server for parsing.
```
{
    "userId": <string>[Id of user tracked],
    "workspaceId": <string> [Id of workspace tracked],
    "projectId": <string> [Id of project tracked] or 0,
    "createdAt": <UTC timestamp, ISO> [Timestamp of file creation]
    "events":[
       {
          "type": <string> [startLogging|stopLogging|continueLogging],
          "timestamp": <UTC timestamp, ISO> [Timestamp of event]
       }
    ],
    "activity":[
       {
          "userActive": <boolean> [Denotes whether the user was active],
          "duration": <integer> [Amount in seconds]
       }
    ]
}
```

For example:
```
...
{
    "userActive": true,
    "duration": 20
}
```
means that the user was active for 20 seconds.

If the user has tracked a time on a single project for longer than `ELECTRON_WEBPACK_APP_SYNC_INTERVAL`, the newly generated file has a `continueLogging` event as the first input in events list.

Possible combinations of event types in activity files are: [`startLogging`, `stopLogging`], [`startLogging`],  [`continueLogging`] and [`continueLogging`, `stopLogging`]

### Tracking time without projects in the backend
In case there are no projects in the backend, we still want to allow users to start tracking time on a project, so
the initial project get an id of `0`

### Note on screenshots
The screenshot node module used is downloaded from github repo instead of npm. This is because the original package hasn't been updated in years and some critical fixes had to be done in order to get the application to work.

The repo used is https://github.com/jhotujec/node-desktop-screenshot.

### Connecting to the API.
The default API endpoint connection provided is [trackly.com](https://trackly.com/)(https://trackly.com/api). To configure a custom API endpoint, follow the steps below:

Copy and rename the .env.example file to .env
- `cp .env.example .env`

**Api Url**

Provide/change the `apiUrl` property in the `.env` file to the name of the API host.
- `apiUrl=http://localhost:3000`

**Error Reports**

Provide/change the `reportsUrl` property in the `.env` file to the value of the crash reports url.
- `reportsUrl=http://localhost:8000/api/log`
