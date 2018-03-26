// tslint:disable-next-line:no-var-requires
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

import { Pipe, PipeTransform } from '@angular/core';


@Pipe({name: 'sincePipeline'})
export class sincePipeline implements PipeTransform {
  transform(value: number) {
    if (!value) { return 'Never synced'}
    return moment(value).fromNow();
  }
}