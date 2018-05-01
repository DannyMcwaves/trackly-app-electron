// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'timeDuration'})
export class TimeDurationPipe implements PipeTransform {
  transform(value: number) {
    if (!value) { return "0:00"}
    return moment.duration(Math.floor(value), "seconds").format();
  }
}