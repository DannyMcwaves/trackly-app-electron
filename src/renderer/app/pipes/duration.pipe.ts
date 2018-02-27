// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'timeDuration'})
export class TimeDurationPipe implements PipeTransform {
  transform(value: number) {
    if (value == 0) {
      return "0:00"
    }

    return moment.duration(value, "seconds").format();
  }
}