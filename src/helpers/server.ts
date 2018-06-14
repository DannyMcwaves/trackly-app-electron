import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment';
import { Emitter} from "./emitter";

const app = express();

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

export default app;