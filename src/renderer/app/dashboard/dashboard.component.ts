// tslint:disable-next-line:no-var-requires
const Store = require("electron-store");

import {Component, ViewEncapsulation, NgZone} from "@angular/core";
import {ipcRenderer} from "electron";

import "./dashboard.component.scss";
import {UserService} from "../services/user.service";
import {OnInit} from "@angular/core/src/metadata/lifecycle_hooks";
import {Router} from "@angular/router";
import {HttpClient, HttpParams} from "@angular/common/http";

import * as moment from "moment";

@Component({
    selector: "#app",
    templateUrl: "/dashboard.component.html",
    encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {
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

    private workspaces: any;
    private activeWorkspace: any;
    private lastSynced: number;
    private store: any;

    // Frame height & Sizes
    private baseFrameHeight = 36 + 120;
    private baseProjectHeight = 60;
    private maxProjectsLength = 5;

    /**
     * Dashboard component constructor with added protection
     * for anonymous access.
     * @param {UserService} userService
     * @param {Router} router
     * @param {HttpClient} http
     */
    constructor(private userService: UserService, private router: Router,
                private http: HttpClient, public zone: NgZone) {

        this.store = new Store();

        if (!this.store.has('token') && !this.store.has('userId')) {
            this.router.navigate(['login']);
        }

        // Subscribe to main timer
        ipcRenderer.on("timer:tick", (event: any, projectId: string) => {
            this.endTime = moment().milliseconds(0);
            this.zone.run(() => {

                this.perProject[projectId] = this.getCurrentTime() + this.perProjectCached[projectId];
                this.totalIimeToday = this.getCurrentTime() + this.totalIimeTodayCached;
                this.currentSession = this.getCurrentTime() + this.currentSessionCached;
            });
        });

        // Subscribe to sync update
        ipcRenderer.on("sync:update", (event: any, data: any) => {
            this.zone.run(() => {
                this.lastSynced = data;
            });
        });

        ipcRenderer.on("timer:click", (event: any, id: string) => {
          // so the trick is to get the id of the element and then click on it.
          document.getElementById(id).click();
        });

        ipcRenderer.on("timer:stop", (event: any) => {
          // so the trick is to get the id of the element and then click on it.
          if (this.activeProject.id) {
            document.getElementById(this.activeProject.id).click();
          }
        });
    }

    /**
     *  Resize application frame to an appropriate height.
     */
    private _resizeFrame() {
        let height: number;
        height = this.baseFrameHeight + this.baseProjectHeight*this.projects.length;
        ipcRenderer.send('win:height', height);
    }

    /**
     * Get logged in user ID and Token
     * @returns {{userId: string | null; authToken: string | null}}
     * @private
     */
    _getUserAuth() {
        const authToken = this.store.get("token");
        const userId = this.store.get("userId");

        return {
            userId: userId,
            authToken: authToken
        }
    }

    // Count time
    getCurrentTime() {
        let time = 0;
        time = this.endTime.diff(this.startTime);
        return Math.round(time / 1000);
    }

    trackProject(project: any) {
        // Check if time tracking is enabled for a user
        if (this.user && this.user.people[0].timeTracking) {
            // Clicked on running project
            if (project == this.activeProject) {
                console.log('same');
                ipcRenderer.send("timer", {
                    action: "stop",
                    date: this.endTime.toISOString()
                });
                ipcRenderer.send("isrunning", false);
                this.currentSessionCached = this.currentSession;
                this.totalIimeTodayCached = this.totalIimeToday;
                this.perProjectCached[project.id] = this.perProject[project.id];
                this.startTime = null;
                this.endTime = null;
                this.activeProject = {};
                window['timeIsRunning'] = false;
                return;
            }

            // Clicked on new project
            if (project != this.activeProject) {
                console.log('new');
                this.startTime =  moment().milliseconds(0);
                ipcRenderer.send("timer", {
                    action: "stop",
                    date: this.endTime ? this.endTime.toISOString() : moment().milliseconds(0).toISOString()
                });
                ipcRenderer.send("isrunning", false);
                this.currentSessionCached = this.currentSession;
                this.totalIimeTodayCached = this.totalIimeToday;
                this.perProjectCached[this.activeProject.id] = this.perProject[this.activeProject.id] || 0;
                this.activeProject = project;
                ipcRenderer.send("timer", {
                  action: "start",
                  projectId: project.id,
                  workspaceId: this.activeWorkspace.id,
                  userId: this._getUserAuth().userId,
                  timestamp: Date.now(),
                  date: this.startTime.toISOString()
                });
                ipcRenderer.send("isrunning", true);
                window['timeIsRunning'] = true;
            }
        } else {
            alert('Time tracking is not enabled.');
        }

    }

    /**
     * Get all projects
     * TODO: Move to a service
     */
    getProjects() {
        const uath = this._getUserAuth();
        const req = `${this.baseURL}/workspaces/${this.activeWorkspace.id}/projects?access_token=${uath.authToken}`;
        return this.http.get(req);
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

    incrementCurrentSession() {
        this.currentSession++;
    }

    addProject() {
        ipcRenderer.send("open:link", "https://trackly.com/app/projects");
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
        ipcRenderer.send("timer", {action: "stop"});
        this.userService.logout();
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
                    this.projects.push({
                        archived: false,
                        description: "(No desription)",
                        id: '0',
                        title: "(No project)",
                        workspaceId: this.activeWorkspace.id
                    });
                }

                if (this.user.people[0].timeTracking) {
                  this._resizeFrame();
                }
                this.projects.forEach((element: any) => {
                    this.perProject[element.id] = element.timeTracked ? element.timeTracked : 0;
                    this.perProjectCached[element.id] = this.perProject[element.id];
                    this.totalIimeToday += element.timeTracked ? Math.round(element.timeTracked) : 0;
                    this.totalIimeTodayCached = this.totalIimeToday;
                });
            }, error => {
                this.logOut();
            });

        }, error => {
            this.logOut();
        });
    }
}
