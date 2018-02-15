import {Component, ViewEncapsulation} from "@angular/core";
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
    private activeWorkspace = {title: 'Choose a workspace', id: 0};
    private activeProject: Object;
    private currentSession = 0;
    private lastSynced: any;

    /**
     * Dashboard component constructor with added protection
     * for anonymous access.
     * @param {UserService} userService
     * @param {Router} router
     * @param {HttpClient} http
     */
    constructor(private userService: UserService, private router: Router, private http: HttpClient) {
        if (!localStorage.getItem("token")) {
            this.router.navigate(["login"]);
        }

        // Subscribe to main timer
        ipcRenderer.on("timer:tick", (event: any, data: any) => {
            // Increase current session
            this.incrementCurrentSession(); // TODO: Fix a bug, isn't reflecting in a view

            console.log('tick');
        });
    }

    /**
     * Get logged in user ID and Token
     * @returns {{userId: string | null; authToken: string | null}}
     * @private
     */
    static _getUserAuth() {
        const authToken = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        return {
            userId: userId,
            authToken: authToken
        }
    }

    startTimer(project: any) {
        this.activeProject = project;
        // console.log('project started');
        ipcRenderer.send("timer", {action: "start"});
    }

    getProjects() {
        const uath = DashboardComponent._getUserAuth();
        const req = `https://trackly.com/api/workspaces/${this.activeWorkspace.id}/projects?access_token=${uath.authToken}`;
        return this.http.get(req);
    }

    getWorkspaces() {
        const uath = DashboardComponent._getUserAuth();
        return this.http.get(`https://trackly.com/api/users/${uath.userId}/workspaces?access_token=${uath.authToken}`);
    }

    changeWorkspace(workspace: any) {
        this.activeWorkspace = workspace;
        this.getProjects().subscribe(response => {
            this.projects = response;
        });
    }

    incrementCurrentSession() {
        this.currentSession++;
    }

    uploadActivities() {
        console.log('upload');
        ipcRenderer.send('upload', {action: 'start'});
    };

    ngOnInit() {
        // Load in the workspaces
        this.getWorkspaces().subscribe(response => {
            this.workspaces = response;
            if (!this.activeWorkspace) {
                this.activeWorkspace = this.workspaces[0];
            }
        });
    }
}
