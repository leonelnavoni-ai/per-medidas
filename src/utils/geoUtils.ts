import { JudicialMeasure } from '../types';

export interface GeoLocation {
  lat: number;
  lng: number;
}

// Paraná, Entre Ríos default center (Jefatura Departamental Paraná / Plaza 1° de Mayo)
export const DEFAULT_PER_CENTER: GeoLocation = {
  lat: -31.7329,
  lng: -60.5289,
};

// Realistic reference addresses in Entre Ríos (Paraná, Victoria, Concordia, etc.)
export const DEFAULT_ADDRESSES_ENTRE_RIOS = [
  { direccion: 'San Martín 450, Centro', ciudad: 'Paraná', lat: -31.7315, lng: -60.5312 },
  { direccion: 'Av. Ramírez 1540', ciudad: 'Paraná', lat: -31.7410, lng: -60.5180 },
  { direccion: 'Calle Urquiza 780', ciudad: 'Paraná', lat: -31.7340, lng: -60.5260 },
  { direccion: 'Barrio Paraná I, Mza 3 Casa 12', ciudad: 'Paraná', lat: -31.7580, lng: -60.5050 },
  { direccion: 'Calle 25 de Mayo 180', ciudad: 'Paraná', lat: -31.7325, lng: -60.5270 },
  { direccion: 'Av. de las Américas 2400', ciudad: 'Paraná', lat: -31.7690, lng: -60.5240 },
  { direccion: 'Calle Gualeguaychú 320', ciudad: 'Paraná', lat: -31.7360, lng: -60.5210 },
  { direccion: 'Av. Almafuerte 1200', ciudad: 'Paraná', lat: -31.7430, lng: -60.4990 },
  { direccion: 'Barrio Anacleto Medina Sur, Calle 1324', ciudad: 'Paraná', lat: -31.7510, lng: -60.5560 },
  { direccion: 'Costanera Baja y Acuerdo de San Nicolás', ciudad: 'Paraná', lat: -31.7210, lng: -60.5340 },
  { direccion: 'Calle Larramendi 1850, Bajada Grande', ciudad: 'Paraná', lat: -31.7180, lng: -60.5650 },
  { direccion: 'Bv. Eva Perón y Corrientes', ciudad: 'Victoria', lat: -32.6180, lng: -60.1560 },
  { direccion: 'Av. Mitre 540', ciudad: 'Concordia', lat: -31.3930, lng: -58.0190 },
  { direccion: 'Calle 25 de Mayo y Urquiza', ciudad: 'Gualeguaychú', lat: -33.0090, lng: -58.5170 },
];

/**
 * Calculates Haversine distance in kilometers between two GPS points
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in readable string (meters if < 1km, km otherwise)
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimates arrival time in minutes given distance in km
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: 'patrol' | 'walking' = 'patrol'
): { minutes: number; text: string } {
  // Patrol / car avg city speed: 28 km/h + 1 min traffic factor
  // Walking avg speed: 4.8 km/h
  const speed = mode === 'patrol' ? 28 : 4.8;
  const rawMinutes = Math.max(1, Math.round((distanceKm / speed) * 60));

  if (rawMinutes < 60) {
    return { minutes: rawMinutes, text: `${rawMinutes} min` };
  }
  const hours = Math.floor(rawMinutes / 60);
  const mins = rawMinutes % 60;
  return { minutes: rawMinutes, text: `${hours}h ${mins}m` };
}

/**
 * Generates turn-by-turn navigation URL for Google Maps
 */
export function getGoogleMapsDirUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): string {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}&travelmode=driving`;
  if (typeof originLat === 'number' && typeof originLng === 'number') {
    url += `&origin=${originLat},${originLng}`;
  }
  return url;
}

/**
 * Generates Google Maps search / place URL
 */
export function getGoogleMapsPlaceUrl(lat: number, lng: number, label?: string): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label + ' ' + lat + ',' + lng)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Ensures a measure has coordinates and address assigned (deterministic based on measure id/name)
 */
export function resolveMeasureLocation(measure: JudicialMeasure): {
  direccion: string;
  ciudad: string;
  lat: number;
  lng: number;
  radioMetros: number;
} {
  if (measure.latVictima && measure.lngVictima && measure.domicilioVictima) {
    return {
      direccion: measure.domicilioVictima,
      ciudad: measure.ciudadVictima || 'Paraná',
      lat: measure.latVictima,
      lng: measure.lngVictima,
      radioMetros: measure.radioExclusionMetros || 200,
    };
  }

  // Derive pseudo-deterministic coordinates around Paraná if not explicitly set
  const hash = (measure.id + measure.victima).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fallbackIndex = hash % DEFAULT_ADDRESSES_ENTRE_RIOS.length;
  const template = DEFAULT_ADDRESSES_ENTRE_RIOS[fallbackIndex];

  // Slight jitter to prevent overlapping pins if multiple items pick the same template
  const jitterLat = ((hash % 17) - 8) * 0.0018;
  const jitterLng = (((hash * 3) % 19) - 9) * 0.0018;

  return {
    direccion: measure.domicilioVictima || template.direccion,
    ciudad: measure.ciudadVictima || template.ciudad,
    lat: measure.latVictima || (template.lat + jitterLat),
    lng: measure.lngVictima || (template.lng + jitterLng),
    radioMetros: measure.radioExclusionMetros || (measure.tipoMedida?.toLowerCase().includes('exclus') ? 300 : 200),
  };
}

export interface RoadRouteResult {
  coordinates: [number, number][]; // [lat, lng] array
  distanceKm: number;
  durationMinutes: number;
  isRealRoad: boolean;
  summary?: string;
}

/**
 * Fetches real road navigation route using public OSRM driving service.
 * Falls back to direct geodesic polyline if offline or service is unreachable.
 */
export async function fetchRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RoadRouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        const distanceKm = route.distance / 1000;
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        return {
          coordinates,
          distanceKm,
          durationMinutes,
          isRealRoad: true,
          summary: route.legs?.[0]?.summary || '',
        };
      }
    }
  } catch (err) {
    console.warn('OSRM road route fetch fallback to direct line:', err);
  }

  // Fallback direct line
  const directDistance = calculateDistanceKm(startLat, startLng, endLat, endLng);
  return {
    coordinates: [
      [startLat, startLng],
      [endLat, endLng],
    ],
    distanceKm: directDistance,
    durationMinutes: estimateTravelTime(directDistance, 'patrol').minutes,
    isRealRoad: false,
  };
}
