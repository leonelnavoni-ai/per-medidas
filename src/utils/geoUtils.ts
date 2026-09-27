import { JudicialMeasure } from '../types';

export interface GeoLocation {
  lat: number;
  lng: number;
}

// Victoria, Entre Ríos default center (Jefatura Departamental Victoria / Plaza San Martín)
export const DEFAULT_PER_CENTER: GeoLocation = {
  lat: -32.6184,
  lng: -60.1558,
};

// Known localities and coordinates in Victoria Department, Entre Ríos
export const LOCALITIES_VICTORIA_DEPARTMENT: Record<string, GeoLocation> = {
  'Victoria': { lat: -32.6184, lng: -60.1558 },
  'Rincón del Doll': { lat: -32.5188, lng: -60.3297 },
  'Molino Doll': { lat: -32.5350, lng: -60.4020 },
  'Antelo': { lat: -32.6950, lng: -60.0210 },
  'Laguna del Pescado': { lat: -32.7480, lng: -60.1250 },
  'Chilcas': { lat: -32.5850, lng: -60.0450 },
  'Hinojal': { lat: -32.5400, lng: -60.1800 },
  'Montoya': { lat: -32.6500, lng: -60.2500 },
};

// Reference addresses situated exclusively in Victoria, Entre Ríos
export const DEFAULT_ADDRESSES_VICTORIA = [
  { direccion: 'Bv. Eva Perón y Corrientes', ciudad: 'Victoria', lat: -32.6190, lng: -60.1520 },
  { direccion: 'San Martín 450, Centro', ciudad: 'Victoria', lat: -32.6178, lng: -60.1552 },
  { direccion: 'Bv. Moreno 320', ciudad: 'Victoria', lat: -32.6230, lng: -60.1585 },
  { direccion: 'Bv. Sarmiento 650', ciudad: 'Victoria', lat: -32.6145, lng: -60.1510 },
  { direccion: 'Calle Maipú 280', ciudad: 'Victoria', lat: -32.6210, lng: -60.1565 },
  { direccion: 'Calle Congreso 410', ciudad: 'Victoria', lat: -32.6165, lng: -60.1540 },
  { direccion: 'Calle 9 de Julio 180', ciudad: 'Victoria', lat: -32.6225, lng: -60.1575 },
  { direccion: 'Calle 25 de Mayo 520', ciudad: 'Victoria', lat: -32.6200, lng: -60.1535 },
  { direccion: 'Calle Bartoloni 340', ciudad: 'Victoria', lat: -32.6155, lng: -60.1580 },
  { direccion: 'Calle Laprida 150', ciudad: 'Victoria', lat: -32.6195, lng: -60.1590 },
  { direccion: 'Calle Piaggio 260', ciudad: 'Victoria', lat: -32.6240, lng: -60.1545 },
  { direccion: 'Calle Abásolo 430', ciudad: 'Victoria', lat: -32.6130, lng: -60.1560 },
  { direccion: 'Barrio Quinto Cuartel, Calle Pública', ciudad: 'Victoria', lat: -32.6310, lng: -60.1620 },
  { direccion: 'Barrio Matanza, Calle Rondeau', ciudad: 'Victoria', lat: -32.6090, lng: -60.1490 },
  { direccion: 'Barrio Abadía, Calle San Miguel', ciudad: 'Victoria', lat: -32.6280, lng: -60.1480 },
  { direccion: 'Costanera Bv. Brown y Camoatí', ciudad: 'Victoria', lat: -32.6260, lng: -60.1680 },
  { direccion: 'Av. Centenario 820', ciudad: 'Victoria', lat: -32.6110, lng: -60.1580 },
  { direccion: 'Calle Ezpeleta 310', ciudad: 'Victoria', lat: -32.6180, lng: -60.1610 },
  { direccion: 'Calle Italia 210', ciudad: 'Victoria', lat: -32.6172, lng: -60.1538 },
  { direccion: 'Calle Alem 340', ciudad: 'Victoria', lat: -32.6215, lng: -60.1548 },
];

// Alias for backwards compatibility
export const DEFAULT_ADDRESSES_ENTRE_RIOS = DEFAULT_ADDRESSES_VICTORIA;

/**
 * Validates whether GPS coordinates are within the Victoria Department boundary
 */
export function isVictoriaCoordinates(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
  // Bounding box for Victoria Department, Entre Ríos
  return lat <= -32.40 && lat >= -32.85 && lng <= -59.85 && lng >= -60.45;
}

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
 * Generates Google Maps search / place URL explicitly targeted by coordinates
 * Ensures Google Maps drops a precise GPS pin without street search failure
 */
export function getGoogleMapsPlaceUrl(
  lat: number,
  lng: number,
  _label?: string,
  _city: string = 'Victoria'
): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Validates whether GPS coordinates are real geographical coordinates in Argentina / South America
 */
export function isValidGpsCoordinate(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
  // Valid coordinates covering Argentina and surroundings
  return lat >= -56 && lat <= -20 && lng >= -75 && lng <= -50;
}

/**
 * Parses raw GPS coordinates or Google Maps URLs into { lat, lng }
 * Examples supported:
 * - "-32.6184, -60.1558"
 * - "-32.6184 -60.1558"
 * - "https://www.google.com/maps/place/.../@-32.6184,-60.1558,17z/..."
 * - "https://maps.google.com/?q=-32.6184,-60.1558"
 * - "https://www.google.com/maps/search/?api=1&query=-32.6184,-60.1558"
 */
export function parseCoordsOrGoogleMapsLink(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. Google Maps URL pattern: /@(-?\d+\.\d+),(-?\d+\.\d+)
  const atMatch = trimmed.match(/@(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidGpsCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // 2. Query parameter pattern: q=(-?\d+\.\d+),(-?\d+\.\d+) or query=... or ll=...
  const queryMatch = trimmed.match(/(?:q|query|ll|destination)=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidGpsCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // 3. /place/(-?\d+\.\d+),(-?\d+\.\d+)
  const placeMatch = trimmed.match(/place\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (isValidGpsCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // 4. Raw coordinate pair: "-32.6184, -60.1558" or "-32.6184 -60.1558" or "(-32.6184, -60.1558)"
  const clean = trimmed.replace(/[()[\]{}]/g, '');
  const rawMatch = clean.match(/(-?\d{1,2}\.\d{3,})[\s,;\/]+(-?\d{1,3}\.\d{3,})/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidGpsCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Reverse geocoding lookup using OpenStreetMap Nominatim with fast fallback
 */
export async function reverseGeocodeOnline(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'es' }
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const road = data.address.road || data.address.pedestrian || data.address.street;
      const houseNumber = data.address.house_number;
      const suburb = data.address.suburb || data.address.neighbourhood || data.address.quarter;
      if (road && houseNumber) {
        return `${road} ${houseNumber}${suburb ? `, ${suburb}` : ''}`;
      } else if (road) {
        return `${road}${suburb ? `, ${suburb}` : ''}`;
      } else if (data.name) {
        return data.name;
      }
    }
  } catch (e) {
    // Timeout or network error; gracefully ignore
  }
  return null;
}

/**
 * Approximate geocode for addresses in Victoria or surrounding department
 */
export function geocodeVictoriaAddress(direccion?: string, ciudad?: string): GeoLocation {
  const normCity = ciudad?.trim() || 'Victoria';
  const knownLoc = LOCALITIES_VICTORIA_DEPARTMENT[normCity];
  const baseCenter = knownLoc || DEFAULT_PER_CENTER;

  if (!direccion || !direccion.trim()) {
    return baseCenter;
  }

  const d = direccion.toLowerCase();
  // Check known streets
  for (const item of DEFAULT_ADDRESSES_VICTORIA) {
    const itemStreet = item.direccion.toLowerCase().split(',')[0].trim();
    if (d.includes(itemStreet) || itemStreet.includes(d)) {
      return { lat: item.lat, lng: item.lng };
    }
  }

  // Street keywords
  if (d.includes('eva perón') || d.includes('peron')) return { lat: -32.6190, lng: -60.1520 };
  if (d.includes('san martín') || d.includes('san martin')) return { lat: -32.6178, lng: -60.1552 };
  if (d.includes('moreno')) return { lat: -32.6230, lng: -60.1585 };
  if (d.includes('sarmiento')) return { lat: -32.6145, lng: -60.1510 };
  if (d.includes('maipú') || d.includes('maipu')) return { lat: -32.6210, lng: -60.1565 };
  if (d.includes('congreso')) return { lat: -32.6165, lng: -60.1540 };
  if (d.includes('9 de julio')) return { lat: -32.6225, lng: -60.1575 };
  if (d.includes('25 de mayo')) return { lat: -32.6200, lng: -60.1535 };
  if (d.includes('bartoloni')) return { lat: -32.6155, lng: -60.1580 };
  if (d.includes('laprida')) return { lat: -32.6195, lng: -60.1590 };
  if (d.includes('piaggio')) return { lat: -32.6240, lng: -60.1545 };
  if (d.includes('abásolo') || d.includes('abasolo')) return { lat: -32.6130, lng: -60.1560 };
  if (d.includes('quinto cuartel')) return { lat: -32.6310, lng: -60.1620 };
  if (d.includes('matanza')) return { lat: -32.6090, lng: -60.1490 };
  if (d.includes('abadía') || d.includes('abadia')) return { lat: -32.6280, lng: -60.1480 };
  if (d.includes('brown') || d.includes('costanera')) return { lat: -32.6260, lng: -60.1680 };
  if (d.includes('centenario')) return { lat: -32.6110, lng: -60.1580 };
  if (d.includes('ezpeleta')) return { lat: -32.6180, lng: -60.1610 };
  if (d.includes('italia')) return { lat: -32.6172, lng: -60.1538 };
  if (d.includes('alem')) return { lat: -32.6215, lng: -60.1548 };

  // Generate deterministic jitter within Victoria center if not matched
  const hash = direccion.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jitterLat = ((hash % 21) - 10) * 0.0006;
  const jitterLng = (((hash * 3) % 21) - 10) * 0.0006;

  return {
    lat: baseCenter.lat + jitterLat,
    lng: baseCenter.lng + jitterLng,
  };
}

/**
 * Checks whether a measure has a real user-defined location or coordinates
 */
export function hasMeasureLocation(measure?: JudicialMeasure | null): boolean {
  if (!measure) return false;
  const hasCoords =
    typeof measure.latVictima === 'number' &&
    typeof measure.lngVictima === 'number' &&
    isValidGpsCoordinate(measure.latVictima, measure.lngVictima);
  const hasAddr = Boolean(measure.domicilioVictima && measure.domicilioVictima.trim().length > 0);
  return hasCoords || hasAddr;
}

/**
 * Resolves a measure location.
 * NO CARGA UBICACIÓN AUTOMÁTICAMENTE: Si el usuario no cargó dirección o coordenadas,
 * hasLocation será false y no se inventan calles ni pines ficticios.
 */
export function resolveMeasureLocation(measure: JudicialMeasure): {
  direccion: string;
  ciudad: string;
  lat: number;
  lng: number;
  radioMetros: number;
  hasLocation: boolean;
} {
  let cleanCity = measure.ciudadVictima?.trim() || 'Victoria';
  if (cleanCity === 'Paraná' || cleanCity === 'Concordia') {
    cleanCity = 'Victoria';
  }

  // 1. Coordenadas explícitas cargadas por el usuario
  if (
    typeof measure.latVictima === 'number' &&
    typeof measure.lngVictima === 'number' &&
    isValidGpsCoordinate(measure.latVictima, measure.lngVictima)
  ) {
    return {
      direccion: measure.domicilioVictima?.trim() || 'Coordenadas GPS fijadas',
      ciudad: cleanCity,
      lat: measure.latVictima,
      lng: measure.lngVictima,
      radioMetros: measure.radioExclusionMetros || 200,
      hasLocation: true,
    };
  }

  // 2. Domicilio escrito por el usuario
  if (measure.domicilioVictima && measure.domicilioVictima.trim()) {
    const coords = geocodeVictoriaAddress(measure.domicilioVictima, cleanCity);
    return {
      direccion: measure.domicilioVictima.trim(),
      ciudad: cleanCity,
      lat: coords.lat,
      lng: coords.lng,
      radioMetros: measure.radioExclusionMetros || (measure.tipoMedida?.toLowerCase().includes('exclus') ? 300 : 200),
      hasLocation: true,
    };
  }

  // 3. SIN UBICACIÓN: No inventar calles ni pines falsos
  return {
    direccion: '',
    ciudad: cleanCity,
    lat: DEFAULT_PER_CENTER.lat,
    lng: DEFAULT_PER_CENTER.lng,
    radioMetros: measure.radioExclusionMetros || 200,
    hasLocation: false,
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
