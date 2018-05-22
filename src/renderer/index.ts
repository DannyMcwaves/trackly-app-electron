// Polyfills
import "core-js/es7/reflect";
require("zone.js/dist/zone");

// Vendor
import "@angular/platform-browser";
import "@angular/platform-browser-dynamic";
import "@angular/core";
import "@angular/common";
import "@angular/http";
import "@angular/router";
import "rxjs";
import * as moment from "moment";

// main

import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { enableProdMode } from "@angular/core";
import { AppModule } from "./app/app.module";
import { remote, ipcRenderer } from 'electron';

if(process.env.NODE_ENV === "production") {
    enableProdMode();
}

// add base element for Angular Router support
const base = document.createElement('base');
window['timeIsRunning'] = false;

// this is './' not '/' because electron uses file:// URLs
base.href = './';
document.head.appendChild(base);

platformBrowserDynamic().bootstrapModule(AppModule);


window.onbeforeunload = (event: any) => {
  if (window['timeIsRunning']) {

    event.returnValue = false;

    if (confirm("You're currently tracking time, are you sure you want to quit?")) {

      ipcRenderer.send("timer", {
        action: "stop",
        date: moment().milliseconds(0).toISOString()
      });

      window['timeIsRunning'] = false;
      event.returnValue = true;

      // let win = remote.getCurrentWindow();
      window.close();
    }
  }
};
