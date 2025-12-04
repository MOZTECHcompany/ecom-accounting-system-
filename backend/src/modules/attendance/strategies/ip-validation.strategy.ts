import { Injectable } from '@nestjs/common';

@Injectable()
export class IpValidationStrategy {
  validate(ip: string, allowList: any): boolean {
    // TODO: Implement IP validation
    return true;
  }
}
