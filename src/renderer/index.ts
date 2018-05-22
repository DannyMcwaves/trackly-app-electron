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

// main

import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { enableProdMode } from "@angular/core";
import { AppModule } from "./app/app.module";

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
    if (confirm("You're currently tracking time, are you sure you want to quit?")) {
      window['timeIsRunning'] = false;
      console.log('this is real');
      window.close();
    } else {
      console.log('false value is returned');
      event.returnValue = false;
    }
  }
};
