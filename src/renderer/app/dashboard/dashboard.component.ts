const Store = require("electron-store");

import {Component, ViewEncapsulation, NgZone} from "@angular/core";
import {ipcRenderer} from "electron";

import "./dashboard.component.scss";
import {UserService} from "../services/user.service";
import {OnInit, AfterViewChecked} from "@angular/core/src/metadata/lifecycle_hooks";
import {Router} from "@angular/router";
import {HttpClient, HttpParams} from "@angular/common/http";
import { CONSTANTS } from "../../../constants";

import * as moment from "moment";

@Component({
    selector: "#app",
    templateUrl: "/dashboard.component.html",
    encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit, AfterViewChecked {
    private baseURL = process.env.apiUrl ? process.env.apiUrl + "/api" : 'https://trackly.com/api';
    public projects: any;
    public perProject = {};
    public perProjectCached = {};
    public previousProject = {};
    public totalIimeToday = 0;
    public totalIimeTodayCached = 0;
    public currentSession = 0;
    public currentSessionCached = 0;
    public activeProject: any = {};
    public user: any;

    public startTime: moment.Moment;
    public endTime: moment.Moment;
    private today: any = (new Date()).getDate();

    private workspaces: any;
    private activeWorkspace: any;
    private lastSynced: any;
    private store: any;
    private resize: boolean;

    // Frame height & Sizes
    private baseFrameHeight = 36 + 120;
    private baseProjectHeight = 60;
    private maxProjectsLength = 5;
    private nextInterval: any;
    private trackingOffTimer: any;

    // idle stuff
    private idleDisplay: string = "none";
    private idleHeight: number = 10;
    private idleTime: number = 10;
    private idleStartTime: any = undefined;
    private idleStopTime: any = undefined;
    private isIdle: boolean = false;
    private currentIdleProject: string = "Madison Square";
    private activeProjectCache: any = {};
    private reAssign: boolean = false;
    private IdleFrom: string;
    public refresherTimeout: boolean = true;

    /**
     * Dashboard component constructor with added protection
     * for anonymous access.
     * @param {UserService} userService
     * @param {Router} router
     * @param {HttpClient} http
     * @param {ngZone} zone
     */
    constructor(private userService: UserService, private router: Router, private http: HttpClient, public zone: NgZone) {

        this.store = new Store();

        this._checkStoredUser();

        // Subscribe to main timer
        ipcRenderer.on("timer:tick", (event: any, projectId: string) => {
            this.endTime = moment().milliseconds(0);
            this.zone.run(() => {
                this.perProject[projectId] = this.getCurrentTime() + this.perProjectCached[projectId];
                this.totalIimeToday = this.getCurrentTime() + this.totalIimeTodayCached;
                this.currentSession = this.getCurrentTime() + this.currentSessionCached;
                ipcRenderer.send("time:travel", this.totalIimeToday);
            });
        });

        // Subscribe to sync update
        ipcRenderer.on("sync:update", (event: any, data: any) => {
            this.zone.run(() => {
                this.lastSynced = data;
            });
        });

        // send time travels to the system tray.
        ipcRenderer.on("timer:click", (event: any, id: string) => {
          // so the trick is to get the id of the element and then click on it.
          document.getElementById(id).click();
        });

        // stop the timer.
        ipcRenderer.on("stopTimeFromTray", (event: any) => {
          // so the trick is to get the id of the element and then click on it.
          if (this.activeProject.id) {
            this.activeProjectCache = JSON.parse(JSON.stringify(this.activeProject));
            this.trackProject(this.activeProject);
          }
        });

        // send idle timer signal to UI
        ipcRenderer.on("idler", (event: any) => {
          this.isIdle = true;
          this.IdleFrom = moment().subtract(CONSTANTS.IDLE_TRESHOLD, "seconds").format("h:mm A");
          this.idleStartTime = moment().milliseconds(0);
          document.getElementById("idler").classList.remove('d-none');
        });

        // keep updating the idle time
        ipcRenderer.on("idletime", (event: any, time: number) => {
          this.idleTime = time;
        });

        // reset timer when the timer is clicked.
        ipcRenderer.on("resetTimer", (event: any) => {
          this._refresher();
        });

        ipcRenderer.on("clickLoggingOut", (event: any) => {
          document.getElementById("outOfLogging").click();
        });

        // before the window unloads clear the tracking next day interval
        window.onbeforeunload = (ev: any) => {
          clearInterval(this.nextInterval);
          clearInterval(this.trackingOffTimer);
        };

        // Show update bar
        ipcRenderer.on("updateReady", (event: any) => {
          document.getElementById("newVersion").classList.remove('d-none');
          this.baseProjectHeight += 7;
          this._resizeFrame();
        });

        // Check user session status
        ipcRenderer.on("checkUser", (event: any) => {
          this._checkStoredUser();
        });

         // idle time handeling from main index on sustem standby
         ipcRenderer.on("suspend", (event: any) => {
          if( this.isIdle = true ) this.closeIdleTime();
        });
    }

    /**
     *  Resize application frame to an appropriate height.
     */
    private _resizeFrame() {
        let height: number;
        let projectHeight = this.projects.length < 6 ? this.projects.length : 5;
        height = this.baseFrameHeight + this.baseProjectHeight * projectHeight;
        this.idleHeight = height;
        ipcRenderer.send('win:height', height);
    }

    /**
     * If there is no user data in store navigate to login
     * @returns void
     * @private
     */
    private _checkStoredUser() {
      if (!this.store.has('token') && !this.store.has('userId')) {
        this.router.navigate(['login']);
      }
    }

    /**
     * Get logged in user ID and Token
     * @returns {userId: string | null; authToken: string | null}
     * @private
     */
    _getUserAuth() {
        this._checkStoredUser();
        
        const authToken = this.store.get("token");
        const userId = this.store.get("userId");

        return {
            userId: userId,
            authToken: authToken
        }
    }

    // Count time
    getCurrentTime() {
      if (this.startTime !== null) {
        let time = this.endTime.diff(this.startTime);
        return Math.round(time / 1000);
      }
      return 1
    }

    closeIdleTime() {
      this.isIdle = false;
      this.idleStopTime = moment().milliseconds(0);
      let idle = Math.round(this.idleStopTime.diff(this.idleStartTime) / 1000);
      this.idleStartTime.milliseconds(-CONSTANTS.IDLE_TRESHOLD*1000);

      this.perProject[this.activeProjectCache.id] -= CONSTANTS.IDLE_TRESHOLD;
      this.perProjectCached[this.activeProjectCache.id] -= CONSTANTS.IDLE_TRESHOLD;
      this.totalIimeToday -= CONSTANTS.IDLE_TRESHOLD;
      if(this.totalIimeToday < 0)  this.totalIimeToday = 0;
      this.currentSession += idle;
      ipcRenderer.send("time:travel", this.totalIimeToday);

      document.getElementById("idler").classList.add('d-none');
      ipcRenderer.send('idleResponse', {stopIdle: this.idleStartTime.toISOString(), project: this.activeProjectCache});
    }

    closeIdleAndTrack() {
      this.isIdle = false;
      this.idleStopTime = moment().milliseconds(0);

      // adjust the timers on the desktop app.
      let idle = Math.round(this.idleStopTime.diff(this.idleStartTime) / 1000);
      console.log(idle);

      this.perProject[this.activeProjectCache.id] += idle;
      this.perProjectCached[this.activeProjectCache.id] += idle;
      this.totalIimeToday += idle;
      this.currentSession += idle;
      ipcRenderer.send("time:travel", this.totalIimeToday);

      document.getElementById("idler").classList.add('d-none');
      ipcRenderer.send('idleResponse', {keepIdle: true, project: this.activeProjectCache, stopIdle: this.idleStopTime.toISOString()});

      document.getElementById(this.activeProjectCache.id).click();
    }

    toggleAssigner() {
      this.reAssign = !this.reAssign;
    }

    selectChange(event: any) {
      this.activeProjectCache = this.projects.filter((project: any) => project.title === event.target.value)[0];
    }

    reAssignIdleTime() {
      this.isIdle = false;
      this.reAssign = true;
      document.getElementById("idler").classList.add('d-none');
      ipcRenderer.send('idleResponse', {keepIdle: true, project: this.activeProjectCache, same: false});
    }

    trackProject(project: any) {
        // Check if time tracking is enabled for a user
        if (this.user && this.user.people[0].timeTracking) {
            // Clicked on running project
            if (project.id == this.activeProject.id) {
                ipcRenderer.send("timer", {
                    action: "stop",
                    date: this.endTime.toISOString(),
                    projectId: project.id
                });
                this.currentSessionCached = this.currentSession;
                this.totalIimeTodayCached = this.totalIimeToday;
                this.perProjectCached[project.id] = this.perProject[project.id];
                this.startTime = null;
                this.endTime = null;
                this.activeProject = {};
                return;
            }

            // Clicked on new project
            if (project.id != this.activeProject.id) {
                this.startTime =  moment().milliseconds(0);
                if (this.activeProject.id) {
                  ipcRenderer.send("timer", {
                      action: "stop",
                      date: this.endTime ? this.endTime.toISOString() : moment().milliseconds(0).toISOString(),
                      projectId: project.id
                  });
                }
                this.currentSessionCached = this.currentSession;
                this.totalIimeTodayCached = this.totalIimeToday;
                this.perProjectCached[this.activeProject.id] = this.perProject[this.activeProject.id] || 0;
                this.activeProject = project;
                this.currentIdleProject = project.title;
                ipcRenderer.send("timer", {
                  action: "start",
                  title: project.title,
                  projectId: project.id,
                  workspaceId: this.activeWorkspace.id,
                  userId: this._getUserAuth().userId,
                  timestamp: Date.now(),
                  date: this.startTime.toISOString()
                });
            }
        } else {
            alert('Time tracking is not enabled.');
        }

    }

    trackingOffNotifyer(){
      this.trackingOffTimer = setInterval(()=>{
        if (!this.activeProject.id) {
          ipcRenderer.send("show:notification");
        }
      }, 3600000)
    }

    /**
     * check next day
     * */
    trackNextDay() {
      this.nextInterval = setInterval(() => {

        let newDate = new Date();

        if (this.today !== newDate.getDate()) {

          ipcRenderer.send('checkUpdates');

          // set the current start time to now
          this.startTime = moment().milliseconds(0);

          // set the current end time to now too.
          this.endTime = moment().milliseconds(0);

          this.totalIimeToday = this.getCurrentTime() + this.totalIimeTodayCached;
          this.currentSession = this.getCurrentTime() + this.currentSessionCached;
          ipcRenderer.send("time:travel", this.totalIimeToday);

          this.totalIimeTodayCached = 0;

          this.today = newDate.getDate();

          // if there is no active project, then do not refresh this workspace.
          // that's if the user is not tracking time.
          // when there is no time tracking, then reset the timer.
          if (this.isIdle) {
            this.isIdle = false;
            document.getElementById("idle-butto").click();
          }

          // reset the timers if there is currently no project tracking.
          if(!this.activeProject.id) {
            this.cleanWorkSpace();
          }
        }
      }, 10000);
    }

    fshowNotification(){
      ipcRenderer.send("show:notification");
    }
    
    appRestart(){
      ipcRenderer.send("restart", {restart: true});
    }

    /*
     * refresh the last sync and everything
     */
    refreshWorkSpace() {
      if(this.refresherTimeout){
        this.lastSynced = 'refresh';
        ipcRenderer.send("resetTimer");
        this._refreshTimeoutTimer(); 
      }
    }

    _refreshTimeoutTimer(){
      this.refresherTimeout = false;
      setTimeout(() => {
        this.refresherTimeout = true;
      }, CONSTANTS.REFRESH_BUTTON_TIMEOUT);
    }

    _refresher() {

      // Load in the workspaces
      this.getWorkspaces().subscribe(response => {

        if (this.activeWorkspace) {

          this.getProjects().subscribe((response: any) => {

            let oldActive = JSON.parse(JSON.stringify(this.activeProject));

            let newActive = response.filter((item: any) => item.id === oldActive.id)[0];

            if(newActive) {
              this.activeProject = newActive;
            } else if(oldActive.id) {
              this.trackProject(oldActive);
            }

            let projects = response.filter((item: any) => !item.archived);

            if(!projects.find( (prj: any): boolean => { return prj.title === "(No project)" }) ) {
              projects.push({
                archived: false,
                description: "(No desription)",
                id: '0',
                title: "(No project)",
                timeTracked: 0,
                workspaceId: this.activeWorkspace.id
              });
            }

            ipcRenderer.send('projects', projects);

            if (!this.startTime) {
              let tempTimeToday = 0, perProject = {};

              this.projects.forEach((element: any) => {
                perProject[element.id] = element.timeTracked ? Math.abs(element.timeTracked) : 0;
                this.perProjectCached[element.id] = element.timeTracked ? Math.abs(element.timeTracked) : 0;
                tempTimeToday += element.timeTracked ? Math.round(Math.abs(element.timeTracked)) : 0;
                ipcRenderer.send("time:travel", this.totalIimeToday);
              });

              this.totalIimeTodayCached = this.totalIimeToday = tempTimeToday;
              
              this.perProject = perProject;

              this.projects = projects;

              this.resize = true;
            }



            this.lastSynced = Date.now();

          }, error => {
            console.log("error getting projects");
            this.lastSynced = 'error';
          });
        }
      }, error => {
          console.log("error getting workspaces");
          this.lastSynced = 'error';
      });
    }

    /**
     * Get all projects
     * TODO: Move to a service
     */
    getProjects() {
        const uath = this._getUserAuth();
        let today = new Date(),
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
          endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const req = `${this.baseURL}/workspaces/${this.activeWorkspace.id}/projects?dateFrom=${startDate}&dateTo=${endDate}&access_token=${uath.authToken}`;
        return this.http.get(req);
    }

    /**
    *
    * @returns {Observable<Object>}
    */
    cleanWorkSpace() {
      this.getProjects().subscribe((response: any) => {
        let projects = response.filter((project: any) => !project.archived),
          perProject = {},
          totalTime = 0;

        projects.push({
        archived: false,
        description: "(No desription)",
        id: '0',
        title: "(No project)",
        workspaceId: this.activeWorkspace.id,
        timeTracked: 0
      });

        projects.forEach((project: any) => {
        perProject[project.id] = Math.abs(project.timeTracked);
        this.perProjectCached[project.id] = Math.abs(project.timeTracked);
        totalTime += Math.abs(project.timeTracked);
      });

        this.totalIimeToday = totalTime;
        this.totalIimeTodayCached = totalTime;
        this.perProject = perProject;
        this.projects = projects;
        ipcRenderer.send("time:travel", totalTime);

        this.lastSynced = Date.now()
      }, (err: any) => {
        let projects = JSON.parse(JSON.stringify(this.projects)),
          perProject = {},
          totalTime = 0;

        projects.forEach((project: any) => {
          perProject[project.id] = 0;
          this.perProjectCached[project.id] = 0;
          totalTime += 0;
        });

        this.totalIimeToday = totalTime;
        this.totalIimeTodayCached = totalTime;
        this.perProject = perProject;
        this.projects = projects;
        ipcRenderer.send("time:travel", totalTime);

        this.lastSynced = Date.now()
      })
    }

    /**
     * Get all workspaces
     * TODO: Move to a service
     */
    getWorkspaces() {
        const uath = this._getUserAuth();
        return this.http.get(`${this.baseURL}/users/${uath.userId}/workspaces?access_token=${uath.authToken}`);
    }

    /*
    * Get the currently logged in user.
    * */
    getUser() {
        const options = { params: new HttpParams().set('filter', '{"include": "people"}') };
        const uath = this._getUserAuth();
        return this.http.get(`${this.baseURL}/users/${uath.userId}?access_token=${uath.authToken}`, options)
    }

    /**
     * Change workspace from dropdown toggle.
     * @param workspace
     */
    changeWorkspace(workspace: any) {
        this.activeWorkspace = workspace;
        this.getProjects().subscribe(response => {
            this.projects = response;
        }, error => {
            alert("There was an error changing the workspace!")
        });
    }

    /**
     * generate the initials of the workspace owner
     * */
    generateInitials() {
        let name = this.user ? this.user.name : null;
        if (!name) {
            return false;
        }

        return name.replace(/\W*(\w)\w*/g, '$1').toUpperCase().substring(0, 2);
    }

    /**
     * Log user out of the application
     */
    logOut() {
      if (this.activeProject.id) {
        this.trackProject(this.activeProject)
      }

      // reset active workspace and log out the
      this.activeWorkspace = undefined;
      this.userService.logout();
    }

    openPrefs() {
      ipcRenderer.send('openPref');
    }

    /**
     * Open dashboard
     */
    openDashboard() {
        ipcRenderer.send("open:link", "https://trackly.com/app/dashboard");
    }

    /**
     * Load initial projects
     */
    ngOnInit() {

        // Load in the workspaces
        this.getWorkspaces().subscribe(response => {
            this.workspaces = response;
            if (!this.activeWorkspace) {
              this.activeWorkspace = this.workspaces[0];
            }

            this.getUser().subscribe(response => {
              this.user = response;
              if (!this.user.people[0].timeTracking) {
                ipcRenderer.send('win:height', this.baseFrameHeight + 120);
              } else {

              }
            }, error => {
              this.logOut();
            });

            this.getProjects().subscribe((response: any) => {

                this.projects = response.filter((item: any) => !item.archived);

                ipcRenderer.send('projects', this.projects);

                // Empty response
                if (!this.projects.length) {
                    this.projects = [];
                }

                if(!this.projects.find( (prj: any): boolean => { return prj.title === "(No project)" }) ) {
                  this.projects.push({
                    archived: false,
                    description: "(No desription)",
                    id: '0',
                    title: "(No project)",
                    workspaceId: this.activeWorkspace.id
                  });

                }

                // when the user is enabled to track time, resize to the size of the window content.
                if (this.user.people[0].timeTracking) {
                  this._resizeFrame();
                }

                this.projects.forEach((element: any) => {
                    this.perProject[element.id] = element.timeTracked ? Math.abs(element.timeTracked) : 0;
                    this.perProjectCached[element.id] = this.perProject[element.id];
                    this.totalIimeToday += element.timeTracked ? Math.round(Math.abs(element.timeTracked)) : 0;
                    this.totalIimeTodayCached = this.totalIimeToday;
                    ipcRenderer.send("time:travel", this.totalIimeToday);
                });

                // keep track of the next day and get new projects
                this.trackNextDay();

                // display notification every hour
                this.trackingOffNotifyer();

            }, error => {
                this.logOut();
            });

        }, error => {
            this.logOut();
        });
    }

    ngAfterViewChecked() {
      if (this.resize) {
        try {
          // when the user is enabled to track time, resize to the size of the window content.
          this._resizeFrame();
          this.resize = false;
        } catch (err) {
          console.log('child problems');
        }
      }
      let el = document.getElementById('projects');
      if (el && this.projects.length > 5) {
        el.style.overflowY = 'scroll';
      } else if(el) {
        el.style.overflowY = 'auto';
      }
    }
}
