import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class BoundedIdentifierPipe implements PipeTransform<unknown, string> {
  transform(value: unknown) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value)) {
      throw new BadRequestException('Invalid identifier.');
    }
    return value;
  }
}
