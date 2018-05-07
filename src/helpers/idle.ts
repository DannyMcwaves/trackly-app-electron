
import * as threads from 'threads';
import * as desktopIdle from 'desktop-idle';
import {Fscs} from './fscs';

export class Idler {

  private _totalIdleTime:number = 0;

  constructor(private fscs: Fscs) {}

  private idleTime() {
    return desktopIdle.getIdleTime();
  }

  public get idle() {
    this._totalIdleTime += this.idleTime();
    return this._totalIdleTime;
  }

  public logTick(tick:any) {
    // console.log(tick);
    console.log(this.idleTime());
  }

}

//
// const spawn = threads.spawn;
//
// const thread = spawn(function (input:any, done: any) {
//   console.log(input);
//   return done({idleTime: input()})
// });
//
// export default function() {
//   return new Promise((resolve, reject) => {
//     thread
//       .send({string: '123'})
//       .on('message', (res:any) => {
//         resolve(res)
//       })
//       .on('error', (err:any) => {
//         reject(err)
//       })
//       .on('exit', () => {
//         // terminated.
//       })
//   });
//
// }
//
// console.log(desktopIdle);
