import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Shield,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Eye,
  Info,
  Layers,
  Award
} from 'lucide-react';
import { PoliceLogo } from './PoliceLogo';

interface LogoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLogoApplied: boolean;
  onApplyLogo: (variant?: 'adapted' | 'original') => void;
  onRevertLogo: () => void;
  currentVariant?: 'adapted' | 'original';
}

export const LogoPreviewModal: React.FC<LogoPreviewModalProps> = ({
  isOpen,
  onClose,
  isLogoApplied,
  onApplyLogo,
  onRevertLogo,
  currentVariant = 'adapted',
}) => {
  const [selectedVariant, setSelectedVariant] = useState<'adapted' | 'original'>(currentVariant);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Adaptación del Logo</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Policía de Entre Ríos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Basado en el emblema oficial radiado de la Policía de Entre Ríos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {/* VARIANT SELECTOR */}
          <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">
                Selecciona la variante de leyenda en el arco dorado:
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Puedes elegir la versión adaptada para la Comisaría o el texto original de Jefatura.
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedVariant('adapted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedVariant === 'adapted'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                Comisaría del Menor (Adaptado)
              </button>
              <button
                type="button"
                onClick={() => setSelectedVariant('original')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedVariant === 'original'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                Jefatura de Policía (Original)
              </button>
            </div>
          </div>

          {/* COMPARATIVE HEADER DEMO */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Comparativa del Encabezado en Tiempo Real
            </h3>

            <div className="space-y-3">
              {/* Option A: Current Header */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    1. Encabezado Anterior (Ícono genérico de escudo)
                  </span>
                  {!isLogoApplied && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      En Uso Actual
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        Comisaría del Menor y Violencia Familiar
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        v1.0 PWA
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Registro de medidas de protección & visor seguro
                    </p>
                  </div>
                </div>
              </div>

              {/* Option B: Proposed Header with Adapted Police Crest */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border-2 border-amber-500/50 shadow-lg shadow-amber-950/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    2. Encabezado con el Emblema Adaptado ({selectedVariant === 'adapted' ? 'Comisaría' : 'Jefatura'})
                  </span>
                  {isLogoApplied ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Aplicado Actualmente
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Propuesta Lista para Aplicar
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3.5 p-2.5 bg-slate-900/90 rounded-xl border border-amber-500/30 shadow-inner">
                  {/* The Adapted Logo */}
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center filter drop-shadow-md">
                    <PoliceLogo className="w-12 h-12" variant={selectedVariant} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                        Comisaría del Menor y Violencia Familiar
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-300 border border-amber-500/40">
                        Policía de Entre Ríos
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Registro de medidas de protección & visor seguro
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DETAILED EMBLEM INSPECTION & HERALDRY */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500" />
              Detalle de Elementos Adaptados de la Imagen Oficial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* High-res centered preview of the logo */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner text-center">
                <PoliceLogo className="w-48 h-48 filter drop-shadow-2xl" variant={selectedVariant} />
                <span className="text-[11px] text-amber-400 mt-2 font-bold">
                  {selectedVariant === 'adapted'
                    ? 'Comisaría del Menor y Violencia Familiar'
                    : 'Jefatura de Policía - Entre Ríos'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SVG Vectorial Facetado 3D
                </span>
              </div>

              {/* Elements description matching per.png */}
              <div className="md:col-span-2 space-y-2.5 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Corona Radiada Facetada y Anillo Negro Dorado
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    Estructura radiada dorada facetada en 3D idéntica a la insignia de la Policía de Entre Ríos, con anillo exterior negro azabache y tipografía dorada en arco con esferas separadoras.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Celada Heráldica de Plata y Ramas de Hoja
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    Casco o celada de caballero en plata metálica con rejilla de visor y penacho sobre el escudo, flanqueado por ramas laterales de acanto plateado bajo la cinta celestial <em>"POLICÍA PROVINCIA ENTRE RÍOS"</em>.
                  </p>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Escudo Central: Sol de Mayo, Banda de Artigas y Gallo Guardián
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    Cuartel superior en verde sinople con el Sol de Mayo radiante, franja diagonal punzó (Banda Roja de Artigas) con cartela oval dorada y el gallo heráldico de la vigilancia y custodia.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {isLogoApplied ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ El logo adaptado se encuentra activo en el encabezado.
              </span>
            ) : (
              <span>
                Haz clic en <strong>"Aprobar y Aplicar"</strong> para plasmar esta adaptación en el encabezado.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isLogoApplied && (
              <button
                type="button"
                onClick={() => {
                  onRevertLogo();
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revertir a Genérico</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyLogo(selectedVariant);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprobar y Aplicar al Encabezado</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
