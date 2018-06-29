// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'sincePipeline'})
export class sincePipeline implements PipeTransform {
  transform(value: number) {
    if (!value) { return 'Tracking not synced'}
    if (value === -1) {return 'Refreshing...'}
    return "Updated -- " + moment(value).format('DD. MMM YYYY [at] HH:mm');
  }
}