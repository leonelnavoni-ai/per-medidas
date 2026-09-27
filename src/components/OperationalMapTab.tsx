import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Search,
  Filter,
  Car,
  Footprints,
  ExternalLink,
  Shield,
  Clock,
  AlertOctagon,
  FileText,
  Eye,
  RefreshCw,
  Locate,
  Layers,
  Map as MapIcon,
  ChevronRight,
  X,
  Share2,
  CheckCircle2,
  Info,
  ArrowLeft,
  Target,
} from 'lucide-react';
import L from 'leaflet';
import { JudicialMeasure, UserProfile } from '../types';
import {
  resolveMeasureLocation,
  calculateDistanceKm,
  formatDistance,
  estimateTravelTime,
  getGoogleMapsDirUrl,
  getGoogleMapsPlaceUrl,
  fetchRoadRoute,
  RoadRouteResult,
  DEFAULT_PER_CENTER,
  GeoLocation,
} from '../utils/geoUtils';
import { getMeasureExpirationInfo } from '../utils/dateCalculations';

interface OperationalMapTabProps {
  measures: JudicialMeasure[];
  currentUser: UserProfile;
  onViewPdf: (measure: JudicialMeasure) => void;
  onOpenPoliceMemo: (measure: JudicialMeasure) => void;
  initialSelectedMeasureId?: string | null;
  initialSelectedMeasure?: JudicialMeasure | null;
  userLocation?: GeoLocation | null;
  onBackToMeasures?: () => void;
}

export const OperationalMapTab: React.FC<OperationalMapTabProps> = ({
  measures,
  currentUser,
  onViewPdf,
  onOpenPoliceMemo,
  initialSelectedMeasureId,
  initialSelectedMeasure,
  userLocation: userLocationProp,
  onBackToMeasures,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeGlowLayerRef = useRef<L.Polyline | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const officerMarkerRef = useRef<L.Marker | null>(null);

  // Officer Geolocation State
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(() => {
    return userLocationProp || DEFAULT_PER_CENTER;
  });
  const [gpsActive, setGpsActive] = useState<boolean>(Boolean(userLocationProp));
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'vigentes' | 'proximas' | 'exclusion'>('todas');
  const [distanceFilter, setDistanceFilter] = useState<'todas' | '3km' | '5km' | '10km'>('todas');

  // Selected measure & isolation state
  const [selectedMeasure, setSelectedMeasure] = useState<JudicialMeasure | null>(() => {
    if (initialSelectedMeasure) return initialSelectedMeasure;
    if (initialSelectedMeasureId) {
      return measures.find((m) => m.id === initialSelectedMeasureId) || null;
    }
    return null;
  });

  // When coming from "Ubicación y Ruta" on a card, onlyShowSelected defaults to true
  const [onlyShowSelected, setOnlyShowSelected] = useState<boolean>(() => {
    return Boolean(initialSelectedMeasure || initialSelectedMeasureId);
  });

  // Road Route calculation state
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<'interactive' | 'google_maps'>('interactive');

  // Update selected measure and isolation if initialSelectedMeasure or initialSelectedMeasureId updates
  useEffect(() => {
    const target = initialSelectedMeasure || (initialSelectedMeasureId ? measures.find((m) => m.id === initialSelectedMeasureId) : null);
    if (target) {
      setSelectedMeasure(target);
      setOnlyShowSelected(true);
    }
  }, [initialSelectedMeasure, initialSelectedMeasureId, measures]);

  // Sync GPS if provided by parent
  useEffect(() => {
    if (userLocationProp) {
      setUserLocation(userLocationProp);
      setGpsActive(true);
    }
  }, [userLocationProp]);

  // Request high-accuracy GPS location
  const requestGps = () => {
    if (!navigator.geolocation) {
      setGpsError('La geolocalización no es compatible con este navegador.');
      return;
    }
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setGpsActive(true);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 14);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsError('No se pudo obtener la posición GPS exacta. Usando ubicación base de Jefatura Paraná.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Auto request location once on mount
  useEffect(() => {
    requestGps();
  }, []);

  // Filter measures with location data and distance
  const measuresWithLocation = useMemo(() => {
    return measures.map((m) => {
      const loc = resolveMeasureLocation(m);
      const exp = getMeasureExpirationInfo(m.fechaHasta);
      const distKm = userLocation
        ? calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
        : 0;

      return {
        measure: m,
        loc,
        exp,
        distanceKm: distKm,
      };
    });
  }, [measures, userLocation]);

  const filteredItems = useMemo(() => {
    return measuresWithLocation.filter(({ measure, loc, exp, distanceKm }) => {
      // Text search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesVictima = measure.victima.toLowerCase().includes(q);
        const matchesVictimario = measure.victimario.toLowerCase().includes(q);
        const matchesOficio = measure.nroOficio.toLowerCase().includes(q);
        const matchesDir = loc.direccion.toLowerCase().includes(q);
        const matchesCiudad = loc.ciudad.toLowerCase().includes(q);
        if (!matchesVictima && !matchesVictimario && !matchesOficio && !matchesDir && !matchesCiudad) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'vigentes' && exp.status !== 'vigente' && exp.status !== 'duracion_causa') {
        return false;
      }
      if (statusFilter === 'proximas' && !exp.isExpiringSoon) {
        return false;
      }
      if (statusFilter === 'exclusion' && !measure.tipoMedida.toLowerCase().includes('exclus')) {
        return false;
      }

      // Distance filter
      if (distanceFilter === '3km' && distanceKm > 3) return false;
      if (distanceFilter === '5km' && distanceKm > 5) return false;
      if (distanceFilter === '10km' && distanceKm > 10) return false;

      return true;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [measuresWithLocation, searchTerm, statusFilter, distanceFilter]);

  // Calculate road route from officer/start location to selected victim destination
  useEffect(() => {
    if (!selectedMeasure) {
      setRoadRoute(null);
      setIsCalculatingRoute(false);
      return;
    }

    const loc = resolveMeasureLocation(selectedMeasure);
    const start = userLocation || DEFAULT_PER_CENTER;

    let isMounted = true;
    setIsCalculatingRoute(true);

    fetchRoadRoute(start.lat, start.lng, loc.lat, loc.lng)
      .then((res) => {
        if (isMounted) {
          setRoadRoute(res);
          setIsCalculatingRoute(false);
        }
      })
      .catch((err) => {
        console.warn('Road route calculation error:', err);
        if (isMounted) {
          setIsCalculatingRoute(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMeasure, userLocation]);

  // Selected measure location data
  const selectedInfo = useMemo(() => {
    if (!selectedMeasure) return null;
    const loc = resolveMeasureLocation(selectedMeasure);
    const exp = getMeasureExpirationInfo(selectedMeasure.fechaHasta);
    
    // Road distance and time when calculated, fallback to Haversine
    const distKm = roadRoute ? roadRoute.distanceKm : (
      userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng) : null
    );
    const patrolTime = roadRoute
      ? { minutes: roadRoute.durationMinutes, text: `${roadRoute.durationMinutes} min` }
      : (distKm !== null ? estimateTravelTime(distKm, 'patrol') : null);
    const walkTime = distKm !== null ? estimateTravelTime(distKm, 'walking') : null;
    const navUrl = getGoogleMapsDirUrl(
      loc.lat,
      loc.lng,
      userLocation?.lat,
      userLocation?.lng
    );

    return {
      measure: selectedMeasure,
      loc,
      exp,
      distKm,
      patrolTime,
      walkTime,
      navUrl,
      isRealRoad: roadRoute?.isRealRoad ?? false,
      roadSummary: roadRoute?.summary,
    };
  }, [selectedMeasure, userLocation, roadRoute]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (viewMode !== 'interactive') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map
      const center = userLocation || DEFAULT_PER_CENTER;
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: true,
      });

      // OpenStreetMap Tiles (Crisp & Reliable standard tiles)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors • Policía de Entre Ríos',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    // Clear previous markers
    markersLayerRef.current.clearLayers();

    // Remove route polyline if any
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (routeGlowLayerRef.current) {
      routeGlowLayerRef.current.remove();
      routeGlowLayerRef.current = null;
    }

    // Remove circle if any
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
      circleLayerRef.current = null;
    }

    // 1. Officer Current GPS Position Marker
    if (userLocation) {
      const officerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>
      `;

      const officerIcon = L.divIcon({
        className: 'custom-officer-pin',
        html: officerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (officerMarkerRef.current) {
        officerMarkerRef.current.remove();
      }

      officerMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: officerIcon,
        zIndexOffset: 1000,
      })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div class="text-xs p-1">
            <strong class="text-blue-600 block text-sm">Mi Posición Actual</strong>
            <span>Dotación Policial / Móvil de Guardia</span>
            ${gpsAccuracy ? `<div class="text-[10px] text-gray-500 mt-1">Precisión GPS: ±${gpsAccuracy} m</div>` : ''}
          </div>
        `);
    }

    // 2. ISOLATED MODE: If onlyShowSelected is true and a measure is selected, display ONLY this measure!
    if (onlyShowSelected && selectedMeasure) {
      const loc = resolveMeasureLocation(selectedMeasure);
      const exp = getMeasureExpirationInfo(selectedMeasure.fechaHasta);

      // Distinctive Destination Pin with victim badge and pulsing radar
      const destinationHtml = `
        <div class="relative flex items-center justify-center cursor-pointer">
          <div class="absolute w-10 h-10 rounded-full bg-rose-500/30 animate-ping"></div>
          <div class="w-9 h-9 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white bg-rose-600 ring-2 ring-rose-500/50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-slate-900/80"></div>
        </div>
      `;

      const destinationIcon = L.divIcon({
        className: 'custom-measure-destination-marker',
        html: destinationHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 32],
      });

      const destMarker = L.marker([loc.lat, loc.lng], {
        icon: destinationIcon,
        zIndexOffset: 900,
      }).addTo(markersLayerRef.current);

      destMarker.bindPopup(`
        <div class="p-1.5 text-xs max-w-xs space-y-1">
          <div class="font-extrabold text-sm text-slate-900">${selectedMeasure.victima}</div>
          <div class="text-[11px] text-slate-600"><strong>Domicilio Protegido:</strong> ${loc.direccion}, ${loc.ciudad}</div>
          <div class="text-[11px] text-rose-600 font-bold"><strong>Radio de Exclusión:</strong> ${loc.radioMetros} metros</div>
          <div class="text-[11px] text-slate-600"><strong>Oficio N°:</strong> ${selectedMeasure.nroOficio} (${selectedMeasure.provenienteDe})</div>
          <div class="text-[11px] text-slate-600"><strong>Denunciado:</strong> ${selectedMeasure.victimario}</div>
        </div>
      `).openPopup();

      // Render Perimeter exclusion circle
      circleLayerRef.current = L.circle([loc.lat, loc.lng], {
        radius: loc.radioMetros,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      // Render Traveled Route from officer to victim
      const startPoint = userLocation || DEFAULT_PER_CENTER;
      const polylineCoords: [number, number][] = roadRoute?.coordinates && roadRoute.coordinates.length > 0
        ? roadRoute.coordinates
        : [
            [startPoint.lat, startPoint.lng],
            [loc.lat, loc.lng],
          ];

      // Route Glow Underlay
      routeGlowLayerRef.current = L.polyline(polylineCoords, {
        color: '#60a5fa',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Main Road Navigation Line
      routeLayerRef.current = L.polyline(polylineCoords, {
        color: '#1d4ed8',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Fit map bounds to show both officer, victim and all road curves
      const bounds = L.latLngBounds(polylineCoords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      // 3. MULTI-MEASURE MODE: Render all filtered measures
      filteredItems.forEach(({ measure, loc, exp }) => {
        const isSelected = selectedMeasure?.id === measure.id;

        // Color based on status
        let pinColor = '#2563eb'; // blue
        if (exp.isExpired) {
          pinColor = '#dc2626'; // red
        } else if (exp.isExpiringSoon) {
          pinColor = '#d97706'; // amber
        } else if (measure.tipoMedida.toLowerCase().includes('exclus')) {
          pinColor = '#e11d48'; // rose
        } else if (measure.medidaReciproca === 'Si') {
          pinColor = '#7c3aed'; // purple
        }

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group ${isSelected ? 'scale-125 z-50' : ''}">
            <div class="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-white border-2 border-white" style="background-color: ${pinColor}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-1 w-2 h-2 rounded-full bg-slate-900/60"></div>
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'custom-measure-marker',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 28],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: markerIcon }).addTo(markersLayerRef.current!);

        marker.on('click', () => {
          setSelectedMeasure(measure);
        });

        // Bind concise popup
        marker.bindPopup(`
          <div class="p-1 text-xs max-w-xs space-y-1">
            <div class="font-extrabold text-sm text-slate-900">${measure.victima}</div>
            <div class="text-[11px] text-slate-600"><strong>Medida:</strong> ${measure.tipoMedida}</div>
            <div class="text-[11px] text-slate-600"><strong>Domicilio:</strong> ${loc.direccion}, ${loc.ciudad}</div>
            <div class="text-[11px] text-slate-600"><strong>Radio:</strong> ${loc.radioMetros} metros</div>
            <div class="text-[10px] font-mono text-slate-500">Oficio N° ${measure.nroOficio} (${measure.provenienteDe})</div>
          </div>
        `);
      });

      // If a measure is selected in multi-measure mode, also render its route line and perimeter circle
      if (selectedMeasure) {
        const loc = resolveMeasureLocation(selectedMeasure);

        // Render Perimeter circle
        circleLayerRef.current = L.circle([loc.lat, loc.lng], {
          radius: loc.radioMetros,
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '6, 6',
        }).addTo(map);

        // Render Route line from officer to victim
        const startPoint = userLocation || DEFAULT_PER_CENTER;
        const polylineCoords: [number, number][] = roadRoute?.coordinates && roadRoute.coordinates.length > 0
          ? roadRoute.coordinates
          : [
              [startPoint.lat, startPoint.lng],
              [loc.lat, loc.lng],
            ];

        routeGlowLayerRef.current = L.polyline(polylineCoords, {
          color: '#60a5fa',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        routeLayerRef.current = L.polyline(polylineCoords, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Fit map bounds to show both officer and victim
        const bounds = L.latLngBounds(polylineCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [filteredItems, selectedMeasure, userLocation, viewMode, onlyShowSelected, roadRoute]);

  // Center on officer
  const handleCenterOnOfficer = () => {
    if (!userLocation) {
      requestGps();
      return;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Header Title & GPS status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Mapa Operativo de Medidas Judiciales
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Policía de Entre Ríos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ubicación geográfica de víctimas protegidas, radios de exclusión y cálculo de ruta operativa en tiempo real.
              </p>
            </div>
          </div>

          {/* Action buttons: GPS locate, Isolation Mode, View Switch & Back */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCenterOnOfficer}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Centrar mapa en mi posición actual GPS"
            >
              <Locate className="w-4 h-4 text-blue-500" />
              <span>Mi Posición GPS</span>
              {gpsActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
            </button>

            {/* Mode toggle button between isolated selected measure vs all measures */}
            {selectedMeasure && !onlyShowSelected && (
              <button
                onClick={() => setOnlyShowSelected(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Aislar y ver exclusivamente la medida seleccionada con su trazado de ruta"
              >
                <Target className="w-4 h-4" />
                <span>Solo Esta Medida</span>
              </button>
            )}

            {selectedMeasure && onlyShowSelected && (
              <button
                onClick={() => setOnlyShowSelected(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mostrar todas las medidas en el mapa"
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Ver Todas en Mapa</span>
              </button>
            )}

            <button
              onClick={() => setViewMode(viewMode === 'interactive' ? 'google_maps' : 'interactive')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cambiar entre Mapa Interactivo y vista directa Google Maps"
            >
              <MapIcon className="w-4 h-4 text-amber-500" />
              <span>{viewMode === 'interactive' ? 'Ver en Google Maps' : 'Ver Mapa Interactivo'}</span>
            </button>

            {onBackToMeasures && (
              <button
                onClick={onBackToMeasures}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Volver al explorador de tarjetas"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Tarjetas</span>
              </button>
            )}
          </div>

        </div>

        {/* Filter Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por víctima, denunciado, oficio o calle..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold mr-1 shrink-0">Filtro:</span>
            
            <button
              onClick={() => setStatusFilter('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === 'todas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas ({measures.length})
            </button>

            <button
              onClick={() => setStatusFilter('vigentes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === 'vigentes'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Vigentes
            </button>

            <button
              onClick={() => setStatusFilter('proximas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === 'proximas'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Por Vencer
            </button>

            <button
              onClick={() => setStatusFilter('exclusion')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === 'exclusion'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Exclusiones
            </button>

            {/* Distance range */}
            <select
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value as any)}
              className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              <option value="todas">Cualquier distancia</option>
              <option value="3km">Cerca (&lt; 3 km)</option>
              <option value="5km">Radio 5 km</option>
              <option value="10km">Radio 10 km</option>
            </select>
          </div>

        </div>

        {/* GPS Alert Notice if any */}
        {gpsError && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button
              onClick={requestGps}
              className="text-amber-900 dark:text-amber-100 underline font-bold cursor-pointer"
            >
              Reintentar GPS
            </button>
          </div>
        )}

      </div>

      {/* Banner de Medida Focalizada y Trazado de Recorrido Activo */}
      {selectedMeasure && onlyShowSelected && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900/15 via-indigo-900/15 to-blue-900/15 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border-2 border-blue-400 dark:border-blue-600 shadow-md animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                    Modo Recorrido Activo
                  </span>
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {selectedMeasure.victima}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Oficio N° {selectedMeasure.nroOficio}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedInfo?.exp.isExpired
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {selectedInfo?.exp.badgeLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    Destino Protegido: <strong>{resolveMeasureLocation(selectedMeasure).direccion}, {resolveMeasureLocation(selectedMeasure).ciudad}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {isCalculatingRoute
                      ? 'Trazando recorrido vial por calles...'
                      : (roadRoute?.isRealRoad
                          ? `Recorrido vial por calles trazado: ${roadRoute.distanceKm.toFixed(1)} km (~${roadRoute.durationMinutes} min en patrulla)`
                          : `Ruta calculada a destino: ${selectedInfo?.distKm ? selectedInfo.distKm.toFixed(1) : ''} km`)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={() => setOnlyShowSelected(false)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Mostrar todas las medidas policiales en el mapa interactivo"
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Ver Todas en el Mapa ({measures.length})</span>
              </button>

              {onBackToMeasures && (
                <button
                  onClick={onBackToMeasures}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Volver al listado de tarjetas de medidas"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Tarjetas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Map + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Map View Canvas (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-3">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg relative h-[480px] sm:h-[560px]">
            
            {viewMode === 'interactive' ? (
              /* Leaflet OpenStreetMap Container */
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            ) : (
              /* Direct Google Maps View Embed */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                  <Navigation className="w-8 h-8 text-blue-400" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-base font-bold text-white">Navegación Externa en Google Maps</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Puedes abrir las ubicaciones directamente en la aplicación Google Maps para obtener navegación giro a giro con tránsito en tiempo real para el patrullero policial.
                  </p>
                </div>
                {selectedInfo ? (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left max-w-md w-full space-y-2">
                    <div className="text-xs font-bold text-white">{selectedInfo.measure.victima}</div>
                    <div className="text-[11px] text-slate-400">{selectedInfo.loc.direccion}, {selectedInfo.loc.ciudad}</div>
                    <a
                      href={selectedInfo.navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Iniciar Navegación Google Maps hacia esta víctima</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">
                    Selecciona una medida en el listado para abrir su ruta en Google Maps.
                  </p>
                )}
                <button
                  onClick={() => setViewMode('interactive')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Volver al Mapa Interactivo
                </button>
              </div>
            )}

            {/* Quick Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 text-[11px] text-slate-200 shadow-xl hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
                <span>Mi Posición</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
                <span>Vigente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
                <span>Por Vencer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white"></span>
                <span>Exclusión</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-dashed border-rose-400 bg-rose-500/20"></span>
                <span>Radio Exclusión</span>
              </div>
            </div>

          </div>

          {/* Selected Route & Action Bottom Panel */}
          {selectedInfo && (
            <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/50 rounded-2xl p-4 sm:p-5 shadow-lg animate-in slide-in-from-bottom-2 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                      Ruta Seleccionada
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      Oficio: {selectedInfo.measure.nroOficio}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedInfo.exp.isExpired
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {selectedInfo.exp.badgeLabel}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedInfo.measure.victima}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{selectedInfo.loc.direccion}, {selectedInfo.loc.ciudad}</span>
                    <span className="text-slate-400">• Radio: {selectedInfo.loc.radioMetros}m</span>
                  </p>
                </div>

                {/* Distance & ETA KPIs */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Distancia</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                      {selectedInfo.distKm !== null ? formatDistance(selectedInfo.distKm) : '---'}
                    </span>
                  </div>
                  <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">En Patrulla</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <Car className="w-4 h-4" />
                      <span>{selectedInfo.patrolTime ? selectedInfo.patrolTime.text : '---'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Selected Measure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Turn-by-Turn GPS Navigation in Google Maps */}
                <a
                  href={selectedInfo.navUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Navigation className="w-4 h-4 animate-pulse" />
                  <span>Navegar en Google Maps</span>
                </a>

                {/* 2. Create Police Memo for this victim/commission */}
                <button
                  onClick={() => onOpenPoliceMemo(selectedInfo.measure)}
                  className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generar Memo Policial</span>
                </button>

                {/* 3. View Judicial Document */}
                <button
                  onClick={() => onViewPdf(selectedInfo.measure)}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Oficio Judicial</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Sidebar: Measure list ordered by distance (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-3">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {onlyShowSelected && selectedMeasure ? 'Medida Seleccionada' : `Medidas en la Zona (${filteredItems.length})`}
                </h4>
              </div>
              {onlyShowSelected && selectedMeasure ? (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Recorrido Activo
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Ordenadas por distancia</span>
              )}
            </div>

            {/* If in isolated mode, show prominent selected measure detail box first */}
            {onlyShowSelected && selectedMeasure && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border-2 border-blue-400 dark:border-blue-600 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                      Objetivo de Protección
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      Oficio: {selectedMeasure.nroOficio}
                    </span>
                  </div>
                  <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {selectedMeasure.victima}
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    c/ {selectedMeasure.victimario}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-800/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{resolveMeasureLocation(selectedMeasure).direccion}, {resolveMeasureLocation(selectedMeasure).ciudad}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Radio de exclusión:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono">{resolveMeasureLocation(selectedMeasure).radioMetros}m</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Distancia y patrulla:</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-mono">
                      {selectedInfo?.distKm ? formatDistance(selectedInfo.distKm) : '---'} (~{selectedInfo?.patrolTime?.text || '---'})
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setOnlyShowSelected(false)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-600 text-center transition-colors cursor-pointer"
                  >
                    Ver Otras Medidas
                  </button>
                  {onBackToMeasures && (
                    <button
                      onClick={onBackToMeasures}
                      className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                    >
                      Volver
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List of items */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    No hay medidas que coincidan con los filtros aplicados.
                  </p>
                </div>
              ) : (
                filteredItems.map(({ measure, loc, exp, distanceKm }) => {
                  const isSelected = selectedMeasure?.id === measure.id;
                  const patrolEta = estimateTravelTime(distanceKm, 'patrol');

                  // In isolated mode, we don't need to re-render the duplicate item if it's already shown in the top box
                  if (onlyShowSelected && isSelected) {
                    return null;
                  }

                  return (
                    <div
                      key={measure.id}
                      onClick={() => {
                        setSelectedMeasure(measure);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([loc.lat, loc.lng], 15);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Top: Name & Distance */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {measure.victima}
                            </h5>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              c/ {measure.victimario}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 block">
                              {formatDistance(distanceKm)}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ~{patrolEta.text}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Address & Measure Type */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{loc.direccion}</span>
                        </div>
                      </div>

                      {/* Bottom tags & actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400">Oficio: {measure.nroOficio}</span>

                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            exp.isExpired
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : exp.isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {exp.badgeLabel}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeasure(measure);
                              setOnlyShowSelected(true);
                              if (mapInstanceRef.current) {
                                mapInstanceRef.current.setView([loc.lat, loc.lng], 15);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
                          >
                            Trazar Ruta
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
