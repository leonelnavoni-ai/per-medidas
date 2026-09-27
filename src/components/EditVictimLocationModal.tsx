import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  X,
  Search,
  Crosshair,
  ExternalLink,
  Save,
  Check,
  Compass,
  Layers,
  AlertCircle,
  HelpCircle,
  Navigation,
  Loader2,
  Share2,
} from 'lucide-react';
import L from 'leaflet';
import { JudicialMeasure } from '../types';
import {
  resolveMeasureLocation,
  parseCoordsOrGoogleMapsLink,
  reverseGeocodeOnline,
  DEFAULT_PER_CENTER,
  getGoogleMapsPlaceUrl,
  isValidGpsCoordinate,
} from '../utils/geoUtils';

interface EditVictimLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  measure: JudicialMeasure;
  onSaveLocation: (updated: {
    domicilioVictima: string;
    ciudadVictima: string;
    latVictima: number;
    lngVictima: number;
    radioExclusionMetros: number;
  }) => Promise<void> | void;
}

export const EditVictimLocationModal: React.FC<EditVictimLocationModalProps> = ({
  isOpen,
  onClose,
  measure,
  onSaveLocation,
}) => {
  const initialLoc = resolveMeasureLocation(measure);

  const [domicilio, setDomicilio] = useState(initialLoc.direccion || '');
  const [ciudad, setCiudad] = useState(initialLoc.ciudad || 'Victoria');
  const [radioMetros, setRadioMetros] = useState<number>(initialLoc.radioMetros || 200);
  const [lat, setLat] = useState<number>(initialLoc.lat);
  const [lng, setLng] = useState<number>(initialLoc.lng);

  // Search & Google Maps paste inputs
  const [googleMapsInput, setGoogleMapsInput] = useState('');
  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite'>('streets');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Sync state when measure changes
  useEffect(() => {
    if (isOpen) {
      const loc = resolveMeasureLocation(measure);
      setDomicilio(loc.direccion || '');
      setCiudad(loc.ciudad || 'Victoria');
      setRadioMetros(loc.radioMetros || 200);
      setLat(loc.lat);
      setLng(loc.lng);
      setGoogleMapsInput('');
      setSearchAddressQuery('');
      setStatusNotice(null);
    }
  }, [isOpen, measure]);

  // Initialize and manage Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLat = isValidGpsCoordinate(lat, lng) ? lat : DEFAULT_PER_CENTER.lat;
    const startLng = isValidGpsCoordinate(lat, lng) ? lng : DEFAULT_PER_CENTER.lng;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 16,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri World Imagery',
        maxZoom: 19,
      }
    );

    const activeTileLayer = mapLayerType === 'satellite' ? satelliteLayer : streetLayer;
    activeTileLayer.addTo(map);
    tileLayerRef.current = activeTileLayer;

    // Custom Victim Location Pin Icon
    const customIcon = L.divIcon({
      className: 'custom-victim-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; background-color: #ef4444; opacity: 0.3; border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 32px; height: 32px; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border: 2.5px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Draggable marker
    const marker = L.marker([startLat, startLng], {
      icon: customIcon,
      draggable: true,
      title: 'Arrastrá para ajustar la ubicación exacta',
    }).addTo(map);

    // Exclusion perimeter circle
    const circle = L.circle([startLat, startLng], {
      radius: radioMetros,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 4',
    }).addTo(map);

    // Drag listener
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      circle.setLatLng(pos);
      await handleAutoReverseGeocode(pos.lat, pos.lng);
    });

    // Map click listener: moves marker to clicked coordinates
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      circle.setLatLng([clickLat, clickLng]);
      setLat(clickLat);
      setLng(clickLng);
      await handleAutoReverseGeocode(clickLat, clickLng);
    });

    markerRef.current = marker;
    circleRef.current = circle;
    mapInstanceRef.current = map;

    // Leaflet rendering invalidation
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen]);

  // Update tile layer when layer toggle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer =
      mapLayerType === 'satellite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { attribution: '&copy; Esri World Imagery', maxZoom: 19 }
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapLayerType]);

  // Update circle radius when radioMetros changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radioMetros);
    }
  }, [radioMetros]);

  // Reverse geocode helper
  const handleAutoReverseGeocode = async (targetLat: number, targetLng: number) => {
    setIsReverseGeocoding(true);
    setStatusNotice('Actualizando dirección según coordenadas...');
    try {
      const foundStreet = await reverseGeocodeOnline(targetLat, targetLng);
      if (foundStreet) {
        setDomicilio(foundStreet);
        setStatusNotice(`Dirección detectada: ${foundStreet}`);
      } else {
        setStatusNotice('Punto GPS fijado. Podés escribir o corregir el nombre de la calle.');
      }
    } catch {
      setStatusNotice('Punto GPS fijado.');
    } finally {
      setIsReverseGeocoding(false);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  // Move map and marker to new coordinates
  const moveMarkerTo = (newLat: number, newLng: number, zoom = 16) => {
    setLat(newLat);
    setLng(newLng);
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], zoom);
      markerRef.current.setLatLng([newLat, newLng]);
      circleRef.current.setLatLng([newLat, newLng]);
    }
  };

  // Parse and apply Google Maps input or coords
  const handleApplyGoogleMaps = () => {
    if (!googleMapsInput.trim()) return;
    const parsed = parseCoordsOrGoogleMapsLink(googleMapsInput);
    if (parsed) {
      moveMarkerTo(parsed.lat, parsed.lng, 17);
      handleAutoReverseGeocode(parsed.lat, parsed.lng);
      setStatusNotice('¡Punto de Google Maps importado correctamente!');
      setGoogleMapsInput('');
    } else {
      setStatusNotice('No se reconocieron coordenadas en el enlace o texto ingresado.');
    }
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Search address online / local
  const handleSearchAddress = async () => {
    if (!searchAddressQuery.trim()) return;
    setIsSearching(true);
    setStatusNotice('Buscando en el mapa...');
    try {
      const queryWithCity = `${searchAddressQuery.trim()}, ${ciudad || 'Victoria'}, Entre Ríos, Argentina`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithCity)}&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          moveMarkerTo(newLat, newLng, 17);
          setDomicilio(searchAddressQuery.trim());
          setStatusNotice(`Ubicación encontrada: ${item.display_name.split(',')[0]}`);
          setSearchAddressQuery('');
        } else {
          setStatusNotice('No se encontró el lugar. Probá hacer clic directamente sobre el mapa.');
        }
      }
    } catch {
      setStatusNotice('Error al buscar. Podés marcar el punto directamente en el mapa.');
    } finally {
      setIsSearching(false);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  // Officer device GPS
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setStatusNotice('La geolocalización no está disponible en este dispositivo.');
      return;
    }
    setStatusNotice('Obteniendo ubicación del GPS del dispositivo...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        moveMarkerTo(latitude, longitude, 17);
        handleAutoReverseGeocode(latitude, longitude);
        setStatusNotice('Ubicación establecida desde tu GPS actual.');
        setTimeout(() => setStatusNotice(null), 4000);
      },
      (err) => {
        setStatusNotice(`Error GPS: ${err.message}`);
        setTimeout(() => setStatusNotice(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveLocation({
        domicilioVictima: domicilio.trim() || 'Domicilio fijado',
        ciudadVictima: ciudad.trim() || 'Victoria',
        latVictima: lat,
        lngVictima: lng,
        radioExclusionMetros: radioMetros,
      });
      onClose();
    } catch (err: any) {
      console.error('Error al guardar ubicación:', err);
      setStatusNotice('Error al guardar la ubicación. Reintentá.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col text-slate-900 dark:text-slate-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  Editor de Ubicación en Google Maps
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Oficio N° {measure.nroOficio}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                Modificar Ubicación de {measure.victima}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice explaining Google Maps GPS resolution */}
        <div className="bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 border-b border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Ubicación exacta en GPS:</strong> Al hacer clic en el mapa o pegar enlace de Google Maps, se guardan las coordenadas exactas para que la patrulla policial llegue a la puerta correcta.
            </span>
          </div>
          {statusNotice && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 shrink-0">
              {statusNotice}
            </span>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Top Search & Google Maps Import Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* 1. Google Maps Link or Coords Paste */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Cargar desde Google Maps o Coordenadas GPS:</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={googleMapsInput}
                  onChange={(e) => setGoogleMapsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyGoogleMaps()}
                  placeholder="Pegar enlace de Google Maps o ej. -32.6184, -60.1558"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyGoogleMaps}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  Aplicar
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Copiá la ubicación desde Google Maps en tu celular o PC y pegala acá directamente.
              </p>
            </div>

            {/* 2. Search address online */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Buscar calle o punto en Victoria:</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={searchAddressQuery}
                  onChange={(e) => setSearchAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                  placeholder="Ej. San Martín 450, Bv. Eva Perón o Plaza San Martín"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearching}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Buscar</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Centra el mapa en el resultado de búsqueda.</span>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Mi GPS</span>
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>Mapa Interactivo (Hacé clic en el mapa o arrastrá el pin)</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setMapLayerType('streets')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                    mapLayerType === 'streets'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Calles
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('satellite')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                    mapLayerType === 'satellite'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Satelital
                </button>
              </div>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-[280px] sm:h-[340px] rounded-xl border-2 border-slate-300 dark:border-slate-700 relative overflow-hidden shadow-inner z-0"
            />
          </div>

          {/* Address, Coordinates and Perimeter Form Fields */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Domicilio Protegido de la Víctima:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                    placeholder="Ej. San Martín 450 o Barrio Quinto Cuartel"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  {isReverseGeocoding && (
                    <div className="absolute right-2.5 top-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ciudad / Localidad:
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Victoria"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Radio de Exclusión (Perímetro):
                </label>
                <select
                  value={radioMetros}
                  onChange={(e) => setRadioMetros(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-semibold"
                >
                  <option value={100}>100 metros</option>
                  <option value={200}>200 metros (Estándar)</option>
                  <option value={300}>300 metros</option>
                  <option value={500}>500 metros</option>
                  <option value={1000}>1000 metros (1 km)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Coordenada Latitud:
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLat(val);
                    if (!isNaN(val)) moveMarkerTo(val, lng, 16);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Coordenada Longitud:
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLng(val);
                    if (!isNaN(val)) moveMarkerTo(lat, val, 16);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

            </div>

            {/* Verification Link on Google Maps */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Punto fijado: <strong className="font-mono text-slate-700 dark:text-slate-200">{lat.toFixed(6)}, {lng.toFixed(6)}</strong>
              </span>

              <a
                href={getGoogleMapsPlaceUrl(lat, lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
              >
                <span>Verificar punto en Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Nueva Ubicación</span>
          </button>
        </div>

      </div>
    </div>
  );
};
