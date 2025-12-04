import { Injectable } from '@nestjs/common';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface GeofenceConfig {
  locations: Array<{
    latitude: number;
    longitude: number;
    radius: number; // meters
    name?: string;
  }>;
}

@Injectable()
export class GpsValidationStrategy {
  validate(latitude: number, longitude: number, geofence: any): boolean {
    if (!geofence || !geofence.locations || !Array.isArray(geofence.locations)) {
      return true;
    }

    const config = geofence as GeofenceConfig;
    const userLocation: GeoPoint = { latitude, longitude };

    for (const location of config.locations) {
      const distance = this.calculateDistance(userLocation, location);
      if (distance <= location.radius) {
        return true;
      }
    }

    return false;
  }

  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (point1.latitude * Math.PI) / 180;
    const phi2 = (point2.latitude * Math.PI) / 180;
    const deltaPhi = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLambda = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
