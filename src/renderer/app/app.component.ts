import {Component, ViewEncapsulation} from "@angular/core";
import {ipcRenderer} from "electron";

import "./styles.scss";

@Component({
    selector: '#app',
    templateUrl: './app.component.html',
    encapsulation: ViewEncapsulation.None
})
export class AppComponent {

    myFunc() {
        ipcRenderer.send("auth", {
            token: "test",
        });
    }

}
