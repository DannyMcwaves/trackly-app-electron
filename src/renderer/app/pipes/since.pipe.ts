// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'sincePipeline'})
export class sincePipeline implements PipeTransform {
  transform(value: number) {
    console.log('val: ' + value);

    if (!value) { return "Hasn't been synced yet"}
    return moment(value).fromNow();
  }
}