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
    private user: any;
    private projects: any;
    private workspaces: any;
    private activeWorkspace: any;
    private activeProject: Object;
    public currentSession = 0;
    private lastSynced: any;

    private store: any;

    // Frame height & Sizes
    private baseFrameHeight = 178;
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

        // Subscribe to main timer
        ipcRenderer.on("timer:tick", (event: any, data: any) => {
            this.zone.run(() => this.currentSession = this.currentSession +1);
            console.log(this.currentSession);
        });
    }

    /**
     *  Resize application frame to an appropriate height.
     */
    private _resizeFrame() {
        const height = this.baseFrameHeight + this.baseProjectHeight*this.projects.length;
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

    startTimer(project: any) {
        if (project == this.activeProject) {
            ipcRenderer.send("timer", {action: "stop"});
        } else {
            this.activeProject = project;
            ipcRenderer.send("timer",
                {
                    action: "start",
                    projectId: project.id,
                    user: this._getUserAuth().userId
                }
            );
        }

    }

    stopTimer(project: any) {
        alert("stopping timer");
        ipcRenderer.send("timer", {action: "stop"});
    }

    getProjects() {
        const uath = this._getUserAuth();
        const req = `https://trackly.com/api/workspaces/${this.activeWorkspace.id}/projects?access_token=${uath.authToken}`;
        return this.http.get(req);
    }

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

    /**
     * Log user out of the application
     */
    logOut() {
        this.router.navigate(['']);
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
                this._resizeFrame(); // Resize frame after projects have been loaded.
            });
        });
    }
}
