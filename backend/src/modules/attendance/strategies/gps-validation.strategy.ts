import { Injectable } from '@nestjs/common';

@Injectable()
export class GpsValidationStrategy {
  validate(latitude: number, longitude: number, geofence: any): boolean {
    // TODO: Implement GPS validation
    return true;
  }
}
