/*
* this is a simple module for saving global states and accessing changed variables
* throughout the script.
* */

import * as moment from "moment";


export class Emitter {

  public static uploadStatus: boolean = true;

  public static tempAppState: any = {};

  public static appState: any = {activities: [], events: []};

  static appendActivity(userActive: boolean, duration: number) {
    this.appState.activities.push({userActive, duration})
  }

  static appendEvent(event: any, timestamp: any, payload: any) {
    this.appState.events.push({type: event, payload, timestamp});
  }

}
