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
  hidden: boolean = false;

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
      document.getElementById('selector').innerHTML = projects.map((proj: any) => {
        if (proj.title == this.projectName) {
          return `<option value='${proj.title}' selected>${proj.title}</option>`
        }
        return `<option value='${proj.title}'>${proj.title}</option>`;
      }).join('')
    });
  }

  stopClick(check: any) {
    ipcRenderer.send("idleResponse", {checked: check, action: 'stop'});
  }

  continueClick(check: any) {
    ipcRenderer.send("idleResponse", {checked: check, action: 'continue'});
  }

  reassignClick() {
    this.hidden = !this.hidden;
  }

  cancelClick() {
    // toggle the hidden value to hide and display.
    this.hidden = !this.hidden;
  }

  assignClick(value: string) {
    ipcRenderer.send("idleResponse", {value: value, action: 'assign'});
  }

  ngOnInit(): void {

  }
}