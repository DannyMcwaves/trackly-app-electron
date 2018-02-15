import {Component, ViewEncapsulation} from "@angular/core";
import {ipcRenderer} from "electron";

import "./projects.component.scss";
import {OnInit} from "@angular/core/src/metadata/lifecycle_hooks";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

@Component({
    selector: 'c-projects',
    templateUrl: '/projects.component.html',
    encapsulation: ViewEncapsulation.None
})
export class ProjectsComponent {
    // Some code
}
