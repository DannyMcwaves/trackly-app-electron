import {ipcRenderer} from "electron";

import { Component, ViewEncapsulation, OnInit } from "@angular/core";
import "./dialog.component.scss";


@Component({
  selector: "#app",
  templateUrl: "/dialog.component.html",
  encapsulation: ViewEncapsulation.None
})


export class DialogComponent implements OnInit {

  minutes: number = 0;
  projectName: string = 'Current Active Project';
  allProjects: any;

  constructor() {
    // the number of minutes user was idle.
    ipcRenderer.on('idletime', (event: any, time: number) => {
      this.minutes = time;
      document.getElementById('minutes').innerText = time.toString();
    });

    // set the name of the current project
    ipcRenderer.on('currentProject', (event: any, title: string) => {
      this.projectName = title;
      document.getElementById('name').innerText = title;
    });

    // projects
    ipcRenderer.on('projects', (event: any, projects: any) => {
      this.allProjects = projects;
    });
  }

  stopClick(check: any) {
    ipcRenderer.send("idleResponse", {checked: check, action: 'stop'});
  }

  continueClick(check: any) {
    ipcRenderer.send("idleResponse", {checked: check, action: 'continue'});
  }

  reassignClick() {
    console.log('reassigned');
  }

  ngOnInit(): void {

  }
}