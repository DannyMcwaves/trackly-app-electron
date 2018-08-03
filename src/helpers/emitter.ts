/*
* this is a simple module for saving global states and accessing changed variables
* throughout the script.
* */


export class Emitter {

  public static appState: any = {activities: [], events: []};

  static currentProject: string = "";

  static currentTime: string = "";

  static lastSynced: any = "";

  static currentProjectId: any = "";

  static appendActivity(userActive: boolean, duration: number) {
    this.appState.activities.push({userActive, duration})
  }

  static appendEvent(event: any, timestamp: any, payload: any) {
    this.appState.events.push({type: event, payload, timestamp});
  }

  static resetAppState() {
    this.appState = {activities: [], events: []}
  }

}
