import { Component, ViewEncapsulation } from "@angular/core";
import { ipcRenderer, remote } from "electron";

import "./styles.scss";

@Component({
  selector: "#app",
  templateUrl: "./app.component.html",
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  appVersion = remote.app.getVersion();
}
