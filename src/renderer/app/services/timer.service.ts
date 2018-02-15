import { Injectable } from "@angular/core";

interface IProjectTimer {
    id: string,
    elapsed: number,
}

@Injectable()
export class TimerService {
  private timer = {
      "master": 0,
      "session": 0,
      "perProject": <IProjectTimer[]> [],
  }

  // Codebase for working with timers
}
