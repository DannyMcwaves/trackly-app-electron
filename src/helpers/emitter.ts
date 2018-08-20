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

  static mainWindow: any = null;

  static appendActivity(userActive: boolean, duration: number) {
    this.appState.activities.push({userActive, duration})
  }

  static extendEvent(eventsArray: [{}]) {
    this.appState.events.push(...eventsArray);
  }

  static appendEvent(event: any, timestamp: any, payload: any) {
    this.appState.events.push({type: event, payload, timestamp});
  }

  static ignoreIdle(stopEvent: any) {
    let filtered = this.appState.events.filter((event: any) => event.type !== 'stopLogging');
    filtered.push(stopEvent);
    this.appState.events = filtered;
  }

  static resetAppState() {
    this.appState = {activities: [], events: []}
  }

}
