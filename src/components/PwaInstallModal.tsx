import React from 'react';
import {
  X,
  Download,
  CheckCircle2,
  Smartphone,
  Laptop,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  WifiOff
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => void;
  canPrompt: boolean;
  isInstalled: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall,
  canPrompt,
  isInstalled,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-bold shrink-0">
            <Download className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Aplicación Web Descargable (PWA)
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
              Instalar Drive PDF Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acceso directo de escritorio y móvil, arranque instantáneo y visor offline.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
            <Zap className="w-5 h-5 text-amber-500 mb-1.5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Apertura Rápida</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Sin barras de navegador</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
            <WifiOff className="w-5 h-5 text-emerald-500 mb-1.5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Modo Offline</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Caché de documentos</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
            <ShieldCheck className="w-5 h-5 text-blue-500 mb-1.5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Seguridad Total</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Protección Sandbox</span>
          </div>
        </div>

        {/* Direct Install Action if Supported */}
        {canPrompt ? (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-center space-y-3">
            <p className="text-xs text-blue-900 dark:text-blue-200 font-medium">
              Tu navegador soporta la instalación directa en un solo clic:
            </p>
            <button
              onClick={() => {
                onTriggerInstall();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicación en este Dispositivo</span>
            </button>
          </div>
        ) : isInstalled ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>¡La aplicación ya está instalada y activa en este dispositivo!</span>
          </div>
        ) : (
          /* Manual Installation Instructions for Platforms */
          <div className="space-y-3 pt-1 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Instrucciones de descarga según tu dispositivo:
            </p>

            {/* Desktop Instructions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <Laptop className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  En Computadora (Chrome, Edge, Brave, Opera):
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Haz clic en el icono de instalación <Download className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> en la barra de direcciones superior del navegador o en Menú ⋮ &gt; "Instalar Drive PDF Explorer".
                </span>
              </div>
            </div>

            {/* Android Instructions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  En Android:
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Presiona el menú de tres puntos ⋮ en Chrome y selecciona <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar aplicación"</strong>.
                </span>
              </div>
            </div>

            {/* iOS / iPhone Instructions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <Share2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  En iPhone / iPad (Safari):
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Toca el botón Compartir <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> en la barra inferior de Safari y elige <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> <strong>"Añadir a pantalla de inicio"</strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
