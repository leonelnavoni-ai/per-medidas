import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Shield,
  Clock,
  Car,
  Footprints,
  FileText,
  AlertTriangle,
  X,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  Edit,
} from 'lucide-react';
import { JudicialMeasure } from '../types';
import { EditVictimLocationModal } from './EditVictimLocationModal';
import {
  resolveMeasureLocation,
  calculateDistanceKm,
  formatDistance,
  estimateTravelTime,
  getGoogleMapsDirUrl,
  getGoogleMapsPlaceUrl,
  GeoLocation,
} from '../utils/geoUtils';
import { getMeasureExpirationInfo } from '../utils/dateCalculations';

interface VictimLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  measure: JudicialMeasure;
  userLocation: GeoLocation | null;
  onOpenPoliceMemo?: (measure: JudicialMeasure) => void;
  onOpenMapTab?: (measure: JudicialMeasure) => void;
  onSaveLocation?: (
    measure: JudicialMeasure,
    updated: {
      domicilioVictima: string;
      ciudadVictima: string;
      latVictima: number;
      lngVictima: number;
      radioExclusionMetros: number;
    }
  ) => Promise<void> | void;
}

export const VictimLocationModal: React.FC<VictimLocationModalProps> = ({
  isOpen,
  onClose,
  measure,
  userLocation,
  onOpenPoliceMemo,
  onOpenMapTab,
  onSaveLocation,
}) => {
  const [currentMeasure, setCurrentMeasure] = useState<JudicialMeasure>(measure);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentMeasure(measure);
  }, [measure]);

  const loc = resolveMeasureLocation(currentMeasure);
  const exp = getMeasureExpirationInfo(currentMeasure.fechaHasta);

  // Distance from officer if location available
  const distanceKm = userLocation && loc.hasLocation
    ? calculateDistanceKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
    : null;

  const patrolTime = distanceKm !== null ? estimateTravelTime(distanceKm, 'patrol') : null;
  const walkTime = distanceKm !== null ? estimateTravelTime(distanceKm, 'walking') : null;

  const googleMapsNavUrl = loc.hasLocation
    ? getGoogleMapsDirUrl(loc.lat, loc.lng, userLocation?.lat, userLocation?.lng)
    : '';

  const handleCopyAddress = () => {
    if (!loc.hasLocation) return;
    const fullText = `${loc.direccion}, ${loc.ciudad}, Entre Ríos (Coordenadas: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🚨 *DATOS DE UBICACIÓN - MEDIDA JUDICIAL PER*
*Víctima:* ${measure.victima}
*Denunciado:* ${measure.victimario}
*Medida:* ${measure.tipoMedida} (Oficio N° ${measure.nroOficio})
*Juzgado:* ${measure.provenienteDe}
${loc.hasLocation ? `*Domicilio protegido:* ${loc.direccion}, ${loc.ciudad}\n*Radio de exclusión:* ${loc.radioMetros} metros` : '*Ubicación:* Sin ubicación cargada por el usuario'}
*Vigencia:* ${measure.fechaHasta || 'Duración de la causa'}
${distanceKm !== null ? `*Distancia estimada de patrulla:* ${formatDistance(distanceKm)} (~${patrolTime?.text})` : ''}

${loc.hasLocation ? `🗺️ *Ruta Google Maps GPS:*\n${googleMapsNavUrl}` : ''}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                  Ubicación de Víctima & Ruta Operativa
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Oficio N° {measure.nroOficio}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                {measure.victima}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Key Location Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Domicilio Protegido de la Víctima
                </span>
                {loc.hasLocation ? (
                  <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{loc.direccion}, {loc.ciudad}</span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Sin ubicación cargada por el usuario</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsEditLocationOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Cargar o modificar la ubicación exacta en Google Maps"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{loc.hasLocation ? 'Modificar Ubicación' : 'Cargar Ubicación en Google Maps'}</span>
                </button>

                {loc.hasLocation && (
                  <button
                    onClick={handleCopyAddress}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar domicilio completo y coordenadas al portapapeles"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar Domicilio'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Perímetro Cautelar</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  {loc.radioMetros} metros
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Estado Medida</span>
                <span className={`font-bold ${exp.isExpired ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {exp.badgeLabel}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Juzgado</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate block" title={measure.provenienteDe}>
                  {measure.provenienteDe}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Denunciado</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate block" title={measure.victimario}>
                  {measure.victimario}
                </span>
              </div>
            </div>
          </div>

          {/* Distance and Estimated ETA strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300">
                  Distancia a Víctima
                </span>
                <p className="text-lg font-black text-blue-950 dark:text-blue-100 font-mono">
                  {distanceKm !== null ? formatDistance(distanceKm) : 'GPS no activo'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                  En Móvil Policial
                </span>
                <p className="text-lg font-black text-emerald-950 dark:text-emerald-100 font-mono">
                  {patrolTime ? patrolTime.text : 'Calculando...'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">
                  A Pie / Caminando
                </span>
                <p className="text-lg font-black text-purple-950 dark:text-purple-100 font-mono">
                  {walkTime ? walkTime.text : 'Calculando...'}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Route Navigation Actions */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span>Acciones de Traslado y Navegación Operativa</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Turn-by-turn Navigation in Google Maps App */}
              {loc.hasLocation ? (
                <a
                  href={googleMapsNavUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-between shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Navigation className="w-4 h-4 text-white group-hover:animate-pulse" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm">Abrir Navegación Google Maps</span>
                      <span className="text-[10.5px] text-blue-100 font-normal">
                        Guía paso a paso en tiempo real GPS
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/80 shrink-0 ml-2" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditLocationOpen(true)}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-between shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-white/20">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm">Cargar Ubicación en Google Maps</span>
                      <span className="text-[10.5px] text-blue-100 font-normal">
                        Fijar punto en el mapa para habilitar navegación GPS
                      </span>
                    </div>
                  </div>
                  <Edit className="w-4 h-4 text-white/80 shrink-0 ml-2" />
                </button>
              )}

              {/* View in Map Tab */}
              {onOpenMapTab && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMapTab(measure);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm">Ver en Mapa Operativo</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal">
                        Visualizar en la pestaña de mapa general
                      </span>
                    </div>
                  </div>
                  <Compass className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>
              )}
            </div>

            {/* Quick Police Memo Trigger & WhatsApp Share */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              {onOpenPoliceMemo && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPoliceMemo(measure);
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generar Memo Policial de Comisión aquí</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Compartir Ubicación por WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Quick Notice about PER Protocols */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Protocolo de Aproximación:</strong> En medidas con prohibición de acercamiento y exclusión, verificar el perímetro de {loc.radioMetros} metros antes del descenso de la dotación y constatar la ausencia del denunciado para preservar la integridad psicofísica de la víctima.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Modal interactivo de Modificación de Ubicación en Google Maps */}
      {isEditLocationOpen && (
        <EditVictimLocationModal
          isOpen={isEditLocationOpen}
          onClose={() => setIsEditLocationOpen(false)}
          measure={currentMeasure}
          onSaveLocation={async (updated) => {
            const nextMeasure: JudicialMeasure = {
              ...currentMeasure,
              ...updated,
            };
            setCurrentMeasure(nextMeasure);
            if (onSaveLocation) {
              await onSaveLocation(currentMeasure, updated);
            }
          }}
        />
      )}
    </div>
  );
};
