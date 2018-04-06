import { Observable, Subject } from "rxjs/Rx";
import * as logger from "electron-log";

export class Timer {
  public ticker: Observable<any>;
  private interval: number;
  private end: Subject<any>;

  constructor() {
    this.end = new Subject();
    this.interval = 1000; // Miliseconds
    this.ticker = Observable.interval(this.interval)
      .takeUntil(this.end)
      .timeInterval();
  }

  /**
   * Unsubscribe all observers from the subject.
   */
  complete() {
    this.end.next();
    logger.log(`Timer stopped at ${Date.now()}`);
  }
}
