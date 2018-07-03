// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'sincePipeline'})
export class sincePipeline implements PipeTransform {
  transform(value: any) {
    if (!value) { return 'Tracking not synced'}
    if (value === 'refresh') {return 'Refreshing...'}
    if (value === 'error') {return 'Refresh failed, please retry'}
    return "Updated — " + moment(value).format('DD. MMM YYYY [at] HH:mm');
  }
}