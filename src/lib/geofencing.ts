/**
 * Haversine formula — calculates great-circle distance between two points.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks whether the student is within the allowed radius of the classroom.
 * Default radius: 50 meters.
 */
export function isWithinRadius(
  studentLat: number,
  studentLng: number,
  classroomLat: number,
  classroomLng: number,
  radiusMeters: number = 50
): boolean {
  const distance = haversineDistance(
    studentLat,
    studentLng,
    classroomLat,
    classroomLng
  );
  return distance <= radiusMeters;
}

export const CHECKIN_RADIUS_METERS = 50;
