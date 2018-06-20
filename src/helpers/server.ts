import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment';
import { Emitter} from "./emitter";
import {createServer} from 'net';

const app = express();
let index = 0;

const portAvailable = (port: any) => new Promise((resolve, reject) => {
  const tester: any = createServer();
  tester.on('error', (err: any) => {
      index += 1;
      if(index > port.length - 1) {
        resolve(false);
      } else if(err['code'] === 'EADDRINUSE') {
        tester.listen(port[index]);
      } else {
        reject(err);
      }
    })
    .once('listening', () => tester.once('close', () => resolve(port[index])).close())
    .listen(port[index])
});


// avoid cases of CORS
app.use(function(req: any, res: any, next: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('*', (req: any, res: any) => {
  res.send({message: "Trackly"});
});

app.post('*', (req: any, res: any) => {
  console.log(req.body);
  Emitter.appendEvent("URLLoaded", moment().milliseconds(0).toISOString(), req.body);
  res.send({message: "Trackly", status: "message received"});
});

export { app, portAvailable };