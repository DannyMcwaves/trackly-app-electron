// tslint:disable-next-line:no-var-requires
const Store = require("electron-store");

import {Component, ViewEncapsulation, NgZone} from "@angular/core";
import {ipcRenderer} from "electron";

import "./dashboard.component.scss";
import {UserService} from "../services/user.service";
import {OnInit} from "@angular/core/src/metadata/lifecycle_hooks";
import {Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";

@Component({
    selector: "#app",
    templateUrl: "/dashboard.component.html",
    encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {
    public projects: any;
    public perProject = {};
    public currentSession = 0;
    public activeProject: any;
    public user: any;
    
    private workspaces: any;
    private activeWorkspace: any;
    private lastSynced: number;
    private store: any;

    // Frame height & Sizes
    private baseFrameHeight = 36 + 120;
    private baseProjectHeight = 60;
    private baseBlankHeight = 120;
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
        ipcRenderer.on("timer:tick", (event: any, data: any) => {
            this.zone.run(() => {
                this.perProject[this.activeProject.id] += 1;
                this.currentSession += 1;
            });
        });

        // Subscribe to sync update
        ipcRenderer.on("sync:update", (event: any, data: any) => {
            this.zone.run(() => {
                this.lastSynced = data;
            });
        });
    }

    /**
     *  Resize application frame to an appropriate height.
     */
    private _resizeFrame() {
        let height: number;

        if (this.projects.length) {
            height = this.baseFrameHeight + this.baseProjectHeight*this.projects.length;
        } else {
            height = this.baseFrameHeight + 120;
        }
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

    trackProject(project: any) {
        // Clicked on running project
        if (project == this.activeProject) {
            console.log('same');
            ipcRenderer.send("timer", {action: "stop"});
            this.activeProject = null;
            return;
        }

        // Clicked on new project
        if (project != this.activeProject) {
            console.log('new');
            this.activeProject = project;
            ipcRenderer.send("timer",
                {
                    action: "start",
                    projectId: project.id,
                    workspaceId: this.activeWorkspace.id,
                    userId: this._getUserAuth().userId
                }
            );
        }
    }

    /**
     * Get all projects
     * TODO: Move to a service
     */
    getProjects() {
        const uath = this._getUserAuth();
        const req = `https://trackly.com/api/workspaces/${this.activeWorkspace.id}/projects?access_token=${uath.authToken}`;
        return this.http.get(req);
    }

    /**
     * Get all workspaces
     * TODO: Move to a service
     */
    getWorkspaces() {
        const uath = this._getUserAuth();
        return this.http.get(`https://trackly.com/api/users/${uath.userId}/workspaces?access_token=${uath.authToken}`);
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
     * Log user out of the application
     */
    logOut() {
        this.store.delete('userId');
        this.store.delete('token');
        this.router.navigate(['login']);
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

            this.getProjects().subscribe(response => {
                this.projects = response;
                this._resizeFrame();
                this.projects.forEach((element: any) => {
                    this.perProject[element.id] = 0;
                });
            });
        });
    }
}
