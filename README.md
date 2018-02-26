# Trackly Desktop

### What is Trackly Desktop
Trackly desktop is an [Electron application](https://electronjs.org/) built for tracking user's activity and communicating with backend server. It's still under active development and thus subject to constant changes. 

### Development
To run a development copy of the application install dependencies with `yarn install` and then start the application with `yarn dev`.

### Log files
Log files in production environment and development environments are save to the operating sistem's default log directory.
- on Windows: `%USERPROFILE%\AppData\Roaming\Trackly\log.log`  
- on OS X: `~/Library/Logs/Trackly/log.log`
- on Linux: `~/.config/Trackly>/log.log` (**not supported**)

### Recordings
All recordings are stored in two folders; `activities` for actual mouse and keyboard activity and `screenshots` for desktop screenshots.`
You can find these files under respective folders.
 - on Windows (`soon`)
 - on OSX `/Users/<user>/Library/Application Support/Electron/records/`
 
### Updates
Updates are done through `electron-updater` package and are baked into executables itself. Updates should be automatically checked and applied when application is run.

### Activity schema
This is an example of a json document that is sent to a server for parsing.
````
{
    "userId": <string>,
    "createdAt": <string>,
    "events":[
       {
          "type": <string>,
          "timestamp": <string>,
          "projectId": <string>
       }
    ],
    "activity":[
       {
          "userActive": <boolean>,
          "duration": <integer>
       }
    ]
}
```

**userId:** ID of a currently logged in user to the desktop application  
**createA:** UTC representation of a timestamp, when the activity file was created.  
**events:** Array of events that happen in an application. At the moment there are two events possible, `startLogging` and `stopLogging` with respective timestamps in UTC format.

`startLogging` occurs when user presses the tracking button and `stopLogging` when pause/stop button is pressed.

**projectID** is the ID of currently tracked project.

**activity:** Array of activities tracked for user. `userActive` is a boolean that denotes whether the user was active or not. `duration` is an integer that denotes for how long that stauts was maintained.

For example:
```
...
{
    "userActive": true,
    "duration": 20
}
```
means that the user was active for 20 seconds.